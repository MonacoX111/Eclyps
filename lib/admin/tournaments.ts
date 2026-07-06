import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import { runAdminRowsQuery } from "@/lib/admin/query"
import { getDisplayGameName } from "@/lib/games"
import {
  normalizeTournamentFormat,
  normalizeTournamentFormatConfig,
  type TournamentFormat,
  type TournamentFormatConfig,
} from "@/lib/tournament-formats"
import {
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readPositiveInteger,
  readStringArray,
  readStringId,
} from "@/lib/data/normalize"

export type AdminTournament = {
  id: string
  name: string | null
  game: string | null
  game_mode: string | null
  participant_type: "team" | "player"
  event_date: string | null
  format: string | null
  tournament_format: TournamentFormat
  format_config: TournamentFormatConfig
  team_count: number | null
  match_days: number | null
  status: string | null
  prize_pool: string | null
  arena_title: string | null
  arena_description: string | null
  arena_tags: string[] | null
  bracket_title: string | null
  bracket_subtitle: string | null
  bracket_stage_label: string | null
  bracket_participant_label: string | null
  bracket_arena_label: string | null
  check_in_opens_at: string | null
  check_in_closes_at: string | null
  is_active: boolean | null
  created_at: string | null
}

export type AdminTournamentQueryResult = {
  tournaments: AdminTournament[]
  error: string | null
}

export async function getAdminTournaments(): Promise<AdminTournamentQueryResult> {
  noStore()

  if (!supabase) {
    return {
      tournaments: [],
      error: "Supabase is not configured.",
    }
  }

  const { rows, error } = await runAdminRowsQuery("tournaments", async () => {
    const result = await supabase
      .from("tournaments")
      .select("id, name, game, game_mode, participant_type, event_date, format, tournament_format, format_config, team_count, match_days, status, prize_pool, arena_title, arena_description, arena_tags, bracket_title, bracket_subtitle, bracket_stage_label, bracket_participant_label, bracket_arena_label, check_in_opens_at, check_in_closes_at, is_active, created_at")
      .order("created_at", { ascending: false })

    if (result.error && isMissingColumnError(result.error)) {
      return supabase
        .from("tournaments")
        .select("id, name, game, event_date, format, team_count, match_days, status, prize_pool, arena_title, arena_description, arena_tags, bracket_title, bracket_subtitle, bracket_stage_label, bracket_participant_label, bracket_arena_label, is_active, created_at")
        .order("created_at", { ascending: false })
    }

    return result
  },
    normalizeTournament,
  )

  return { tournaments: rows, error }
}

function normalizeTournament(row: Record<string, unknown>): AdminTournament | null {
  const id = readStringId(row.id)
  if (!id) return null

  return {
    id,
    name: readNullableString(row.name),
    game: getDisplayGameName(readNullableString(row.game)),
    game_mode: readNullableString(row.game_mode),
    participant_type: readTournamentParticipantType(row.participant_type),
    event_date: readNullableString(row.event_date),
    format: readNullableString(row.format),
    tournament_format: normalizeTournamentFormat(row.tournament_format),
    format_config: normalizeTournamentFormatConfig(row.tournament_format, row.format_config),
    team_count: readNullableInteger(row.team_count),
    match_days: readPositiveInteger(row.match_days),
    status: readNullableString(row.status),
    prize_pool: readNullableString(row.prize_pool),
    arena_title: readNullableString(row.arena_title),
    arena_description: readNullableString(row.arena_description),
    arena_tags: readStringArray(row.arena_tags),
    bracket_title: readNullableString(row.bracket_title),
    bracket_subtitle: readNullableString(row.bracket_subtitle),
    bracket_stage_label: readNullableString(row.bracket_stage_label),
    bracket_participant_label: readNullableString(row.bracket_participant_label),
    bracket_arena_label: readNullableString(row.bracket_arena_label),
    check_in_opens_at: readNullableString(row.check_in_opens_at),
    check_in_closes_at: readNullableString(row.check_in_closes_at),
    is_active: row.is_active === true,
    created_at: readNullableString(row.created_at),
  }
}

function readTournamentParticipantType(value: unknown): "team" | "player" {
  return value === "team" || value === "player" ? readParticipantType(value) : "player"
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204"
}
