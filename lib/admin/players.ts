import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { runAdminRowsQuery } from "@/lib/admin/query"
import {
  readNullableInteger,
  readNullableString,
  readStringId,
} from "@/lib/data/normalize"

export type AdminPlayer = {
  id: string
  tournament_id: string | null
  name: string | null
  nickname: string | null
  real_name: string | null
  region: string | null
  display_name: string
  seed: number | null
  wins: number | null
  losses: number | null
  created_at: string | null
  status: string | null
  avatar_url: string | null
  discord_username: string | null
  user_id: string | null
}

export async function getAdminPlayers() {
  noStore()
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    return {
      players: [] as AdminPlayer[],
      error: "Server-only Supabase admin client is not configured.",
    }
  }

  const { rows, error } = await runAdminRowsQuery("players", () =>
    supabaseAdmin
      .from("players")
      .select("id, tournament_id, name, nickname, display_name, real_name, avatar_url, region, seed, wins, losses, status, created_at, user_id, owner_user_id, owner_profile:user_profiles!players_owner_user_id_fkey(id, discord_username)")
      .order("created_at", { ascending: false }),
    normalizePlayer,
  )

  return { players: rows, error }
}

function normalizePlayer(row: Record<string, unknown>): AdminPlayer | null {
  const id = readStringId(row.id)
  if (!id) return null

  const realName = readNullableString(row.name)
  const nickname = readNullableString(row.nickname)
  const region = readNullableString(row.region)
  const displayName = readNullableString(row.display_name) ?? getPlayerDisplayName(realName, nickname)

  const ownerProfileRaw = row.owner_profile
  const ownerProfile = Array.isArray(ownerProfileRaw) ? ownerProfileRaw[0] : ownerProfileRaw
  const discordUsername = ownerProfile && typeof ownerProfile === "object"
    ? readNullableString((ownerProfile as Record<string, unknown>).discord_username)
    : null

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    name: realName,
    nickname,
    real_name: realName,
    region,
    display_name: displayName,
    seed: readNullableInteger(row.seed),
    wins: readNullableInteger(row.wins),
    losses: readNullableInteger(row.losses),
    created_at: readNullableString(row.created_at),
    status: readNullableString(row.status) ?? "approved",
    avatar_url: readNullableString(row.avatar_url),
    discord_username: discordUsername,
    user_id: readStringId(row.user_id),
  }
}

function getPlayerDisplayName(realName: string | null, nickname: string | null) {
  return nickname?.trim() || realName?.trim() || "Untitled player"
}
