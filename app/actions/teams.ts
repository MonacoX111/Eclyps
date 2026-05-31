"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { generateTeamSlug } from "@/lib/teams/slug"
import { canManageTeam } from "@/lib/auth/permissions"

/**
 * Server action to create a persistent global team.
 * Only verified/approved global players can create teams.
 */
export async function createGlobalTeam(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    redirect("/teams?teamError=discord-login-required")
  }

  const name = formData.get("name") as string
  const logoUrl = formData.get("logo_url") as string

  if (!name || name.trim().length < 2 || name.trim().length > 50) {
    redirect("/teams?teamError=invalid-team-name")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/teams?teamError=admin-client-unavailable")
  }

  // 1. Resolve approved global player profiles for the user
  const { data: playerRows, error: playerError } = await supabaseAdmin
    .from("players")
    .select("id, status")
    .or(`user_id.eq.${userProfile.auth_user_id},owner_user_id.eq.${userProfile.id}`)

  const linkedPlayers = playerRows ?? []
  const player = linkedPlayers.find((row) => row.status === "approved") ?? linkedPlayers[0]
  const linkedPlayerIds = Array.from(new Set(linkedPlayers.map((row) => row.id).filter(Boolean)))

  if (playerError || !player || linkedPlayerIds.length === 0) {
    redirect("/teams?teamError=player-profile-not-found")
  }

  if (player.status !== "approved") {
    redirect("/teams?teamError=player-approval-required")
  }

  const { data: managedOwnedTeams, error: managedOwnedError } = await supabaseAdmin
    .from("teams")
    .select("id, status")
    .in("owner_player_id", linkedPlayerIds)

  if (managedOwnedError) {
    redirect("/teams?teamError=mutation-failed")
  }

  const ownsActiveTeam = (managedOwnedTeams ?? []).some((team) => team.status !== "archived")

  const { data: managedCaptainMemberships, error: managedCaptainError } = await supabaseAdmin
    .from("team_members")
    .select("team_id, teams:teams(id, status)")
    .in("player_id", linkedPlayerIds)
    .eq("role", "captain")

  if (managedCaptainError) {
    redirect("/teams?teamError=mutation-failed")
  }

  const captainsActiveTeam = (managedCaptainMemberships ?? []).some((membership) => {
    const team = membership.teams as { status?: string | null } | null
    return Boolean(team) && team?.status !== "archived"
  })

  if (ownsActiveTeam || captainsActiveTeam) {
    redirect("/teams?teamError=already-manages-team")
  }

  const slug = generateTeamSlug(name)

  // 2. Prevent duplicate slugs (uniqueness check)
  const { data: existingTeamBySlug, error: slugCheckError } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle()

  if (slugCheckError) {
    redirect("/teams?teamError=mutation-failed")
  }

  if (existingTeamBySlug) {
    redirect("/teams?teamError=duplicate-team-slug")
  }

  // 3. Prevent rapid submit duplicates (ownership check for same name)
  const { data: existingOwnedTeam, error: ownCheckError } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("owner_player_id", player.id)
    .eq("name", name.trim())
    .limit(1)
    .maybeSingle()

  if (ownCheckError) {
    redirect("/teams?teamError=mutation-failed")
  }

  if (existingOwnedTeam) {
    redirect("/teams?teamError=duplicate-team-ownership")
  }

  // 4. Insert global team in teams table
  const { data: createdTeam, error: insertError } = await supabaseAdmin
    .from("teams")
    .insert({
      name: name.trim(),
      slug,
      logo_url: logoUrl?.trim() || null,
      owner_player_id: player.id,
      owner_user_id: userProfile.id,
      captain_user_id: userProfile.id,
      status: "pending",
      tournament_id: null,
      wins: 0,
      losses: 0,
    })
    .select("id")
    .maybeSingle()

  if (insertError || !createdTeam) {
    console.error("Failed to insert global team:", insertError)
    redirect("/teams?teamError=mutation-failed")
  }

  // 5. Create captain entry inside team_members
  const { error: memberError } = await supabaseAdmin
    .from("team_members")
    .insert({
      team_id: createdTeam.id,
      player_id: player.id,
      role: "captain",
    })

  if (memberError) {
    console.error("Failed to insert captain member entry:", memberError)
    await supabaseAdmin.from("teams").delete().eq("id", createdTeam.id)
    redirect("/teams?teamError=mutation-failed")
  }

  revalidatePath("/teams")
  revalidatePath("/tournament")
  revalidatePath("/")
  redirect("/teams?teamSuccess=created")
}

/**
 * Server action to add a global player to a team's roster.
 */
export async function addTeamMember(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    return redirect("/teams?teamError=discord-login-required")
  }

  const teamId = formData.get("team_id") as string
  const playerIdentifier = formData.get("player_identifier") as string

  if (!teamId || !playerIdentifier || playerIdentifier.trim().length === 0) {
    return redirect(`/teams/${teamId}?rosterError=invalid-player-name`)
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(`/teams/${teamId}?rosterError=admin-client-unavailable`)
  }

  // 1. Resolve managing player profile
  const { data: managerPlayer } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("user_id", userProfile.auth_user_id)
    .limit(1)
    .maybeSingle()

  if (!managerPlayer) {
    return redirect(`/teams/${teamId}?rosterError=player-profile-not-found`)
  }

  // 2. Permission check
  const isManager = await canManageTeam(teamId, managerPlayer.id)
  if (!isManager) {
    return redirect(`/teams/${teamId}?rosterError=permission-denied`)
  }

  // 3. Resolve target player to add (search by nickname or display name)
  const identifier = playerIdentifier.trim()
  const { data: targetPlayer, error: targetError } = await supabaseAdmin
    .from("players")
    .select("id, status, display_name")
    .or(`nickname.ilike.${identifier},display_name.ilike.${identifier}`)
    .limit(1)
    .maybeSingle()

  if (targetError || !targetPlayer) {
    return redirect(`/teams/${teamId}?rosterError=player-not-found`)
  }

  // Only approved players can be added
  if (targetPlayer.status !== "approved") {
    return redirect(`/teams/${teamId}?rosterError=player-not-approved`)
  }

  // 4. Try to add target player to team_members
  const { error: insertError } = await supabaseAdmin
    .from("team_members")
    .insert({
      team_id: teamId,
      player_id: targetPlayer.id,
      role: "member",
    })

  if (insertError) {
    if (insertError.code === "23505") {
      // duplicate constraint handled gracefully
      return redirect(`/teams/${teamId}?rosterError=duplicate-member`)
    }
    console.error("Failed to add team member:", insertError)
    return redirect(`/teams/${teamId}?rosterError=mutation-failed`)
  }

  revalidatePath(`/teams/${teamId}`)
  return redirect(`/teams/${teamId}?rosterSuccess=added`)
}

/**
 * Server action to remove a player from a team's roster.
 */
export async function removeTeamMember(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    return redirect("/teams?teamError=discord-login-required")
  }

  const teamId = formData.get("team_id") as string
  const memberPlayerId = formData.get("player_id") as string

  if (!teamId || !memberPlayerId) {
    return redirect(`/teams/${teamId}?rosterError=missing-id`)
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(`/teams/${teamId}?rosterError=admin-client-unavailable`)
  }

  // 1. Resolve managing player
  const { data: managerPlayer } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("user_id", userProfile.auth_user_id)
    .limit(1)
    .maybeSingle()

  if (!managerPlayer) {
    return redirect(`/teams/${teamId}?rosterError=player-profile-not-found`)
  }

  // 2. Permission check
  const isManager = await canManageTeam(teamId, managerPlayer.id)
  if (!isManager) {
    return redirect(`/teams/${teamId}?rosterError=permission-denied`)
  }

  // 3. Resolve target team details
  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("id, owner_player_id")
    .eq("id", teamId)
    .maybeSingle()

  if (!team) {
    return redirect(`/teams/${teamId}?rosterError=team-not-found`)
  }

  // Owner_player_id must remain protected
  if (team.owner_player_id === memberPlayerId) {
    return redirect(`/teams/${teamId}?rosterError=remove-owner-blocked`)
  }

  // Captain protection: cannot remove the last captain/owner
  const { data: members } = await supabaseAdmin
    .from("team_members")
    .select("player_id, role")
    .eq("team_id", teamId)

  const targetMember = members?.find((m) => m.player_id === memberPlayerId)
  if (targetMember?.role === "captain") {
    const captainsCount = members?.filter((m) => m.role === "captain").length ?? 0
    if (captainsCount <= 1) {
      return redirect(`/teams/${teamId}?rosterError=last-captain-blocked`)
    }
  }

  // 4. Remove player from team_members
  const { error: deleteError } = await supabaseAdmin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("player_id", memberPlayerId)

  if (deleteError) {
    console.error("Failed to remove member:", deleteError)
    return redirect(`/teams/${teamId}?rosterError=mutation-failed`)
  }

  revalidatePath(`/teams/${teamId}`)
  return redirect(`/teams/${teamId}?rosterSuccess=removed`)
}

/**
 * Server action to update a team member's role (captain/member).
 */
export async function updateTeamMemberRole(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    return redirect("/teams?teamError=discord-login-required")
  }

  const teamId = formData.get("team_id") as string
  const memberPlayerId = formData.get("player_id") as string
  const role = formData.get("role") as string

  if (!teamId || !memberPlayerId || (role !== "captain" && role !== "member")) {
    return redirect(`/teams/${teamId}?rosterError=invalid-inputs`)
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return redirect(`/teams/${teamId}?rosterError=admin-client-unavailable`)
  }

  // 1. Resolve managing player
  const { data: managerPlayer } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("user_id", userProfile.auth_user_id)
    .limit(1)
    .maybeSingle()

  if (!managerPlayer) {
    return redirect(`/teams/${teamId}?rosterError=player-profile-not-found`)
  }

  // 2. Permission check
  const isManager = await canManageTeam(teamId, managerPlayer.id)
  if (!isManager) {
    return redirect(`/teams/${teamId}?rosterError=permission-denied`)
  }

  // 3. Resolve target team
  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("id, owner_player_id")
    .eq("id", teamId)
    .maybeSingle()

  if (!team) {
    return redirect(`/teams/${teamId}?rosterError=team-not-found`)
  }

  // Owner's role cannot be downgraded from captain
  if (team.owner_player_id === memberPlayerId && role === "member") {
    return redirect(`/teams/${teamId}?rosterError=owner-downgrade-blocked`)
  }

  // Captain protection: cannot demote the last captain
  if (role === "member") {
    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("player_id, role")
      .eq("team_id", teamId)

    const targetMember = members?.find((m) => m.player_id === memberPlayerId)
    if (targetMember?.role === "captain") {
      const captainsCount = members?.filter((m) => m.role === "captain").length ?? 0
      if (captainsCount <= 1) {
        return redirect(`/teams/${teamId}?rosterError=last-captain-blocked`)
      }
    }
  }

  // 4. Update role
  const { error: updateError } = await supabaseAdmin
    .from("team_members")
    .update({ role })
    .eq("team_id", teamId)
    .eq("player_id", memberPlayerId)

  if (updateError) {
    console.error("Failed to update role:", updateError)
    return redirect(`/teams/${teamId}?rosterError=mutation-failed`)
  }

  revalidatePath(`/teams/${teamId}`)
  return redirect(`/teams/${teamId}?rosterSuccess=role-updated`)
}
