import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import { runAdminRowsQuery } from "@/lib/admin/query"
import {
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"

export type AdminMatch = {
  id: string
  tournament_id: string | null
  round: string | null
  team1: string | null
  team2: string | null
  score1: number | null
  score2: number | null
  status: string | null
  match_order: number | null
  participant_type: string | null
}

export type AdminMatchQueryResult = {
  matches: AdminMatch[]
  error: string | null
}

export async function getAdminMatches(): Promise<AdminMatchQueryResult> {
  noStore()

  if (!supabase) {
    return { matches: [], error: "Supabase is not configured." }
  }

  const { rows, error } = await runAdminRowsQuery("matches", () =>
    supabase
      .from("matches")
      .select("id, tournament_id, round, team1, team2, score1, score2, status, match_order, participant_type")
      .order("match_order", { ascending: true, nullsFirst: false }),
    normalizeMatch,
  )

  return { matches: rows, error }
}

function normalizeMatch(row: Record<string, unknown>): AdminMatch | null {
  const id = readStringId(row.id)
  if (!id) return null

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    round: readNullableString(row.round),
    team1: readNullableString(row.team1),
    team2: readNullableString(row.team2),
    score1: readNullableInteger(row.score1),
    score2: readNullableInteger(row.score2),
    status: readNullableString(row.status),
    match_order: readNullableInteger(row.match_order),
    participant_type: readParticipantType(row.participant_type),
  }
}
