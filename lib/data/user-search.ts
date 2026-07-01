import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type UserSearchResult = {
  id: string
  displayName: string
  discordUsername: string
  avatarUrl: string | null
  lastSeen: string | null
  playerId: string | null
}

/**
 * Search users by display name or discord username.
 * Returns up to `limit` results.
 */
export async function searchUsers(
  query: string,
  limit = 20,
): Promise<UserSearchResult[]> {
  const admin = createSupabaseAdminClient()
  if (!admin) return []

  const trimmed = query.trim()
  if (!trimmed) return []

  // Search by display_name or discord_username (case-insensitive)
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, display_name, discord_username, avatar_url, last_seen, auth_user_id")
    .or(
      `display_name.ilike.%${trimmed}%,discord_username.ilike.%${trimmed}%`,
    )
    .limit(limit)

  if (error || !data) return []

  const results: UserSearchResult[] = data.map((row: any) => ({
    id: row.id,
    displayName: row.display_name ?? "Player",
    discordUsername: row.discord_username ?? "",
    avatarUrl: row.avatar_url ?? null,
    lastSeen: row.last_seen ?? null,
    playerId: null,
  }))

  // Batch-resolve player IDs
  const authIds: string[] = []
  const authIdMap = new Map<string, string>() // user_profile.id → auth_user_id
  for (const row of data as any[]) {
    if (typeof row.auth_user_id === "string") {
      authIdMap.set(row.id, row.auth_user_id)
      authIds.push(row.auth_user_id)
    }
  }
  if (authIds.length > 0) {
    const { data: players } = await admin
      .from("players")
      .select("id, user_id")
      .in("user_id", authIds)
    if (players) {
      const playerByAuthId = new Map<string, string>()
      for (const pl of players as any[]) {
        if (typeof pl.user_id === "string" && typeof pl.id === "string") {
          playerByAuthId.set(pl.user_id, pl.id)
        }
      }
      for (const r of results) {
        const authId = authIdMap.get(r.id)
        if (authId) {
          r.playerId = playerByAuthId.get(authId) ?? null
        }
      }
    }
  }

  return results
}
