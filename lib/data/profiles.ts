import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import type { MatchScheduleItem } from "@/components/match-schedule"
import type { ResultCard } from "@/components/results"
import { formatEventMonthYear } from "@/lib/date-format"
import { getMatchesForTournament, type TournamentMatch } from "@/lib/data/matches"
import {
  readNullableInteger,
  readNullableString,
  readNonNegativeInteger,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"
import { getResultsForTournament, type TournamentResult } from "@/lib/data/results"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"
import {
  calculateParticipantStats,
  filterDuplicateBracketMatches,
  type ParticipantStats,
} from "@/lib/stats/participants"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { supabase } from "@/lib/supabase/client"

export type PublicProfileKind = "team" | "player"

export type PublicProfileRecord = {
  id: string
  tournament_id: string
  kind: PublicProfileKind
  name: string
  display_name: string
  nickname: string | null
  region: string | null
  image_url: string | null
  seed: number | null
  wins: number
  losses: number
  participant_id: string | null
}

export type PublicProfileConnection = {
  id: string
  label: string
  href?: string
  meta?: string | null
}

export type PublicProfileData = {
  profile: PublicProfileRecord
  tournamentName: string | null
  connections: PublicProfileConnection[]
  stats: ParticipantStats
  matches: MatchScheduleItem[]
  results: ResultCard[]
}

type ProfileParticipant = {
  id: string
  tournament_id: string
  participant_type: PublicProfileKind
  display_name: string
  seed: number | null
  logo_url: string | null
  avatar_url: string | null
  source_team_id: string | null
  source_player_id: string | null
}

type ProfileTournament = {
  id: string
  name: string | null
  event_date: string | null
}

type ProfileTeam = {
  id: string
  tournament_id: string
  name: string
  seed: number | null
  wins: number
  losses: number
}

type ProfilePlayer = {
  id: string
  tournament_id: string
  name: string
  nickname: string | null
  region: string | null
  display_name: string
  seed: number | null
  wins: number
  losses: number
}

const PLAYER_SELECT_WITH_REGION =
  "id, tournament_id, name, nickname, region, seed, wins, losses"
const PLAYER_SELECT_FALLBACK =
  "id, tournament_id, name, nickname, seed, wins, losses"

export async function getPublicTeamProfile(
  id: string,
): Promise<PublicProfileData | null> {
  return getPublicProfile("team", id)
}

export async function getPublicPlayerProfile(
  id: string,
): Promise<PublicProfileData | null> {
  return getPublicProfile("player", id)
}

async function getPublicProfile(
  kind: PublicProfileKind,
  id: string,
): Promise<PublicProfileData | null> {
  noStore()

  if (!supabase) {
    console.warn("Skipping public profile query because Supabase is not configured.")
    return null
  }

  const participant = await findParticipant(kind, id)
  const sourceId =
    kind === "team" ? participant?.source_team_id : participant?.source_player_id

  const source =
    kind === "team"
      ? await findTeam(sourceId ?? id)
      : await findPlayerForProfile({
          id,
          participant,
          sourceId,
        })

  if (!source && !participant) return null

  const tournamentId = source?.tournament_id ?? participant?.tournament_id
  if (!tournamentId) return null

  const sourceParticipant =
    participant ??
    (source
      ? await findParticipantBySource(kind, source.id)
      : null)

  const [tournament, matches, results] = await Promise.all([
    findTournament(tournamentId),
    getMatchesForTournament(tournamentId),
    getResultsForTournament(tournamentId),
  ])

  const profile = toPublicProfileRecord({
    kind,
    participant: sourceParticipant,
    source,
  })

  return {
    profile,
    tournamentName: tournament?.name ?? null,
    connections: [],
    stats: calculateParticipantStats({
      matches,
      identity: {
        participantId: profile.participant_id,
        displayName: profile.display_name,
        name: profile.name,
        nickname: profile.nickname,
      },
    }),
    matches: getProfileMatches(matches, profile),
    results: getProfileResults(results, tournament, profile),
  }
}

async function findParticipant(kind: PublicProfileKind, id: string) {
  const byId = await findParticipantById(kind, id)
  if (byId) return byId

  return findParticipantBySource(kind, id)
}

async function findParticipantById(kind: PublicProfileKind, id: string) {
  try {
    const { data, error } = await supabase!
      .from("participants")
      .select("id, tournament_id, participant_type, display_name, seed, logo_url, avatar_url, source_team_id, source_player_id")
      .eq("id", id)
      .eq("participant_type", kind)
      .maybeSingle()

    if (error) {
      if (!isMissingRelationError(error)) {
        console.error("Failed to fetch public participant by id:", error)
      }
      return null
    }

    return data ? normalizeParticipant(data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public participant by id:", error)
    return null
  }
}

async function findParticipantBySource(kind: PublicProfileKind, id: string) {
  const sourceColumn = kind === "team" ? "source_team_id" : "source_player_id"

  try {
    const { data, error } = await supabase!
      .from("participants")
      .select("id, tournament_id, participant_type, display_name, seed, logo_url, avatar_url, source_team_id, source_player_id")
      .eq(sourceColumn, id)
      .eq("participant_type", kind)
      .maybeSingle()

    if (error) {
      if (!isMissingRelationError(error)) {
        console.error("Failed to fetch public participant by source:", error)
      }
      return null
    }

    return data ? normalizeParticipant(data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public participant by source:", error)
    return null
  }
}

async function findTeam(id: string | null): Promise<ProfileTeam | null> {
  if (!id) return null

  try {
    const { data, error } = await supabase!
      .from("teams")
      .select("id, tournament_id, name, seed, wins, losses")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Failed to fetch public team profile:", error)
      return null
    }

    return data ? normalizeTeam(data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public team profile:", error)
    return null
  }
}

async function findPlayer(id: string | null): Promise<ProfilePlayer | null> {
  if (!id) return null
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("players")
      .select(PLAYER_SELECT_WITH_REGION)
      .eq("id", id)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await profileClient
        .from("players")
        .select(PLAYER_SELECT_FALLBACK)
        .eq("id", id)
        .maybeSingle()

      if (fallbackResult.error) {
        console.error("Failed to fetch public player profile:", fallbackResult.error)
        return null
      }

      return fallbackResult.data ? normalizePlayer(fallbackResult.data) : null
    }

    if (result.error) {
      console.error("Failed to fetch public player profile:", result.error)
      return null
    }

    const player = result.data ? normalizePlayer(result.data) : null
    if (!player || player.region) return player

    const country = await findPlayerCountry(id)
    return country ? { ...player, region: country } : player
  } catch (error) {
    console.error("Unexpected error while fetching public player profile:", error)
    return null
  }
}

async function findPlayerForProfile({
  id,
  participant,
  sourceId,
}: {
  id: string
  participant: ProfileParticipant | null
  sourceId: string | null | undefined
}) {
  const sourcePlayer = await findPlayer(sourceId ?? null)
  if (sourcePlayer) return sourcePlayer

  const routePlayer = await findPlayer(id)
  if (routePlayer) return routePlayer

  return participant ? findPlayerByParticipant(participant) : null
}

async function findPlayerByParticipant(
  participant: ProfileParticipant,
): Promise<ProfilePlayer | null> {
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("players")
      .select(PLAYER_SELECT_WITH_REGION)
      .eq("tournament_id", participant.tournament_id)

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await profileClient
        .from("players")
        .select(PLAYER_SELECT_FALLBACK)
        .eq("tournament_id", participant.tournament_id)

      if (fallbackResult.error) {
        console.error("Failed to fetch public players by participant:", fallbackResult.error)
        return null
      }

      return resolvePlayerByParticipant(fallbackResult.data, participant)
    }

    if (result.error) {
      console.error("Failed to fetch public players by participant:", result.error)
      return null
    }

    const player = resolvePlayerByParticipant(result.data, participant)
    if (!player || player.region) return player

    const country = await findPlayerCountry(player.id)
    return country ? { ...player, region: country } : player
  } catch (error) {
    console.error("Unexpected error while fetching public players by participant:", error)
    return null
  }
}

async function findPlayerCountry(id: string) {
  const profileClient = createProfileReadClient()

  try {
    const { data, error } = await profileClient
      .from("players")
      .select("country")
      .eq("id", id)
      .maybeSingle()

    if (error) return null

    return readNullableString(data?.country)
  } catch {
    return null
  }
}

function createProfileReadClient() {
  return createSupabaseAdminClient() ?? supabase!
}

async function findTournament(id: string): Promise<ProfileTournament | null> {
  try {
    const { data, error } = await supabase!
      .from("tournaments")
      .select("id, name, event_date")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Failed to fetch public profile tournament:", error)
      return null
    }

    return data ? normalizeTournament(data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public profile tournament:", error)
    return null
  }
}

function toPublicProfileRecord({
  kind,
  participant,
  source,
}: {
  kind: PublicProfileKind
  participant: ProfileParticipant | null
  source: ProfileTeam | ProfilePlayer | null
}): PublicProfileRecord {
  const displayName =
    participant?.display_name ??
    (source && "display_name" in source ? source.display_name : source?.name) ??
    "Untitled profile"

  return {
    id: source?.id ?? participant?.id ?? "",
    tournament_id: source?.tournament_id ?? participant?.tournament_id ?? "",
    kind,
    name: source?.name ?? displayName,
    display_name: displayName,
    nickname: source && "nickname" in source ? source.nickname : null,
    region: source && "region" in source ? source.region : null,
    image_url:
      kind === "team"
        ? participant?.logo_url ?? participant?.avatar_url ?? null
        : participant?.avatar_url ?? participant?.logo_url ?? null,
    seed: participant?.seed ?? source?.seed ?? null,
    wins: source?.wins ?? 0,
    losses: source?.losses ?? 0,
    participant_id: participant?.id ?? null,
  }
}

function getProfileMatches(
  matches: TournamentMatch[],
  profile: PublicProfileRecord,
): MatchScheduleItem[] {
  const connectedMatches = matches.filter((match) =>
    isMatchConnectedToProfile(match, profile),
  )

  return filterDuplicateBracketMatches(connectedMatches)
    .slice(0, 6)
    .map((match) => ({
      id: match.id,
      round: formatRoundLabel(match.round),
      teamA: match.team1 ?? "TBD",
      teamB: match.team2 ?? "TBD",
      time: formatMatchScheduleTime({
        scheduledAt: match.scheduled_at,
        timezone: match.timezone,
        scheduleNote: match.schedule_note,
      }),
      status: match.status,
      score1: match.score1,
      score2: match.score2,
    }))
}

function getProfileResults(
  results: TournamentResult[],
  tournament: ProfileTournament | null,
  profile: PublicProfileRecord,
): ResultCard[] {
  const placements = results
    .filter((result) => isResultConnectedToProfile(result, profile))
    .filter(
      (result): result is TournamentResult & { placement: 1 | 2 | 3; team: string } =>
        (result.placement === 1 ||
          result.placement === 2 ||
          result.placement === 3) &&
        Boolean(result.team),
    )
    .map((result) => ({
      placement: result.placement,
      team: result.team,
    }))

  if (placements.length === 0) return []

  return [
    {
      season: tournament?.name ?? "Tournament result",
      placements,
      mvp: results.find((result) => result.placement === 1)?.mvp ?? null,
      date: formatEventMonthYear(tournament?.event_date),
    },
  ]
}

function isMatchConnectedToProfile(
  match: TournamentMatch,
  profile: PublicProfileRecord,
) {
  const participantId = profile.participant_id
  const names = new Set(
    [profile.display_name, profile.name, profile.nickname]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeName(value)),
  )

  return (
    (participantId &&
      (match.participant_1_id === participantId ||
        match.participant_2_id === participantId)) ||
    names.has(normalizeName(match.team1)) ||
    names.has(normalizeName(match.team2))
  )
}

function isResultConnectedToProfile(
  result: TournamentResult,
  profile: PublicProfileRecord,
) {
  const participantId = profile.participant_id
  const names = new Set(
    [profile.display_name, profile.name, profile.nickname]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeName(value)),
  )

  return (
    (participantId && result.participant_id === participantId) ||
    names.has(normalizeName(result.team))
  )
}

function resolvePlayerByParticipant(
  rows: Record<string, unknown>[] | null,
  participant: ProfileParticipant,
) {
  const players = (rows ?? [])
    .map(normalizePlayer)
    .filter((player): player is ProfilePlayer => player !== null)
  const participantName = normalizeName(participant.display_name)

  return (
    players.find((player) => normalizeName(player.nickname) === participantName) ??
    players.find((player) => normalizeName(player.name) === participantName) ??
    players.find((player) => normalizeName(player.display_name) === participantName) ??
    null
  )
}

function normalizeParticipant(
  row: Record<string, unknown>,
): ProfileParticipant | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const displayName = readNullableString(row.display_name)
  const participantType = readParticipantType(row.participant_type)

  if (!id || !tournamentId || !displayName) return null

  return {
    id,
    tournament_id: tournamentId,
    participant_type: participantType,
    display_name: displayName,
    seed: readNullableInteger(row.seed),
    logo_url: readNullableString(row.logo_url),
    avatar_url: readNullableString(row.avatar_url),
    source_team_id: readStringId(row.source_team_id),
    source_player_id: readStringId(row.source_player_id),
  }
}

function normalizeTeam(row: Record<string, unknown>): ProfileTeam | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)

  if (!id || !tournamentId || !name) return null

  return {
    id,
    tournament_id: tournamentId,
    name,
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}

function normalizePlayer(row: Record<string, unknown>): ProfilePlayer | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)
  const nickname = readNullableString(row.nickname)
  const region = readNullableString(row.region)

  if (!id || !tournamentId || !name) return null

  return {
    id,
    tournament_id: tournamentId,
    name,
    nickname,
    region,
    display_name: nickname ?? name,
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}

function normalizeTournament(row: Record<string, unknown>): ProfileTournament | null {
  const id = readStringId(row.id)
  if (!id) return null

  return {
    id,
    name: readNullableString(row.name),
    event_date: readNullableString(row.event_date),
  }
}

function formatRoundLabel(round: string | null) {
  if (!round) return "Matches"

  const normalized = round.toLowerCase()
  if (normalized === "quarterfinal") return "Quarterfinals"
  if (normalized === "semifinal") return "Semifinals"
  if (normalized === "final" || normalized === "grand final") return "Grand Final"

  return round
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function isMissingRelationError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200"
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204"
}
