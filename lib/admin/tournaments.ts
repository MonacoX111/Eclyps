import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import { runAdminRowsQuery } from "@/lib/admin/query"
import {
  readNullableInteger,
  readNullableString,
  readPositiveInteger,
  readStringArray,
  readStringId,
} from "@/lib/data/normalize"

export type AdminTournament = {
  id: string
  name: string | null
  game: string | null
  event_date: string | null
  format: string | null
  team_count: number | null
  match_days: number | null
  status: string | null
  prize_pool: string | null
  arena_title: string | null
  arena_description: string | null
  arena_tags: string[] | null
  is_active: boolean | null
  created_at: string | null
}

export type AdminTournamentQueryResult = {
  tournaments: AdminTournament[]
  error: string | null
}

export async function getAdminTournaments(): Promise<AdminTournamentQueryResult> {
  noStore()

  if (!supabase) {
    return {
      tournaments: [],
      error: "Supabase is not configured.",
    }
  }

  const { rows, error } = await runAdminRowsQuery("tournaments", () =>
    supabase
      .from("tournaments")
      .select("id, name, game, event_date, format, team_count, match_days, status, prize_pool, arena_title, arena_description, arena_tags, is_active, created_at")
      .order("created_at", { ascending: false }),
    normalizeTournament,
  )

  return { tournaments: rows, error }
}

function normalizeTournament(row: Record<string, unknown>): AdminTournament | null {
  const id = readStringId(row.id)
  if (!id) return null

  return {
    id,
    name: readNullableString(row.name),
    game: readNullableString(row.game),
    event_date: readNullableString(row.event_date),
    format: readNullableString(row.format),
    team_count: readNullableInteger(row.team_count),
    match_days: readPositiveInteger(row.match_days),
    status: readNullableString(row.status),
    prize_pool: readNullableString(row.prize_pool),
    arena_title: readNullableString(row.arena_title),
    arena_description: readNullableString(row.arena_description),
    arena_tags: readStringArray(row.arena_tags),
    is_active: row.is_active === true,
    created_at: readNullableString(row.created_at),
  }
}
