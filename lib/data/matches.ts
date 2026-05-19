import { unstable_noStore as noStore } from "next/cache"
import { getActiveTournament } from "@/lib/data/tournaments"
import { supabase } from "@/lib/supabase/client"
import {
  readMatchStatus,
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"
import { normalizeRows } from "@/lib/data/query"

export type TournamentMatch = {
  id: string
  tournament_id: string
  round: string | null
  match_order?: number | null
  team1: string | null
  team2: string | null
  score1?: number | null
  score2?: number | null
  status?: string | null
  participant_type?: string | null
}

export async function getMatchesForActiveTournament(): Promise<TournamentMatch[]> {
  noStore()

  const tournament = await getActiveTournament()
  const tournamentId = readStringId(tournament?.id)

  if (!supabase) {
    console.warn("Skipping matches query because Supabase is not configured.")
    return []
  }

  if (!tournamentId) {
    console.warn("Skipping matches query because no active tournament id was found.")
    return []
  }

  try {
    const orderedResult = await supabase
      .from("matches")
      .select("id, tournament_id, round, match_order, team1, team2, score1, score2, status, participant_type")
      .eq("tournament_id", tournamentId)
      .order("match_order", { ascending: true, nullsFirst: false })

    if (orderedResult.error && orderedResult.error.code === "42703") {
      console.warn(
        "matches.match_order column is unavailable. Falling back to unordered results.",
      )

      const fallbackResult = await supabase
        .from("matches")
        .select("id, tournament_id, round, team1, team2, score1, score2, status, participant_type")
        .eq("tournament_id", tournamentId)

      return logAndReturnMatches(fallbackResult.data, fallbackResult.error)
    }

    return logAndReturnMatches(orderedResult.data, orderedResult.error)
  } catch (error) {
    console.error("Unexpected error while fetching matches for active tournament:", error)
    return []
  }
}

function logAndReturnMatches(
  data: Record<string, unknown>[] | null,
  error: {
    message: string
    code: string
    details: string
    hint: string
  } | null,
) {
  if (error) {
    console.error("Failed to fetch matches for active tournament:", error)
    return []
  }

  return normalizeRows(data, normalizeMatch)
}

function normalizeMatch(row: Record<string, unknown>): TournamentMatch | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)

  if (!id || !tournamentId) {
    console.error("Skipping malformed match row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    round: readNullableString(row.round),
    match_order: readNullableInteger(row.match_order),
    team1: readNullableString(row.team1),
    team2: readNullableString(row.team2),
    score1: readNullableInteger(row.score1),
    score2: readNullableInteger(row.score2),
    status: readMatchStatus(row.status),
    participant_type: readParticipantType(row.participant_type),
  }
}
