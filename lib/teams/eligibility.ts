import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type TeamEligibilityResult = {
  allowed: boolean
  reason?: string
}

/**
 * Reusable helper to check if a global team is eligible for tournament registration.
 *
 * Rules:
 * 1. Team must exist.
 * 2. Team status must be 'approved'.
 * 3. Team must have at least one captain in team_members.
 */
export async function canRegisterTeamForTournament(
  teamId: string,
): Promise<TeamEligibilityResult> {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return { allowed: false, reason: "database-client-unavailable" }
  }

  // 1. Fetch team details
  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, status")
    .eq("id", teamId)
    .maybeSingle()

  if (teamError || !team) {
    return { allowed: false, reason: "team-not-found" }
  }

  // Pending/rejected teams are blocked from registration.
  // Legacy teams default to 'approved' if status is null.
  const teamStatus = team.status ?? "approved"
  if (teamStatus !== "approved") {
    return { allowed: false, reason: `team-status-is-${teamStatus}` }
  }

  // 2. Verify team has at least one captain in team_members
  const { data: captains, error: captainsError } = await supabaseAdmin
    .from("team_members")
    .select("player_id")
    .eq("team_id", teamId)
    .eq("role", "captain")

  if (captainsError) {
    return { allowed: false, reason: "failed-to-load-roster" }
  }

  if (!captains || captains.length === 0) {
    return { allowed: false, reason: "no-captain-assigned" }
  }

  return { allowed: true }
}
