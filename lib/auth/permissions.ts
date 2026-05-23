import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * Checks if a player can manage a team (i.e. is the owner/captain of the team).
 * @param teamId The global team ID.
 * @param currentPlayerId The global player ID.
 */
export async function canManageTeam(
  teamId: string,
  currentPlayerId: string,
): Promise<boolean> {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    console.error("Supabase admin client not available for permissions check.")
    return false
  }

  try {
    // 1. Check if the player is the owner of the team
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("id, owner_player_id")
      .eq("id", teamId)
      .maybeSingle()

    if (teamError) {
      console.error("Failed to check team ownership in permissions helper:", teamError)
      return false
    }

    if (team && team.owner_player_id === currentPlayerId) {
      return true
    }

    // 2. Check if the player has the 'captain' role in team_members
    const { data: member, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("player_id", currentPlayerId)
      .eq("role", "captain")
      .maybeSingle()

    if (memberError) {
      console.error("Failed to check team member role in permissions helper:", memberError)
      return false
    }

    return Boolean(member)
  } catch (error) {
    console.error("Unexpected error in canManageTeam helper:", error)
    return false
  }
}
