import { unstable_noStore as noStore } from "next/cache"
import { getActiveTournament } from "@/lib/data/tournaments"
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
  label?: string | null
  mvp?: string | null
  scoreline?: string | null
  note?: string | null
  participant_type?: string | null
}

export async function getResultsForActiveTournament(): Promise<TournamentResult[]> {
  noStore()

  const tournament = await getActiveTournament()
  const tournamentId = readStringId(tournament?.id)

  if (!supabase) {
    console.warn("Skipping results query because Supabase is not configured.")
    return []
  }

  if (!tournamentId) {
    console.warn("Skipping results query because no active tournament id was found.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("results")
      .select("id, tournament_id, team, placement, label, mvp, scoreline, note, participant_type")
      .eq("tournament_id", tournamentId)
      .order("placement", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Failed to fetch results for active tournament:", error)
      return []
    }

    return normalizeRows(data, normalizeResult)
  } catch (error) {
    console.error("Unexpected error while fetching results for active tournament:", error)
    return []
  }
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
  }
}
