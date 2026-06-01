import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * Checks if a player is the owner of a team.
 */
export async function isTeamOwner(
  playerId: string,
  teamId: string,
): Promise<boolean> {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    console.error("Supabase admin client not available for owner check.")
    return false
  }

  try {
    const { data: team, error } = await supabaseAdmin
      .from("teams")
      .select("owner_player_id")
      .eq("id", teamId)
      .maybeSingle()

    if (error) {
      console.error("Failed to check owner in permissions helper:", error)
      return false
    }

    return team?.owner_player_id === playerId
  } catch (error) {
    console.error("Unexpected error in isTeamOwner helper:", error)
    return false
  }
}

/**
 * Checks if a player is a captain of a team.
 */
export async function isTeamCaptain(
  playerId: string,
  teamId: string,
): Promise<boolean> {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    console.error("Supabase admin client not available for captain check.")
    return false
  }

  try {
    const { data: member, error } = await supabaseAdmin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("player_id", playerId)
      .maybeSingle()

    if (error) {
      console.error("Failed to check captain in permissions helper:", error)
      return false
    }

    return member?.role === "captain"
  } catch (error) {
    console.error("Unexpected error in isTeamCaptain helper:", error)
    return false
  }
}

/**
 * Checks if a player can manage a team (i.e. is the owner or a captain).
 * @param teamId The global team ID.
 * @param currentPlayerId The global player ID.
 */
export async function canManageTeam(
  teamId: string,
  currentPlayerId: string,
): Promise<boolean> {
  const isOwner = await isTeamOwner(currentPlayerId, teamId)
  if (isOwner) return true

  const isCaptain = await isTeamCaptain(currentPlayerId, teamId)
  return isCaptain
}

/**
 * Checks if a player can manage team roster.
 */
export async function canManageRoster(
  playerId: string,
  teamId: string,
): Promise<boolean> {
  return canManageTeam(teamId, playerId)
}

/**
 * Checks if a player can invite players.
 */
export async function canInvitePlayers(
  playerId: string,
  teamId: string,
): Promise<boolean> {
  return canManageTeam(teamId, playerId)
}

/**
 * Checks if a manager can remove a target member.
 * Owner can remove anyone except themselves as owner.
 * Captain can remove members and substitutes, but cannot remove the owner or other captains.
 */
export async function canRemoveMembers(
  managerId: string,
  targetId: string,
  teamId: string,
): Promise<boolean> {
  // Owner cannot be removed
  const isTargetOwner = await isTeamOwner(targetId, teamId)
  if (isTargetOwner) return false

  const isManagerOwner = await isTeamOwner(managerId, teamId)
  if (isManagerOwner) return true

  const isManagerCaptain = await isTeamCaptain(managerId, teamId)
  if (!isManagerCaptain) return false

  // Captain cannot remove another captain
  const isTargetCaptain = await isTeamCaptain(targetId, teamId)
  if (isTargetCaptain) return false

  // Captain can remove members and substitutes
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return false

  const { data: targetMember } = await supabaseAdmin
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("player_id", targetId)
    .maybeSingle()

  if (!targetMember) return false
  return targetMember.role === "member" || targetMember.role === "substitute"
}

/**
 * Checks if a manager can change a target member's role.
 * Owner can change any member's role (promote to captain, demote captain, switch member <-> substitute).
 * Captain can only switch roles between 'member' and 'substitute' for players who are not captains or owners.
 * Captains cannot demote other captains, change owner roles, or promote anyone to captain.
 */
export async function canChangeRoles(
  managerId: string,
  targetId: string,
  newRole: string,
  teamId: string,
): Promise<boolean> {
  // Validate role strings
  if (newRole !== "captain" && newRole !== "member" && newRole !== "substitute") {
    return false
  }

  // Owner's role cannot be modified by anyone
  const isTargetOwner = await isTeamOwner(targetId, teamId)
  if (isTargetOwner) return false

  const isManagerOwner = await isTeamOwner(managerId, teamId)
  if (isManagerOwner) {
    // Owner can perform any valid role transition on non-owners
    return true
  }

  const isManagerCaptain = await isTeamCaptain(managerId, teamId)
  if (!isManagerCaptain) return false

  // Captain cannot promote anyone to captain or demote a captain
  if (newRole === "captain") return false

  const isTargetCaptain = await isTeamCaptain(targetId, teamId)
  if (isTargetCaptain) return false

  // Captain can only switch roles between 'member' and 'substitute'
  if (newRole !== "member" && newRole !== "substitute") return false

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return false

  const { data: targetMember } = await supabaseAdmin
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("player_id", targetId)
    .maybeSingle()

  if (!targetMember) return false
  return targetMember.role === "member" || targetMember.role === "substitute"
}

/**
 * Resolves a player's role in a team.
 */
export async function getTeamRole(
  playerId: string,
  teamId: string,
): Promise<"owner" | "captain" | "member" | "substitute" | null> {
  const isOwner = await isTeamOwner(playerId, teamId)
  if (isOwner) return "owner"

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  try {
    const { data: member } = await supabaseAdmin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("player_id", playerId)
      .maybeSingle()

    if (!member) return null
    return member.role as "owner" | "captain" | "member" | "substitute"
  } catch (error) {
    console.error("Error in getTeamRole:", error)
    return null
  }
}

