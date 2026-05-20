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
  display_name: string
  seed: number | null
  wins: number | null
  losses: number | null
  created_at: string | null
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
      .select("id, tournament_id, name, nickname, seed, wins, losses, created_at")
      .order("seed", { ascending: true, nullsFirst: false }),
    normalizePlayer,
  )

  return { players: rows, error }
}

function normalizePlayer(row: Record<string, unknown>): AdminPlayer | null {
  const id = readStringId(row.id)
  if (!id) return null

  const realName = readNullableString(row.name)
  const nickname = readNullableString(row.nickname)
  const displayName = getPlayerDisplayName(realName, nickname)

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    name: realName,
    nickname,
    real_name: realName,
    display_name: displayName,
    seed: readNullableInteger(row.seed),
    wins: readNullableInteger(row.wins),
    losses: readNullableInteger(row.losses),
    created_at: readNullableString(row.created_at),
  }
}

function getPlayerDisplayName(realName: string | null, nickname: string | null) {
  return nickname?.trim() || realName?.trim() || "Untitled player"
}
