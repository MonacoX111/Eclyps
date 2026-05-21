import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import { runAdminRowsQuery } from "@/lib/admin/query"
import {
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"
import { supabase } from "@/lib/supabase/client"

export type ParticipantType = "team" | "player"

export type AdminParticipant = {
  id: string
  tournament_id: string
  participant_type: ParticipantType
  display_name: string
  region: string | null
  seed: number | null
  logo_url: string | null
  avatar_url: string | null
  source_team_id: string | null
  source_player_id: string | null
  created_at: string | null
}

type SupabaseAdminClient = SupabaseClient

export type AdminParticipantQueryResult = {
  participants: AdminParticipant[]
  error: string | null
}

export async function getAdminParticipants(): Promise<AdminParticipantQueryResult> {
  noStore()

  if (!supabase) {
    return { participants: [], error: "Supabase is not configured." }
  }

  const { rows, error } = await runAdminRowsQuery("participants", () =>
    supabase
      .from("participants")
      .select("id, tournament_id, participant_type, display_name, region, seed, logo_url, avatar_url, source_team_id, source_player_id, created_at")
      .order("seed", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true }),
    normalizeParticipant,
  )

  return { participants: rows, error }
}

export async function upsertTeamParticipant(
  supabaseAdmin: SupabaseAdminClient,
  team: {
    id: string
    tournament_id: string
    name: string
    seed: number
  },
) {
  return upsertParticipant(supabaseAdmin, {
    tournament_id: team.tournament_id,
    participant_type: "team",
    display_name: team.name,
    seed: team.seed,
    source_team_id: team.id,
    source_player_id: null,
  })
}

export async function upsertPlayerParticipant(
  supabaseAdmin: SupabaseAdminClient,
  player: {
    id: string
    tournament_id: string
    name: string
    nickname: string | null
    region: string | null
    seed: number | null
  },
) {
  return upsertParticipant(supabaseAdmin, {
    tournament_id: player.tournament_id,
    participant_type: "player",
    display_name: player.nickname || player.name,
    region: player.region,
    seed: player.seed,
    source_team_id: null,
    source_player_id: player.id,
  })
}

export async function deleteTeamParticipant(
  supabaseAdmin: SupabaseAdminClient,
  teamId: string,
) {
  await deleteParticipantBySource(supabaseAdmin, "source_team_id", teamId)
}

export async function deletePlayerParticipant(
  supabaseAdmin: SupabaseAdminClient,
  playerId: string,
) {
  await deleteParticipantBySource(supabaseAdmin, "source_player_id", playerId)
}

export async function findParticipantIdByDisplayName(
  supabaseAdmin: SupabaseAdminClient,
  {
    tournamentId,
    participantType,
    displayName,
  }: {
    tournamentId: string
    participantType: ParticipantType
    displayName: string
  },
) {
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)
    .ilike("display_name", displayName)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Failed to resolve participant by name:", error)
    return null
  }

  return typeof data?.id === "string" ? data.id : null
}

async function upsertParticipant(
  supabaseAdmin: SupabaseAdminClient,
  participant: {
    tournament_id: string
    participant_type: ParticipantType
    display_name: string
    region?: string | null
    seed: number | null
    source_team_id: string | null
    source_player_id: string | null
  },
) {
  const sourceColumn =
    participant.participant_type === "team" ? "source_team_id" : "source_player_id"
  const sourceId = participant[sourceColumn]

  if (!sourceId) return null

  const existing = await findParticipantByTournamentSource(supabaseAdmin, {
    tournamentId: participant.tournament_id,
    participantType: participant.participant_type,
    sourceColumn,
    sourceId,
  })

  const payload = {
    ...participant,
    updated_at: new Date().toISOString(),
  }

  const result = existing
    ? await supabaseAdmin
        .from("participants")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .maybeSingle()
    : await supabaseAdmin
        .from("participants")
        .insert(payload)
        .select("id")
        .maybeSingle()

  if (result.error && isMissingColumnError(result.error)) {
    const { region: _region, ...participantWithoutRegion } = participant
    const fallbackPayload = {
      ...participantWithoutRegion,
      updated_at: new Date().toISOString(),
    }
    const fallbackResult = existing
      ? await supabaseAdmin
          .from("participants")
          .update(fallbackPayload)
          .eq("id", existing.id)
          .select("id")
          .maybeSingle()
      : await supabaseAdmin
          .from("participants")
          .insert(fallbackPayload)
          .select("id")
          .maybeSingle()

    if (fallbackResult.error) {
      console.error("Failed to sync participant:", fallbackResult.error)
    }

    return typeof fallbackResult.data?.id === "string" ? fallbackResult.data.id : existing?.id ?? null
  }

  if (result.error) {
    console.error("Failed to sync participant:", result.error)
    return existing?.id ?? null
  }

  return typeof result.data?.id === "string" ? result.data.id : existing?.id ?? null
}

async function findParticipantByTournamentSource(
  supabaseAdmin: SupabaseAdminClient,
  {
    tournamentId,
    participantType,
    sourceColumn,
    sourceId,
  }: {
    tournamentId: string
    participantType: ParticipantType
    sourceColumn: "source_team_id" | "source_player_id"
    sourceId: string
  },
) {
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)
    .eq(sourceColumn, sourceId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Failed to resolve participant by source:", error)
    return null
  }

  return typeof data?.id === "string" ? { id: data.id } : null
}

async function deleteParticipantBySource(
  supabaseAdmin: SupabaseAdminClient,
  sourceColumn: "source_team_id" | "source_player_id",
  sourceId: string,
) {
  const { error } = await supabaseAdmin
    .from("participants")
    .delete()
    .eq(sourceColumn, sourceId)

  if (error) {
    console.error("Failed to delete participant:", error)
  }
}

function normalizeParticipant(row: Record<string, unknown>): AdminParticipant | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const displayName = readNullableString(row.display_name)

  if (!id || !tournamentId || !displayName) {
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    participant_type: readParticipantType(row.participant_type),
    display_name: displayName,
    region: readNullableString(row.region),
    seed: readNullableInteger(row.seed),
    logo_url: readNullableString(row.logo_url),
    avatar_url: readNullableString(row.avatar_url),
    source_team_id: readStringId(row.source_team_id),
    source_player_id: readStringId(row.source_player_id),
    created_at: readNullableString(row.created_at),
  }
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204"
}
