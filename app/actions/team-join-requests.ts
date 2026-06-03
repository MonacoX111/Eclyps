"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { canManageTeam } from "@/lib/auth/permissions"
import { getCurrentUserProfile, type UserProfile } from "@/lib/auth/user-profile"
import { createNotification } from "@/lib/notifications/create-notification"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>

type PlayerIdentity = {
  id: string
  owner_user_id: string | null
  display_name: string | null
  nickname: string | null
  name: string | null
  status?: string | null
}

function playerDisplayName(player: Pick<PlayerIdentity, "display_name" | "nickname" | "name"> | null | undefined) {
  return player?.display_name?.trim() || player?.nickname?.trim() || player?.name?.trim() || "Player"
}

function teamRedirect(teamId: string | null | undefined, key: "joinRequestError" | "joinRequestSuccess", value: string) {
  if (!teamId) return `/teams?${key}=${value}`
  return `/teams/${teamId}?${key}=${value}`
}

function accountRedirect(key: "joinRequestError" | "joinRequestSuccess", value: string) {
  return `/account?${key}=${value}`
}

function destinationFor(formData: FormData, teamId: string | null | undefined, key: "joinRequestError" | "joinRequestSuccess", value: string) {
  const redirectTo = (formData.get("redirect_to") as string | null) || ""
  if (redirectTo.startsWith("/account")) {
    return accountRedirect(key, value)
  }
  return teamRedirect(teamId, key, value)
}

async function resolveApprovedCurrentPlayer(
  supabaseAdmin: SupabaseAdminClient,
  userProfile: UserProfile,
): Promise<PlayerIdentity | null> {
  const { data } = await supabaseAdmin
    .from("players")
    .select("id, owner_user_id, display_name, nickname, name, status")
    .or(`owner_user_id.eq.${userProfile.id},user_id.eq.${userProfile.auth_user_id}`)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle()

  return data as PlayerIdentity | null
}

async function isRosterLocked(supabaseAdmin: SupabaseAdminClient, teamId: string) {
  const { data: regs } = await supabaseAdmin
    .from("tournament_registrations")
    .select("tournament_id")
    .or(`team_id.eq.${teamId},source_team_id.eq.${teamId}`)
    .in("status", ["pending", "approved"])

  if (!regs || regs.length === 0) return false

  const tournamentIds = Array.from(new Set(regs.map((r: any) => r.tournament_id).filter(Boolean)))
  if (tournamentIds.length === 0) return false

  const { data: activeTournaments } = await supabaseAdmin
    .from("tournaments")
    .select("id")
    .in("id", tournamentIds)
    .in("status", ["upcoming", "live"])

  return Boolean(activeTournaments && activeTournaments.length > 0)
}

async function getTeamManagerProfiles(supabaseAdmin: SupabaseAdminClient, teamId: string) {
  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("owner_user_id, owner_player_id")
    .eq("id", teamId)
    .maybeSingle()

  const managerProfileIds = new Set<string>()
  const managerPlayerIds = new Set<string>()

  if (team?.owner_user_id) managerProfileIds.add(team.owner_user_id)
  if (team?.owner_player_id) managerPlayerIds.add(team.owner_player_id)

  const { data: captains } = await supabaseAdmin
    .from("team_members")
    .select("player_id, players(owner_user_id)")
    .eq("team_id", teamId)
    .eq("role", "captain")

  for (const captain of captains ?? []) {
    if (captain.player_id) managerPlayerIds.add(captain.player_id)
    const player = captain.players as { owner_user_id?: string | null } | null
    if (player?.owner_user_id) managerProfileIds.add(player.owner_user_id)
  }

  if (managerPlayerIds.size > 0) {
    const { data: players } = await supabaseAdmin
      .from("players")
      .select("id, owner_user_id")
      .in("id", Array.from(managerPlayerIds))

    for (const player of players ?? []) {
      if (player.owner_user_id) managerProfileIds.add(player.owner_user_id)
    }
  }

  return Array.from(managerProfileIds)
}

async function notifyManagers(
  supabaseAdmin: SupabaseAdminClient,
  teamId: string,
  payload: {
    requesterPlayerId: string
    requesterUserProfileId: string
    requesterName: string
    teamName: string
    type: string
    title: string
    message: string
  },
) {
  const managerProfileIds = await getTeamManagerProfiles(supabaseAdmin, teamId)
  const targets = managerProfileIds.filter((id) => id !== payload.requesterUserProfileId)

  await Promise.allSettled(
    targets.map((userProfileId) =>
      createNotification({
        userProfileId,
        playerId: payload.requesterPlayerId,
        teamId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
      }),
    ),
  )
}

export async function createTeamJoinRequest(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  const teamId = formData.get("team_id") as string

  if (!userProfile) {
    return redirect(teamRedirect(teamId, "joinRequestError", "login-required"))
  }

  if (!teamId) {
    return redirect(teamRedirect(teamId, "joinRequestError", "missing-id"))
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(teamRedirect(teamId, "joinRequestError", "admin-client-unavailable"))
  }

  const requesterPlayer = await resolveApprovedCurrentPlayer(supabaseAdmin, userProfile)
  if (!requesterPlayer) {
    return redirect(teamRedirect(teamId, "joinRequestError", "player-not-approved"))
  }

  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("id, name, status")
    .eq("id", teamId)
    .maybeSingle()

  if (!team || team.status !== "approved") {
    return redirect(teamRedirect(teamId, "joinRequestError", "team-not-approved"))
  }

  const { data: existingMember } = await supabaseAdmin
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", requesterPlayer.id)
    .limit(1)
    .maybeSingle()

  if (existingMember) {
    return redirect(teamRedirect(teamId, "joinRequestError", "already-in-team"))
  }

  const { data: existingRequest } = await supabaseAdmin
    .from("team_join_requests")
    .select("id")
    .eq("team_id", teamId)
    .eq("requester_player_id", requesterPlayer.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle()

  if (existingRequest) {
    return redirect(teamRedirect(teamId, "joinRequestError", "request-already-pending"))
  }

  const message = ((formData.get("message") as string | null) || "").trim()
  const { error: insertError } = await supabaseAdmin
    .from("team_join_requests")
    .insert({
      team_id: teamId,
      requester_player_id: requesterPlayer.id,
      requester_user_profile_id: userProfile.id,
      status: "pending",
      message: message || null,
    })

  if (insertError) {
    console.error("Failed to create team join request:", insertError)
    return redirect(teamRedirect(teamId, "joinRequestError", "mutation-failed"))
  }

  const requesterName = playerDisplayName(requesterPlayer)
  await notifyManagers(supabaseAdmin, teamId, {
    requesterPlayerId: requesterPlayer.id,
    requesterUserProfileId: userProfile.id,
    requesterName,
    teamName: team.name,
    type: "team_join_request_received",
    title: "New Team Join Request",
    message: `Player "${requesterName}" requested to join team "${team.name}".`,
  })

  revalidatePath(`/teams/${teamId}`)
  revalidatePath("/account")
  return redirect(teamRedirect(teamId, "joinRequestSuccess", "sent"))
}

export async function approveTeamJoinRequest(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  const requestId = formData.get("request_id") as string
  const teamId = formData.get("team_id") as string

  if (!userProfile) {
    return redirect(teamRedirect(teamId, "joinRequestError", "login-required"))
  }

  if (!requestId || !teamId) {
    return redirect(teamRedirect(teamId, "joinRequestError", "missing-id"))
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(teamRedirect(teamId, "joinRequestError", "admin-client-unavailable"))
  }

  const managerPlayer = await resolveApprovedCurrentPlayer(supabaseAdmin, userProfile)
  if (!managerPlayer) {
    return redirect(teamRedirect(teamId, "joinRequestError", "player-not-approved"))
  }

  const isManager = await canManageTeam(teamId, managerPlayer.id)
  if (!isManager) {
    return redirect(teamRedirect(teamId, "joinRequestError", "permission-denied"))
  }

  if (await isRosterLocked(supabaseAdmin, teamId)) {
    return redirect(teamRedirect(teamId, "joinRequestError", "roster-locked"))
  }

  const { data: joinRequest } = await supabaseAdmin
    .from("team_join_requests")
    .select("*, teams(name), players!team_join_requests_requester_player_id_fkey(id, status, display_name, nickname, name, owner_user_id)")
    .eq("id", requestId)
    .eq("team_id", teamId)
    .maybeSingle()

  if (!joinRequest || joinRequest.status !== "pending") {
    return redirect(teamRedirect(teamId, "joinRequestError", "invalid-request"))
  }

  const requesterPlayer = joinRequest.players as PlayerIdentity | null
  if (!requesterPlayer || requesterPlayer.status !== "approved") {
    return redirect(teamRedirect(teamId, "joinRequestError", "player-not-approved"))
  }

  const { data: existingMember } = await supabaseAdmin
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", joinRequest.requester_player_id)
    .limit(1)
    .maybeSingle()

  if (!existingMember) {
    const { error: insertError } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: teamId,
        player_id: joinRequest.requester_player_id,
        role: "member",
      })

    if (insertError && insertError.code !== "23505") {
      console.error("Failed to add join requester to team:", insertError)
      return redirect(teamRedirect(teamId, "joinRequestError", "mutation-failed"))
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("team_join_requests")
    .update({
      status: "approved",
      responded_at: new Date().toISOString(),
      reviewed_by_player_id: managerPlayer.id,
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (updateError) {
    console.error("Failed to approve join request:", updateError)
    return redirect(teamRedirect(teamId, "joinRequestError", "mutation-failed"))
  }

  const teamName = joinRequest.teams?.name || "team"
  await Promise.allSettled([
    createNotification({
      userProfileId: joinRequest.requester_user_profile_id,
      playerId: joinRequest.requester_player_id,
      teamId,
      type: "team_join_request_approved",
      title: "Join Request Approved",
      message: `Your request to join team "${teamName}" was approved.`,
    }),
  ])

  revalidatePath(`/teams/${teamId}`)
  revalidatePath("/account")
  return redirect(teamRedirect(teamId, "joinRequestSuccess", "approved"))
}

export async function rejectTeamJoinRequest(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  const requestId = formData.get("request_id") as string
  const teamId = formData.get("team_id") as string

  if (!userProfile) {
    return redirect(teamRedirect(teamId, "joinRequestError", "login-required"))
  }

  if (!requestId || !teamId) {
    return redirect(teamRedirect(teamId, "joinRequestError", "missing-id"))
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(teamRedirect(teamId, "joinRequestError", "admin-client-unavailable"))
  }

  const managerPlayer = await resolveApprovedCurrentPlayer(supabaseAdmin, userProfile)
  if (!managerPlayer) {
    return redirect(teamRedirect(teamId, "joinRequestError", "player-not-approved"))
  }

  const isManager = await canManageTeam(teamId, managerPlayer.id)
  if (!isManager) {
    return redirect(teamRedirect(teamId, "joinRequestError", "permission-denied"))
  }

  const { data: joinRequest } = await supabaseAdmin
    .from("team_join_requests")
    .select("*, teams(name)")
    .eq("id", requestId)
    .eq("team_id", teamId)
    .maybeSingle()

  if (!joinRequest || joinRequest.status !== "pending") {
    return redirect(teamRedirect(teamId, "joinRequestError", "invalid-request"))
  }

  const { error: updateError } = await supabaseAdmin
    .from("team_join_requests")
    .update({
      status: "rejected",
      responded_at: new Date().toISOString(),
      reviewed_by_player_id: managerPlayer.id,
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (updateError) {
    console.error("Failed to reject join request:", updateError)
    return redirect(teamRedirect(teamId, "joinRequestError", "mutation-failed"))
  }

  const teamName = joinRequest.teams?.name || "team"
  await Promise.allSettled([
    createNotification({
      userProfileId: joinRequest.requester_user_profile_id,
      playerId: joinRequest.requester_player_id,
      teamId,
      type: "team_join_request_rejected",
      title: "Join Request Rejected",
      message: `Your request to join team "${teamName}" was rejected.`,
    }),
  ])

  revalidatePath(`/teams/${teamId}`)
  revalidatePath("/account")
  return redirect(teamRedirect(teamId, "joinRequestSuccess", "rejected"))
}

export async function cancelTeamJoinRequest(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  const requestId = formData.get("request_id") as string
  const teamId = formData.get("team_id") as string

  if (!userProfile) {
    return redirect(destinationFor(formData, teamId, "joinRequestError", "login-required"))
  }

  if (!requestId || !teamId) {
    return redirect(destinationFor(formData, teamId, "joinRequestError", "missing-id"))
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(destinationFor(formData, teamId, "joinRequestError", "admin-client-unavailable"))
  }

  const { data: joinRequest } = await supabaseAdmin
    .from("team_join_requests")
    .select("*, teams(name), players!team_join_requests_requester_player_id_fkey(display_name, nickname, name)")
    .eq("id", requestId)
    .eq("team_id", teamId)
    .maybeSingle()

  if (!joinRequest || joinRequest.status !== "pending") {
    return redirect(destinationFor(formData, teamId, "joinRequestError", "invalid-request"))
  }

  if (joinRequest.requester_user_profile_id !== userProfile.id) {
    return redirect(destinationFor(formData, teamId, "joinRequestError", "permission-denied"))
  }

  const { error: updateError } = await supabaseAdmin
    .from("team_join_requests")
    .update({
      status: "cancelled",
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (updateError) {
    console.error("Failed to cancel join request:", updateError)
    return redirect(destinationFor(formData, teamId, "joinRequestError", "mutation-failed"))
  }

  const requesterPlayer = joinRequest.players as PlayerIdentity | null
  const requesterName = playerDisplayName(requesterPlayer)
  const teamName = joinRequest.teams?.name || "team"
  await notifyManagers(supabaseAdmin, teamId, {
    requesterPlayerId: joinRequest.requester_player_id,
    requesterUserProfileId: userProfile.id,
    requesterName,
    teamName,
    type: "team_join_request_cancelled",
    title: "Join Request Cancelled",
    message: `Player "${requesterName}" cancelled the request to join team "${teamName}".`,
  })

  revalidatePath(`/teams/${teamId}`)
  revalidatePath("/account")
  return redirect(destinationFor(formData, teamId, "joinRequestSuccess", "cancelled"))
}
