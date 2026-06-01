"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { canManageTeam } from "@/lib/auth/permissions"
import { createNotification } from "@/lib/notifications/create-notification"

/**
 * Server action to create a team invite for a player.
 */
export async function createTeamInvite(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    return redirect("/teams?teamError=discord-login-required")
  }

  const teamId = formData.get("team_id") as string
  const invitedPlayerId = formData.get("invited_player_id") as string
  const playerIdentifier = formData.get("player_identifier") as string

  if (!teamId || ((!playerIdentifier || playerIdentifier.trim().length === 0) && !invitedPlayerId)) {
    return redirect(`/teams/${teamId}?rosterError=invalid-player-name`)
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(`/teams/${teamId}?rosterError=admin-client-unavailable`)
  }

  // 1. Resolve current manager player
  const { data: managerPlayer } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("user_id", userProfile.auth_user_id)
    .limit(1)
    .maybeSingle()

  if (!managerPlayer) {
    return redirect(`/teams/${teamId}?rosterError=player-profile-not-found`)
  }

  // 2. Permission Check
  const isManager = await canManageTeam(teamId, managerPlayer.id)
  if (!isManager) {
    return redirect(`/teams/${teamId}?rosterError=permission-denied`)
  }

  // 3. Resolve target player
  let targetPlayer: any = null

  if (invitedPlayerId && invitedPlayerId.trim().length > 0) {
    const { data: p } = await supabaseAdmin
      .from("players")
      .select("id, status, display_name, owner_user_id")
      .eq("id", invitedPlayerId)
      .maybeSingle()
    targetPlayer = p
  }

  if (!targetPlayer && playerIdentifier && playerIdentifier.trim().length > 0) {
    const identifier = playerIdentifier.trim()
    
    // Search in players table (case-insensitive exact matches)
    const { data: matchedPlayers } = await supabaseAdmin
      .from("players")
      .select("id, status, display_name, owner_user_id")
      .or(`nickname.ilike.${identifier},display_name.ilike.${identifier}`)

    // Search in user_profiles by discord_username
    const { data: matchedProfiles } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .ilike("discord_username", identifier)

    let discordPlayers: any[] = []
    if (matchedProfiles && matchedProfiles.length > 0) {
      const profileIds = matchedProfiles.map((p) => p.id)
      const { data: dPlayers } = await supabaseAdmin
        .from("players")
        .select("id, status, display_name, owner_user_id")
        .in("owner_user_id", profileIds)
      discordPlayers = dPlayers ?? []
    }

    // Combine both results by id
    const allMatches: any[] = [...(matchedPlayers ?? [])]
    for (const dp of discordPlayers) {
      if (!allMatches.some((p) => p.id === dp.id)) {
        allMatches.push(dp)
      }
    }

    if (allMatches.length === 0) {
      return redirect(`/teams/${teamId}?rosterError=player-not-found`)
    }

    if (allMatches.length > 1) {
      return redirect(`/teams/${teamId}?rosterError=multiple-players-found`)
    }

    targetPlayer = allMatches[0]
  }

  if (!targetPlayer) {
    return redirect(`/teams/${teamId}?rosterError=player-not-found`)
  }

  // 4. Validate player approval status
  if (targetPlayer.status !== "approved") {
    return redirect(`/teams/${teamId}?rosterError=player-not-approved`)
  }

  // 5. Cannot invite self
  if (targetPlayer.id === managerPlayer.id) {
    return redirect(`/teams/${teamId}?rosterError=self-invite-blocked`)
  }

  // 6. Cannot invite if already in the team
  const { data: existingMember } = await supabaseAdmin
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", targetPlayer.id)
    .limit(1)
    .maybeSingle()

  if (existingMember) {
    return redirect(`/teams/${teamId}?rosterError=already-in-team`)
  }

  // 7. Cannot duplicate pending invite
  const { data: existingInvite } = await supabaseAdmin
    .from("team_invites")
    .select("id")
    .eq("team_id", teamId)
    .eq("invited_player_id", targetPlayer.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle()

  if (existingInvite) {
    return redirect(`/teams/${teamId}?rosterError=invite-already-pending`)
  }

  // 8. Create invite
  const { data: createdInvite, error: insertError } = await supabaseAdmin
    .from("team_invites")
    .insert({
      team_id: teamId,
      inviter_player_id: managerPlayer.id,
      invited_player_id: targetPlayer.id,
      invited_user_profile_id: targetPlayer.owner_user_id,
      status: "pending",
    })
    .select("id")
    .maybeSingle()

  if (insertError || !createdInvite) {
    console.error("Failed to insert team invite:", insertError)
    return redirect(`/teams/${teamId}?rosterError=mutation-failed`)
  }

  // 9. Fetch team details for notification message
  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle()

  const teamName = team?.name || "команду"

  // 10. Send notification (awaited to ensure reliable delivery)
  await createNotification({
    userProfileId: targetPlayer.owner_user_id,
    playerId: targetPlayer.id,
    teamId: teamId,
    type: "team_invite_received",
    title: "New Team Invite",
    message: `You have been invited to join team "${teamName}".`,
  })

  revalidatePath(`/teams/${teamId}`)
  return redirect(`/teams/${teamId}?rosterSuccess=invite-sent`)
}

/**
 * Server action to accept a team invite.
 */
export async function acceptTeamInvite(inviteId: string) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    return redirect("/#registration")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect("/account?inviteError=admin-client-unavailable")
  }

  // 1. Fetch and validate invite
  const { data: invite, error: fetchError } = await supabaseAdmin
    .from("team_invites")
    .select("*, teams(name)")
    .eq("id", inviteId)
    .maybeSingle()

  if (fetchError || !invite) {
    return redirect("/account?inviteError=invalid-invite")
  }

  if (invite.status !== "pending") {
    return redirect("/account?inviteError=invalid-invite")
  }

  // Verify the invite belongs to current user
  if (invite.invited_user_profile_id !== userProfile.id) {
    return redirect("/account?inviteError=unauthorized")
  }

  // 2. Fetch invitee player display name
  const { data: player } = await supabaseAdmin
    .from("players")
    .select("display_name")
    .eq("id", invite.invited_player_id)
    .maybeSingle()

  const playerName = player?.display_name || "Гравець"
  const teamName = invite.teams?.name || "команду"

  // 3. Atomically check and add to team_members
  const { error: insertError } = await supabaseAdmin
    .from("team_members")
    .insert({
      team_id: invite.team_id,
      player_id: invite.invited_player_id,
      role: "member",
    })

  if (insertError && insertError.code !== "23505") {
    console.error("Failed to insert member during invite acceptance:", insertError)
    return redirect("/account?inviteError=mutation-failed")
  }

  // 4. Update invite status to accepted
  const { error: updateError } = await supabaseAdmin
    .from("team_invites")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", inviteId)

  if (updateError) {
    console.error("Failed to update invite status:", updateError)
    return redirect("/account?inviteError=mutation-failed")
  }

  // 5. Send notification to the inviter if available
  if (invite.inviter_player_id) {
    const { data: inviterPlayer } = await supabaseAdmin
      .from("players")
      .select("owner_user_id")
      .eq("id", invite.inviter_player_id)
      .maybeSingle()

    if (inviterPlayer?.owner_user_id) {
      await createNotification({
        userProfileId: inviterPlayer.owner_user_id,
        playerId: invite.inviter_player_id,
        teamId: invite.team_id,
        type: "team_invite_accepted",
        title: "Invite Accepted",
        message: `Player "${playerName}" accepted your invite to join "${teamName}".`,
      })
    }
  }

  revalidatePath("/account")
  revalidatePath(`/teams/${invite.team_id}`)
  return redirect("/account?inviteSuccess=accepted")
}

/**
 * Server action to decline a team invite.
 */
export async function declineTeamInvite(inviteId: string) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    return redirect("/#registration")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect("/account?inviteError=admin-client-unavailable")
  }

  // 1. Fetch invite
  const { data: invite, error: fetchError } = await supabaseAdmin
    .from("team_invites")
    .select("*, teams(name)")
    .eq("id", inviteId)
    .maybeSingle()

  if (fetchError || !invite) {
    return redirect("/account?inviteError=invalid-invite")
  }

  if (invite.status !== "pending") {
    return redirect("/account?inviteError=invalid-invite")
  }

  // Verify the invite belongs to current user
  if (invite.invited_user_profile_id !== userProfile.id) {
    return redirect("/account?inviteError=unauthorized")
  }

  // 2. Fetch invitee player display name
  const { data: player } = await supabaseAdmin
    .from("players")
    .select("display_name")
    .eq("id", invite.invited_player_id)
    .maybeSingle()

  const playerName = player?.display_name || "Гравець"
  const teamName = invite.teams?.name || "команду"

  // 3. Update invite status to declined
  const { error: updateError } = await supabaseAdmin
    .from("team_invites")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", inviteId)

  if (updateError) {
    console.error("Failed to update invite status:", updateError)
    return redirect("/account?inviteError=mutation-failed")
  }

  // 4. Send notification to the inviter if available
  if (invite.inviter_player_id) {
    const { data: inviterPlayer } = await supabaseAdmin
      .from("players")
      .select("owner_user_id")
      .eq("id", invite.inviter_player_id)
      .maybeSingle()

    if (inviterPlayer?.owner_user_id) {
      await createNotification({
        userProfileId: inviterPlayer.owner_user_id,
        playerId: invite.inviter_player_id,
        teamId: invite.team_id,
        type: "team_invite_declined",
        title: "Invite Declined",
        message: `Player "${playerName}" declined your invite to join "${teamName}".`,
      })
    }
  }

  revalidatePath("/account")
  return redirect("/account?inviteSuccess=declined")
}

/**
 * Server action to cancel a team invite.
 */
export async function cancelTeamInvite(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    return redirect("/teams?teamError=discord-login-required")
  }

  const inviteId = formData.get("invite_id") as string
  const teamId = formData.get("team_id") as string

  if (!inviteId || !teamId) {
    return redirect("/teams?teamError=invalid-inputs")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(`/teams/${teamId}?rosterError=admin-client-unavailable`)
  }

  // 1. Resolve manager player
  const { data: managerPlayer } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("user_id", userProfile.auth_user_id)
    .limit(1)
    .maybeSingle()

  if (!managerPlayer) {
    return redirect(`/teams/${teamId}?rosterError=player-profile-not-found`)
  }

  // 2. Permission Check
  const isManager = await canManageTeam(teamId, managerPlayer.id)
  if (!isManager) {
    return redirect(`/teams/${teamId}?rosterError=permission-denied`)
  }

  // 3. Fetch and validate invite
  const { data: invite, error: fetchError } = await supabaseAdmin
    .from("team_invites")
    .select("*, teams(name)")
    .eq("id", inviteId)
    .maybeSingle()

  if (fetchError || !invite) {
    return redirect(`/teams/${teamId}?rosterError=invalid-invite`)
  }

  if (invite.status !== "pending") {
    return redirect(`/teams/${teamId}?rosterError=invalid-invite`)
  }

  // Double check team ownership
  if (invite.team_id !== teamId) {
    return redirect(`/teams/${teamId}?rosterError=permission-denied`)
  }

  const teamName = invite.teams?.name || "команду"

  // 4. Update status to cancelled
  const { error: updateError } = await supabaseAdmin
    .from("team_invites")
    .update({
      status: "cancelled",
      responded_at: new Date().toISOString(),
    })
    .eq("id", inviteId)

  if (updateError) {
    console.error("Failed to cancel team invite:", updateError)
    return redirect(`/teams/${teamId}?rosterError=mutation-failed`)
  }

  // 5. Send notification to the invited player
  await createNotification({
    userProfileId: invite.invited_user_profile_id,
    playerId: invite.invited_player_id,
    teamId: teamId,
    type: "team_invite_cancelled",
    title: "Invite Cancelled",
    message: `Your invite to join team "${teamName}" has been cancelled.`,
  })

  revalidatePath(`/teams/${teamId}`)
  return redirect(`/teams/${teamId}?rosterSuccess=invite-cancelled`)
}
