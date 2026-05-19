import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import {
  readNullableInteger,
  readNullableString,
  readNonNegativeInteger,
  readStringId,
} from "@/lib/data/normalize"
import { normalizeRows } from "@/lib/data/query"

export type TournamentTeam = {
  id: string
  tournament_id: string
  name: string
  seed: number | null
  wins: number
  losses: number
}

export async function getTeamsForTournament(
  tournamentId: string,
): Promise<TournamentTeam[]> {
  noStore()

  if (!supabase) {
    console.warn("Skipping teams query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("teams")
      .select("id, tournament_id, name, seed, wins, losses")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Failed to fetch teams for tournament:", error)
      return []
    }

    return normalizeRows(data, normalizeTeam)
  } catch (error) {
    console.error("Unexpected error while fetching teams for tournament:", error)
    return []
  }
}

function normalizeTeam(row: Record<string, unknown>): TournamentTeam | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)

  if (!id || !tournamentId || !name) {
    console.error("Skipping malformed team row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    name,
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}
