import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import {
  readMatchStatus,
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"
import {
  readParticipantReference,
  resolveParticipantName,
  type ParticipantReference,
} from "@/lib/data/participants"
import { normalizeRows } from "@/lib/data/query"

export type TournamentMatch = {
  id: string
  tournament_id: string
  round: string | null
  match_order: number | null
  team1: string | null
  team2: string | null
  score1: number | null
  score2: number | null
  status: "upcoming" | "live" | "finished"
  participant_type: "team" | "player"
  participant_1_id: string | null
  participant_2_id: string | null
  participant_1: ParticipantReference | null
  participant_2: ParticipantReference | null
  winner_participant_id: string | null
  bracket_round: string | null
  bracket_position: number | null
  next_match_id: string | null
  next_match_slot: number | null
}

export async function getMatchesForTournament(
  tournamentId: string,
): Promise<TournamentMatch[]> {
  noStore()

  if (!supabase) {
    console.warn("Skipping matches query because Supabase is not configured.")
    return []
  }

  try {
    const orderedResult = await supabase
      .from("matches")
      .select("id, tournament_id, round, match_order, team1, team2, score1, score2, status, participant_type, participant_1_id, participant_2_id, participant_1:participants!matches_participant_1_id_fkey(id, display_name, participant_type), participant_2:participants!matches_participant_2_id_fkey(id, display_name, participant_type), winner_participant_id, bracket_round, bracket_position, next_match_id, next_match_slot")
      .eq("tournament_id", tournamentId)
      .order("match_order", { ascending: true, nullsFirst: false })

    if (orderedResult.error && isMissingColumnError(orderedResult.error)) {
      console.warn(
        "New match participant columns are unavailable. Falling back to legacy match results.",
      )

      const fallbackResult = await supabase
        .from("matches")
        .select("id, tournament_id, round, team1, team2, score1, score2, status, participant_type")
        .eq("tournament_id", tournamentId)

      return logAndReturnMatches(fallbackResult.data, fallbackResult.error)
    }

    return logAndReturnMatches(orderedResult.data, orderedResult.error)
  } catch (error) {
    console.error("Unexpected error while fetching matches for tournament:", error)
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
    console.error("Failed to fetch matches for tournament:", error)
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
    team1: resolveParticipantName(
      readParticipantReference(row.participant_1, readParticipantType(row.participant_type)),
      readNullableString(row.team1),
    ),
    team2: resolveParticipantName(
      readParticipantReference(row.participant_2, readParticipantType(row.participant_type)),
      readNullableString(row.team2),
    ),
    score1: readNullableInteger(row.score1),
    score2: readNullableInteger(row.score2),
    status: readMatchStatus(row.status),
    participant_type: readParticipantType(row.participant_type),
    participant_1_id: readStringId(row.participant_1_id),
    participant_2_id: readStringId(row.participant_2_id),
    participant_1: readParticipantReference(row.participant_1, readParticipantType(row.participant_type)),
    participant_2: readParticipantReference(row.participant_2, readParticipantType(row.participant_type)),
    winner_participant_id: readStringId(row.winner_participant_id),
    bracket_round: readNullableString(row.bracket_round),
    bracket_position: readNullableInteger(row.bracket_position),
    next_match_id: readStringId(row.next_match_id),
    next_match_slot: readNullableInteger(row.next_match_slot),
  }
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
