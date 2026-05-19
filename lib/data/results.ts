import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import {
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"
import { normalizeRows } from "@/lib/data/query"

export type TournamentResult = {
  id: string
  tournament_id: string
  team: string | null
  placement: number | null
  label: string | null
  mvp: string | null
  scoreline: string | null
  note: string | null
  participant_type: "team" | "player"
  participant_id: string | null
}

export async function getResultsForTournament(
  tournamentId: string,
): Promise<TournamentResult[]> {
  noStore()

  if (!supabase) {
    console.warn("Skipping results query because Supabase is not configured.")
    return []
  }

  try {
    const result = await supabase
      .from("results")
      .select("id, tournament_id, team, placement, label, mvp, scoreline, note, participant_type, participant_id")
      .eq("tournament_id", tournamentId)
      .order("placement", { ascending: true, nullsFirst: false })

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await supabase
        .from("results")
        .select("id, tournament_id, team, placement, label, mvp, scoreline, note, participant_type")
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true, nullsFirst: false })

      return logAndReturnResults(fallbackResult.data, fallbackResult.error)
    }

    return logAndReturnResults(result.data, result.error)
  } catch (error) {
    console.error("Unexpected error while fetching results for tournament:", error)
    return []
  }
}

function logAndReturnResults(
  data: Record<string, unknown>[] | null,
  error: {
    message: string
    code: string
    details: string
    hint: string
  } | null,
) {
  if (error) {
    console.error("Failed to fetch results for tournament:", error)
    return []
  }

  return normalizeRows(data, normalizeResult)
}

function normalizeResult(row: Record<string, unknown>): TournamentResult | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)

  if (!id || !tournamentId) {
    console.error("Skipping malformed result row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    team: readNullableString(row.team),
    placement: readNullableInteger(row.placement),
    label: readNullableString(row.label),
    mvp: readNullableString(row.mvp),
    scoreline: readNullableString(row.scoreline),
    note: readNullableString(row.note),
    participant_type: readParticipantType(row.participant_type),
    participant_id: readStringId(row.participant_id),
  }
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204"
}
