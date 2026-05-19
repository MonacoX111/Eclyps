import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import { runAdminRowsQuery } from "@/lib/admin/query"
import {
  readNullableInteger,
  readNullableString,
  readStringId,
} from "@/lib/data/normalize"

export type AdminTeam = {
  id: string
  tournament_id: string | null
  name: string | null
  seed: number | null
  wins: number | null
  losses: number | null
}

export type AdminTeamQueryResult = {
  teams: AdminTeam[]
  error: string | null
}

export async function getAdminTeams(): Promise<AdminTeamQueryResult> {
  noStore()

  if (!supabase) {
    return {
      teams: [],
      error: "Supabase is not configured.",
    }
  }

  const { rows, error } = await runAdminRowsQuery("teams", () =>
    supabase
      .from("teams")
      .select("id, tournament_id, name, seed, wins, losses")
      .order("seed", { ascending: true, nullsFirst: false }),
    normalizeTeam,
  )

  return { teams: rows, error }
}

function normalizeTeam(row: Record<string, unknown>): AdminTeam | null {
  const id = readStringId(row.id)
  if (!id) return null

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    name: readNullableString(row.name),
    seed: readNullableInteger(row.seed),
    wins: readNullableInteger(row.wins),
    losses: readNullableInteger(row.losses),
  }
}
