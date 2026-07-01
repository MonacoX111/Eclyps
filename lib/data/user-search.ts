import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type UserSearchResult = {
  id: string
  displayName: string
  discordUsername: string
  avatarUrl: string | null
  lastSeen: string | null
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
    .select("id, display_name, discord_username, avatar_url, last_seen")
    .or(
      `display_name.ilike.%${trimmed}%,discord_username.ilike.%${trimmed}%`,
    )
    .limit(limit)

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    displayName: row.display_name ?? "Player",
    discordUsername: row.discord_username ?? "",
    avatarUrl: row.avatar_url ?? null,
    lastSeen: row.last_seen ?? null,
  }))
}
