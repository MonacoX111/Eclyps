import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getDisplayGameName } from "@/lib/games"
import { supabase } from "@/lib/supabase/client"
import {
  readMatchStatus,
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"

export type MatchDetailStatus = "upcoming" | "live" | "finished"

export type MatchDetailParticipant = {
  id: string | null
  sourceId: string | null
  type: "team" | "player"
  name: string | null
  imageUrl: string | null
  href: string | null
}

export type MatchBroadcastType = "twitch" | "youtube" | "kick" | "discord" | "other"

export type MatchBroadcast = {
  type: MatchBroadcastType
  url: string | null
  label: string | null
}

export type MatchDetail = {
  id: string
  tournament: {
    id: string | null
    name: string | null
    game: string | null
    gameMode: string | null
    participantType: "team" | "player"
    format: string | null
    status: string | null
    streamUrl: string | null
    broadcast: MatchBroadcast | null
  }
  participantType: "team" | "player"
  participants: [MatchDetailParticipant, MatchDetailParticipant]
  status: MatchDetailStatus
  scheduledAt: string | null
  timezone: string | null
  scheduleNote: string | null
  round: string | null
  stage: string | null
  bracketId: string | null
  bracketType: string | null
  bracketStatus: string | null
  bracketPosition: number | null
  nextMatchId: string | null
  nextMatchLabel: string | null
  score1: number | null
  score2: number | null
  winnerParticipantId: string | null
  streamUrl: string | null
  broadcast: MatchBroadcast | null
  disputeStatus: "none" | "open" | "under_review" | "resolved" | "rejected"
  isIncomplete: boolean
}

type MatchRow = Record<string, unknown> & {
  participant_1?: Record<string, unknown> | Record<string, unknown>[] | null
  participant_2?: Record<string, unknown> | Record<string, unknown>[] | null
  tournament?: Record<string, unknown> | Record<string, unknown>[] | null
}

const MATCH_SELECT =
  "id, tournament_id, round, match_order, team1, team2, score1, score2, status, participant_type, participant_1_id, participant_2_id, participant_1:participants!matches_participant_1_id_fkey(id, display_name, participant_type, source_team_id, source_player_id, logo_url, avatar_url), participant_2:participants!matches_participant_2_id_fkey(id, display_name, participant_type, source_team_id, source_player_id, logo_url, avatar_url), winner_participant_id, bracket_id, bracket_type, bracket_status, round_order, bracket_round, bracket_position, next_match_id, next_match_slot, scheduled_at, timezone, schedule_note, tournament:tournaments!matches_tournament_id_fkey(id, name, game, game_mode, participant_type, format, status)"

export async function getPublicMatchDetail(id: string): Promise<MatchDetail | null> {
  noStore()

  if (!supabase) {
    console.warn("Skipping match detail query because Supabase is not configured.")
    return null
  }

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch public match detail:", error)
    return null
  }

  if (!data) return null

  const match = normalizeMatchRow(data as MatchRow)
  if (!match) return null

  const participantIds = match.participants
    .map((participant) => participant.sourceId)
    .filter((value): value is string => Boolean(value))

  const [sourceImages, matchBroadcast, tournamentBroadcast, streamUrl, tournamentStreamUrl, disputeStatus, nextMatchLabel] =
    await Promise.all([
      fetchSourceImages(match.participantType, participantIds),
      fetchOptionalBroadcast("matches", match.id),
      match.tournament.id ? fetchOptionalBroadcast("tournaments", match.tournament.id) : null,
      fetchOptionalStreamUrl("matches", match.id),
      match.tournament.id ? fetchOptionalStreamUrl("tournaments", match.tournament.id) : null,
      fetchPublicDisputeStatus(match.id),
      match.nextMatchId ? fetchNextMatchLabel(match.nextMatchId) : null,
    ])
  const broadcast =
    matchBroadcast ??
    tournamentBroadcast ??
    (streamUrl ?? tournamentStreamUrl
      ? { type: "twitch" as const, url: streamUrl ?? tournamentStreamUrl, label: null }
      : null)

  return {
    ...match,
    streamUrl: streamUrl ?? tournamentStreamUrl,
    broadcast,
    tournament: {
      ...match.tournament,
      streamUrl: tournamentStreamUrl,
      broadcast: tournamentBroadcast,
    },
    disputeStatus,
    nextMatchLabel,
    participants: match.participants.map((participant) => ({
      ...participant,
      imageUrl:
        participant.imageUrl ??
        (participant.sourceId ? sourceImages.get(participant.sourceId) ?? null : null),
    })) as [MatchDetailParticipant, MatchDetailParticipant],
  }
}

function normalizeMatchRow(row: MatchRow): MatchDetail | null {
  const id = readStringId(row.id)
  if (!id) return null

  const tournament = readJoinedObject(row.tournament)
  if (!tournament) return null

  const participantType =
    readParticipantType(row.participant_type ?? tournament?.participant_type)
  const participant1 = normalizeParticipant({
    value: row.participant_1,
    fallbackId: readStringId(row.participant_1_id),
    fallbackName: readNullableString(row.team1),
    type: participantType,
  })
  const participant2 = normalizeParticipant({
    value: row.participant_2,
    fallbackId: readStringId(row.participant_2_id),
    fallbackName: readNullableString(row.team2),
    type: participantType,
  })

  return {
    id,
    tournament: {
      id: readStringId(row.tournament_id) ?? readStringId(tournament?.id),
      name: readNullableString(tournament?.name),
      game: getDisplayGameName(readNullableString(tournament?.game)),
      gameMode: readNullableString(tournament?.game_mode),
      participantType,
      format: readNullableString(tournament?.format),
      status: readNullableString(tournament?.status),
      streamUrl: null,
      broadcast: null,
    },
    participantType,
    participants: [participant1, participant2],
    status: readMatchStatus(row.status),
    scheduledAt: readNullableString(row.scheduled_at),
    timezone: readNullableString(row.timezone),
    scheduleNote: readNullableString(row.schedule_note),
    round: readNullableString(row.round),
    stage: readNullableString(row.bracket_round),
    bracketId: readStringId(row.bracket_id),
    bracketType: readNullableString(row.bracket_type),
    bracketStatus: readNullableString(row.bracket_status),
    bracketPosition: readNullableInteger(row.bracket_position),
    nextMatchId: readStringId(row.next_match_id),
    nextMatchLabel: null,
    score1: readNullableInteger(row.score1),
    score2: readNullableInteger(row.score2),
    winnerParticipantId: readStringId(row.winner_participant_id),
    streamUrl: null,
    broadcast: null,
    disputeStatus: "none",
    isIncomplete: !participant1.id || !participant2.id,
  }
}

function normalizeParticipant({
  value,
  fallbackId,
  fallbackName,
  type,
}: {
  value: unknown
  fallbackId: string | null
  fallbackName: string | null
  type: "team" | "player"
}): MatchDetailParticipant {
  const row = readJoinedObject(value)
  const id = readStringId(row?.id) ?? fallbackId
  const sourceId =
    type === "team"
      ? readStringId(row?.source_team_id)
      : readStringId(row?.source_player_id)
  const profileId = sourceId ?? id

  return {
    id,
    sourceId,
    type,
    name: readNullableString(row?.display_name) ?? fallbackName,
    imageUrl:
      type === "team"
        ? readNullableString(row?.logo_url)
        : readNullableString(row?.avatar_url),
    href: profileId ? `/${type === "team" ? "teams" : "players"}/${profileId}` : null,
  }
}

async function fetchSourceImages(type: "team" | "player", ids: string[]) {
  const images = new Map<string, string | null>()
  if (ids.length === 0) return images

  const table = type === "team" ? "teams" : "players"
  const column = type === "team" ? "logo_url" : "avatar_url"

  const { data, error } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .in("id", ids)

  if (error) {
    if (!isMissingColumnError(error)) {
      console.error("Failed to fetch match participant images:", error)
    }
    return images
  }

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>
    const id = readStringId(record.id)
    if (id) images.set(id, readNullableString(record[column]))
  }

  return images
}

async function fetchOptionalStreamUrl(table: "matches" | "tournaments", id: string) {
  const { data, error } = await supabase
    .from(table)
    .select("stream_url")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    if (!isMissingColumnError(error)) {
      console.error(`Failed to fetch optional ${table} stream URL:`, error)
    }
    return null
  }

  return readNullableString(data?.stream_url)
}

async function fetchOptionalBroadcast(
  table: "matches" | "tournaments",
  id: string,
): Promise<MatchBroadcast | null> {
  const { data, error } = await supabase
    .from(table)
    .select("broadcast_type, broadcast_url, broadcast_label")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    if (!isMissingColumnError(error)) {
      console.error(`Failed to fetch optional ${table} broadcast channel:`, error)
    }
    return null
  }

  const url = readNullableString(data?.broadcast_url)
  if (!url) return null

  return {
    type: readBroadcastType(data?.broadcast_type),
    url,
    label: readNullableString(data?.broadcast_label),
  }
}

function readBroadcastType(value: unknown): MatchBroadcastType {
  if (
    value === "twitch" ||
    value === "youtube" ||
    value === "kick" ||
    value === "discord" ||
    value === "other"
  ) {
    return value
  }

  return "other"
}

async function fetchPublicDisputeStatus(matchId: string): Promise<MatchDetail["disputeStatus"]> {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return "none"

  const { data, error } = await supabaseAdmin
    .from("match_disputes")
    .select("status, updated_at, created_at")
    .eq("match_id", matchId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (!isMissingDisputeStorageError(error)) {
      console.error("Failed to fetch public match dispute status:", error)
    }
    return "none"
  }

  return normalizeDisputeStatus(data?.status)
}

async function fetchNextMatchLabel(matchId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("round, bracket_round, bracket_position")
    .eq("id", matchId)
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch next match label:", error)
    return null
  }

  const label = readNullableString(data?.bracket_round) ?? readNullableString(data?.round)
  const position = readNullableInteger(data?.bracket_position)
  return [label, position ? `#${position}` : null].filter(Boolean).join(" ") || null
}

function normalizeDisputeStatus(value: unknown): MatchDetail["disputeStatus"] {
  if (
    value === "open" ||
    value === "under_review" ||
    value === "resolved" ||
    value === "rejected"
  ) {
    return value
  }

  return "none"
}

function readJoinedObject(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}

function isMissingDisputeStorageError(error: { code?: string }) {
  return error.code === "42P01" || isMissingColumnError(error)
}
