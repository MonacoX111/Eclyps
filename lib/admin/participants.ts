import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type ParticipantType = "team" | "player"

export type AdminParticipant = {
  id: string
  tournament_id: string
  participant_type: ParticipantType
  display_name: string
  seed: number | null
  logo_url: string | null
  avatar_url: string | null
  source_team_id: string | null
  source_player_id: string | null
  created_at: string | null
}

type SupabaseAdminClient = SupabaseClient

export async function upsertTeamParticipant(
  supabaseAdmin: SupabaseAdminClient,
  team: {
    id: string
    tournament_id: string
    name: string
    seed: number
  },
) {
  await upsertParticipant(supabaseAdmin, {
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
    seed: number | null
  },
) {
  await upsertParticipant(supabaseAdmin, {
    tournament_id: player.tournament_id,
    participant_type: "player",
    display_name: player.nickname || player.name,
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
    seed: number | null
    source_team_id: string | null
    source_player_id: string | null
  },
) {
  const conflictTarget =
    participant.participant_type === "team" ? "source_team_id" : "source_player_id"

  const { error } = await supabaseAdmin
    .from("participants")
    .upsert(
      {
        ...participant,
        updated_at: new Date().toISOString(),
      },
      { onConflict: conflictTarget },
    )

  if (error) {
    console.error("Failed to sync participant:", error)
  }
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
