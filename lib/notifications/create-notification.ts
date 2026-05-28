import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type CreateNotificationPayload = {
  userProfileId: string
  playerId?: string | null
  teamId?: string | null
  tournamentId?: string | null
  matchId?: string | null
  type: string
  title: string
  message: string
}

/**
 * Reusable server-side helper to create in-app notifications.
 * Runs safely using the Supabase service role client.
 * Wrapped in try-catch to ensure failures do not block primary business operations.
 */
export async function createNotification({
  userProfileId,
  playerId = null,
  teamId = null,
  tournamentId = null,
  matchId = null,
  type,
  title,
  message,
}: CreateNotificationPayload) {
  try {
    const supabaseAdmin = createSupabaseAdminClient()
    if (!supabaseAdmin) {
      console.error("createNotification: Admin client unavailable, skipped notification write.", { type, title })
      return { ok: false, error: "admin-client-unavailable" }
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_profile_id: userProfileId,
        player_id: playerId,
        team_id: teamId,
        tournament_id: tournamentId,
        match_id: matchId,
        type,
        title,
        message,
      })
      .select("id")
      .maybeSingle()

    if (error) {
      console.error("createNotification: Failed to insert notification in database:", error)
      return { ok: false, error: error.message }
    }

    return { ok: true, data }
  } catch (err) {
    console.error("createNotification: Unexpected exception caught while writing notification:", err)
    return { ok: false, error: err instanceof Error ? err.message : "unexpected-error" }
  }
}
