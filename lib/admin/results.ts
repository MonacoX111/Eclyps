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

export type AdminResult = {
  id: string
  tournament_id: string | null
  team: string | null
  placement: number | null
  label: string | null
  mvp: string | null
  scoreline: string | null
  note: string | null
  participant_type: string | null
  participant_id: string | null
}

export type AdminResultQueryResult = {
  results: AdminResult[]
  error: string | null
}

export async function getAdminResults(): Promise<AdminResultQueryResult> {
  noStore()

  if (!supabase) {
    return { results: [], error: "Supabase is not configured." }
  }

  const { rows, error } = await runAdminRowsQuery("results", async () => {
    const result = await supabase
      .from("results")
      .select("id, tournament_id, team, placement, label, mvp, scoreline, note, participant_type, participant_id")
      .order("placement", { ascending: true, nullsFirst: false })

    if (isMissingColumnError(result.error)) {
      return supabase
        .from("results")
        .select("id, tournament_id, team, placement, label, mvp, scoreline, note, participant_type")
        .order("placement", { ascending: true, nullsFirst: false })
    }

    return result
  }, normalizeResult)

  return { results: rows, error }
}

function normalizeResult(row: Record<string, unknown>): AdminResult | null {
  const id = readStringId(row.id)
  if (!id) return null

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
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

function isMissingColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: unknown }).code === "42703" ||
      (error as { code?: unknown }).code === "PGRST204")
  )
}
