import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { MatchScheduleItem } from "@/components/match-schedule"
import type { ResultCard } from "@/components/results"
import { formatEventMonthYear } from "@/lib/date-format"
import { getLanguage } from "@/lib/i18n/server"
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
  calculateEloRankings,
  findRankingRow,
  type RankingParticipant,
  type RankingRow,
} from "@/lib/rankings/elo"
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
  rating: number | null
  rating_matches_played: number | null
  rank_position: number | null
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
  ranking: RankingRow | null
  matches: MatchScheduleItem[]
  results: ResultCard[]
}

type ProfileParticipant = {
  id: string
  tournament_id: string
  participant_type: PublicProfileKind
  display_name: string
  region: string | null
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
  rating: number | null
  rating_matches_played: number | null
  rank_position: number | null
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
  rating: number | null
  rating_matches_played: number | null
  rank_position: number | null
  wins: number
  losses: number
  owner_profile: ProfilePlayerOwnerProfile | null
}

type ProfilePlayerOwnerProfile = {
  avatar_url: string | null
  discord_username: string | null
  display_name: string | null
}

const PLAYER_SELECT_WITH_REGION =
  "id, tournament_id, name, nickname, region, seed, rating, rating_matches_played, rank_position, wins, losses, owner_profile:user_profiles!players_owner_user_id_fkey(avatar_url, discord_username, display_name)"
const PLAYER_SELECT_WITH_REGION_NO_RATING =
  "id, tournament_id, name, nickname, region, seed, wins, losses, owner_profile:user_profiles!players_owner_user_id_fkey(avatar_url, discord_username, display_name)"
const PLAYER_SELECT_FALLBACK =
  "id, tournament_id, name, nickname, seed, wins, losses"
const TEAM_SELECT_WITH_RATING =
  "id, tournament_id, name, seed, rating, rating_matches_played, rank_position, wins, losses"
const TEAM_SELECT_FALLBACK = "id, tournament_id, name, seed, wins, losses"
const PARTICIPANT_SELECT_WITH_REGION =
  "id, tournament_id, participant_type, display_name, region, seed, logo_url, avatar_url, source_team_id, source_player_id"
const PARTICIPANT_SELECT_FALLBACK =
  "id, tournament_id, participant_type, display_name, seed, logo_url, avatar_url, source_team_id, source_player_id"

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

  const routePlayer = kind === "player" ? await findPlayer(id) : null
  const participant = routePlayer ? null : await findParticipant(kind, id)
  const sourceId =
    kind === "team" ? participant?.source_team_id : participant?.source_player_id

  const source =
    kind === "team"
      ? await findTeam(sourceId ?? id)
      : routePlayer ??
        await findPlayerForProfile({
          id,
          participant,
          sourceId,
        })

  if (!source && !participant) return null

  const sourceParticipant =
    participant ??
    (source
      ? await findParticipantBySource(kind, source.id)
      : null)
  const tournamentId = sourceParticipant?.tournament_id ?? (kind === "team" ? source?.tournament_id : null)

  const [tournament, matches, results, rankingParticipants] = tournamentId
    ? await Promise.all([
        findTournament(tournamentId),
        getMatchesForTournament(tournamentId),
        getResultsForTournament(tournamentId),
        fetchRankingParticipants(tournamentId, kind),
      ])
    : [null, [], [], []]

  const lang = await getLanguage()

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
    ranking: findRankingRow(
      calculateEloRankings({
        participants: rankingParticipants,
        matches,
        participantType: kind,
      }),
      profile.participant_id,
      profile.display_name,
    ),
    matches: getProfileMatches(matches, profile),
    results: getProfileResults(results, tournament, profile, lang),
  }
}

async function findParticipant(kind: PublicProfileKind, id: string) {
  const byId = await findParticipantById(kind, id)
  if (byId) return byId

  return findParticipantBySource(kind, id)
}

async function findParticipantById(kind: PublicProfileKind, id: string) {
  try {
    const result = await supabase!
      .from("participants")
      .select(PARTICIPANT_SELECT_WITH_REGION)
      .eq("id", id)
      .eq("participant_type", kind)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await supabase!
        .from("participants")
        .select(PARTICIPANT_SELECT_FALLBACK)
        .eq("id", id)
        .eq("participant_type", kind)
        .maybeSingle()

      if (fallbackResult.error) {
        if (!isMissingRelationError(fallbackResult.error)) {
          console.error("Failed to fetch public participant by id:", fallbackResult.error)
        }
        return null
      }

      return fallbackResult.data ? normalizeParticipant(fallbackResult.data) : null
    }

    if (result.error) {
      if (!isMissingRelationError(result.error)) {
        console.error("Failed to fetch public participant by id:", result.error)
      }
      return null
    }

    return result.data ? normalizeParticipant(result.data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public participant by id:", error)
    return null
  }
}

async function findParticipantBySource(kind: PublicProfileKind, id: string) {
  const sourceColumn = kind === "team" ? "source_team_id" : "source_player_id"

  try {
    const result = await supabase!
      .from("participants")
      .select(PARTICIPANT_SELECT_WITH_REGION)
      .eq(sourceColumn, id)
      .eq("participant_type", kind)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await supabase!
        .from("participants")
        .select(PARTICIPANT_SELECT_FALLBACK)
        .eq(sourceColumn, id)
        .eq("participant_type", kind)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallbackResult.error) {
        if (!isMissingRelationError(fallbackResult.error)) {
          console.error("Failed to fetch public participant by source:", fallbackResult.error)
        }
        return null
      }

      return fallbackResult.data ? normalizeParticipant(fallbackResult.data) : null
    }

    if (result.error) {
      if (!isMissingRelationError(result.error)) {
        console.error("Failed to fetch public participant by source:", result.error)
      }
      return null
    }

    return result.data ? normalizeParticipant(result.data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public participant by source:", error)
    return null
  }
}

async function findTeam(id: string | null): Promise<ProfileTeam | null> {
  if (!id) return null
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("teams")
      .select(TEAM_SELECT_WITH_RATING)
      .eq("id", id)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await profileClient
        .from("teams")
        .select(TEAM_SELECT_FALLBACK)
        .eq("id", id)
        .maybeSingle()

      if (fallbackResult.error) {
        console.error("Failed to fetch public team profile:", fallbackResult.error)
        return null
      }

      return fallbackResult.data ? normalizeTeam(fallbackResult.data) : null
    }

    if (result.error) {
      console.error("Failed to fetch public team profile:", result.error)
      return null
    }

    return result.data ? normalizeTeam(result.data) : null
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
      return findPlayerWithFallbackSelect(profileClient, id)
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

async function findPlayerWithFallbackSelect(
  profileClient: SupabaseClient,
  id: string,
): Promise<ProfilePlayer | null> {
  const result = await profileClient
    .from("players")
    .select(PLAYER_SELECT_WITH_REGION_NO_RATING)
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

    const player = fallbackResult.data ? normalizePlayer(fallbackResult.data) : null
    if (!player || player.region) return player

    const country = await findPlayerCountry(id)
    return country ? { ...player, region: country } : player
  }

  if (result.error) {
    console.error("Failed to fetch public player profile:", result.error)
    return null
  }

  const player = result.data ? normalizePlayer(result.data) : null
  if (!player || player.region) return player

  const country = await findPlayerCountry(id)
  return country ? { ...player, region: country } : player
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
      return findPlayerByParticipantWithFallbackSelect(
        profileClient,
        participant,
      )
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

async function findPlayerByParticipantWithFallbackSelect(
  profileClient: SupabaseClient,
  participant: ProfileParticipant,
): Promise<ProfilePlayer | null> {
  const result = await profileClient
    .from("players")
    .select(PLAYER_SELECT_WITH_REGION_NO_RATING)
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

    const player = resolvePlayerByParticipant(fallbackResult.data, participant)
    if (!player || player.region) return player

    const country = await findPlayerCountry(player.id)
    return country ? { ...player, region: country } : player
  }

  if (result.error) {
    console.error("Failed to fetch public players by participant:", result.error)
    return null
  }

  const player = resolvePlayerByParticipant(result.data, participant)
  if (!player || player.region) return player

  const country = await findPlayerCountry(player.id)
  return country ? { ...player, region: country } : player
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
    region: source && "region" in source ? source.region ?? participant?.region ?? null : participant?.region ?? null,
    image_url:
      kind === "team"
        ? participant?.logo_url ?? participant?.avatar_url ?? null
        : source && "owner_profile" in source
          ? source.owner_profile?.avatar_url ?? participant?.avatar_url ?? participant?.logo_url ?? null
          : participant?.avatar_url ?? participant?.logo_url ?? null,
    seed: participant?.seed ?? source?.seed ?? null,
    rating: source?.rating ?? null,
    rating_matches_played: source?.rating_matches_played ?? null,
    rank_position: source?.rank_position ?? null,
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
  lang?: "uk" | "en",
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
      date: formatEventMonthYear(tournament?.event_date, lang),
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

async function fetchRankingParticipants(
  tournamentId: string,
  kind: PublicProfileKind,
): Promise<RankingParticipant[]> {
  try {
    const result = await supabase!
      .from("participants")
      .select(PARTICIPANT_SELECT_WITH_REGION)
      .eq("tournament_id", tournamentId)
      .eq("participant_type", kind)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true })

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await supabase!
        .from("participants")
        .select(PARTICIPANT_SELECT_FALLBACK)
        .eq("tournament_id", tournamentId)
        .eq("participant_type", kind)
        .order("seed", { ascending: true, nullsFirst: false })
        .order("display_name", { ascending: true })

      if (fallbackResult.error) {
        console.error("Failed to fetch ranking participants:", fallbackResult.error)
        return []
      }

      return createRankingParticipants(fallbackResult.data, kind)
    }

    if (result.error) {
      console.error("Failed to fetch ranking participants:", result.error)
      return []
    }

    return createRankingParticipants(result.data, kind)
  } catch (error) {
    console.error("Unexpected error while fetching ranking participants:", error)
    return []
  }
}

async function createRankingParticipants(
  rows: Record<string, unknown>[] | null,
  kind: PublicProfileKind,
) {
  const participants = (rows ?? [])
    .map(normalizeParticipant)
    .filter((participant): participant is ProfileParticipant => participant !== null)
  const startingRatings = await fetchParticipantStartingRatings(participants, kind)

  return participants.map((participant) => ({
    id: participant.id,
    displayName: participant.display_name,
    participantType: kind,
    startingRating: startingRatings.get(participant.id) ?? null,
  }))
}

async function fetchParticipantStartingRatings(
  participants: ProfileParticipant[],
  kind: PublicProfileKind,
) {
  const sourceIds = participants
    .map((participant) =>
      kind === "team" ? participant.source_team_id : participant.source_player_id,
    )
    .filter((id): id is string => Boolean(id))

  if (sourceIds.length === 0) return new Map<string, number>()

  const ratingsBySourceId =
    kind === "team"
      ? await fetchTeamRatings(sourceIds)
      : await fetchPlayerRatings(sourceIds)

  return new Map(
    participants
      .map((participant) => {
        const sourceId =
          kind === "team" ? participant.source_team_id : participant.source_player_id
        const rating = sourceId ? ratingsBySourceId.get(sourceId) : null

        return rating ? ([participant.id, rating] as const) : null
      })
      .filter((entry): entry is readonly [string, number] => entry !== null),
  )
}

async function fetchTeamRatings(ids: string[]) {
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("teams")
      .select("id, rating")
      .in("id", ids)

    if (result.error && isMissingColumnError(result.error)) {
      return new Map<string, number>()
    }

    if (result.error) {
      console.error("Failed to fetch team ratings:", result.error)
      return new Map<string, number>()
    }

    return readRatingMap(result.data)
  } catch (error) {
    console.error("Unexpected error while fetching team ratings:", error)
    return new Map<string, number>()
  }
}

async function fetchPlayerRatings(ids: string[]) {
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("players")
      .select("id, rating")
      .in("id", ids)

    if (result.error && isMissingColumnError(result.error)) {
      return new Map<string, number>()
    }

    if (result.error) {
      console.error("Failed to fetch player ratings:", result.error)
      return new Map<string, number>()
    }

    return readRatingMap(result.data)
  } catch (error) {
    console.error("Unexpected error while fetching player ratings:", error)
    return new Map<string, number>()
  }
}

function readRatingMap(rows: Record<string, unknown>[] | null) {
  return new Map(
    (rows ?? [])
      .map((row) => {
        const id = readStringId(row.id)
        const rating = readNullableInteger(row.rating)

        return id && rating ? ([id, rating] as const) : null
      })
      .filter((entry): entry is readonly [string, number] => entry !== null),
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
    region: readNullableString(row.region),
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
    rating: readNullableInteger(row.rating),
    rating_matches_played: readNullableInteger(row.rating_matches_played),
    rank_position: readNullableInteger(row.rank_position),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}

function normalizePlayerOwnerProfile(
  value: unknown,
): ProfilePlayerOwnerProfile | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null

  const record = row as Record<string, unknown>
  const avatarUrl = readNullableString(record.avatar_url)
  const discordUsername = readNullableString(record.discord_username)
  const displayName = readNullableString(record.display_name)

  if (!avatarUrl && !discordUsername && !displayName) return null

  return {
    avatar_url: avatarUrl,
    discord_username: discordUsername,
    display_name: displayName,
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
    rating: readNullableInteger(row.rating),
    rating_matches_played: readNullableInteger(row.rating_matches_played),
    rank_position: readNullableInteger(row.rank_position),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
    owner_profile: normalizePlayerOwnerProfile(row.owner_profile),
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
