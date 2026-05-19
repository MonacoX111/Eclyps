import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { getActiveTournament } from "@/lib/data/tournaments"
import { supabase } from "@/lib/supabase/client"
import {
  readNullableInteger,
  readNullableString,
  readNonNegativeInteger,
  readStringId,
} from "@/lib/data/normalize"
import { normalizeRows } from "@/lib/data/query"

export type TournamentPlayer = {
  id: string
  tournament_id: string
  name: string
  nickname?: string | null
  seed?: number | null
  wins?: number | null
  losses?: number | null
}

export async function getPlayersForActiveTournament(): Promise<TournamentPlayer[]> {
  noStore()
  const tournament = await getActiveTournament()
  const tournamentId = readStringId(tournament?.id)

  if (!tournamentId) return []

  try {
    const { data, error } = await supabase
      .from("players")
      .select("id, tournament_id, name, nickname, seed, wins, losses")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Failed to fetch players for active tournament:", error)
      return []
    }

    return normalizeRows(data, normalizePlayer)
  } catch (error) {
    console.error("Unexpected error while fetching players for active tournament:", error)
    return []
  }
}

function normalizePlayer(row: Record<string, unknown>): TournamentPlayer | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)

  if (!id || !tournamentId || !name) {
    console.error("Skipping malformed player row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    name,
    nickname: readNullableString(row.nickname),
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}
