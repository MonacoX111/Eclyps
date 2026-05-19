import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import {
  readNullableInteger,
  readNullableString,
  readPositiveInteger,
  readStringArray,
  readStringId,
} from "@/lib/data/normalize"

export type ActiveTournament = {
  id: string
  name: string | null
  title: string | null
  display_name: string | null
  game: string | null
  event_date: string | null
  format: string | null
  team_count: number | null
  match_days: number | null
  status: string | null
  prize_pool: string | number | null
  arena_title: string | null
  arena_description: string | null
  arena_tags: string[]
  is_active: boolean
}

export async function getActiveTournament(): Promise<ActiveTournament | null> {
  noStore()

  if (!supabase) {
    console.warn("Skipping active tournament query because Supabase is not configured.")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("Failed to fetch active tournament:", error)
      return null
    }

    if (data) {
      return normalizeTournament(data)
    }

    const { data: fallbackTournament, error: fallbackError } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fallbackError) {
      console.error("Failed to fetch fallback tournament:", fallbackError)
      return null
    }

    return fallbackTournament ? normalizeTournament(fallbackTournament) : null
  } catch (error) {
    console.error("Unexpected error while fetching active tournament:", error)
    return null
  }
}

function normalizeTournament(row: Record<string, unknown>): ActiveTournament | null {
  const id = readStringId(row.id)
  if (!id) {
    console.error("Skipping malformed tournament row without a valid id:", row)
    return null
  }

  return {
    id,
    name: readNullableString(row.name),
    title: readNullableString(row.title),
    display_name: readNullableString(row.display_name),
    game: readNullableString(row.game),
    event_date: readNullableString(row.event_date),
    format: readNullableString(row.format),
    team_count: readNullableInteger(row.team_count),
    match_days: readPositiveInteger(row.match_days),
    status: readNullableString(row.status),
    prize_pool:
      typeof row.prize_pool === "number"
        ? row.prize_pool
        : readNullableString(row.prize_pool),
    arena_title: readNullableString(row.arena_title),
    arena_description: readNullableString(row.arena_description),
    arena_tags: readStringArray(row.arena_tags),
    is_active: row.is_active === true,
  }
}
