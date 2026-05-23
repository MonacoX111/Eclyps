import { cache } from "react"
import { unstable_noStore as noStore } from "next/cache"
import type { MatchScheduleItem } from "@/components/match-schedule"
import type {
  PublicBracketData,
  PublicBracketLabels,
  PublicBracketMatch,
  PublicBracketParticipant,
  PublicBracketRound,
} from "@/components/public-bracket"
import type { ResultCard } from "@/components/results"
import type { TeamCard } from "@/components/teams-grid"
import { formatEventDate, formatEventMonthYear } from "@/lib/date-format"
import { getLanguage } from "@/lib/i18n/server"
import { supabase } from "@/lib/supabase/client"
import {
  readMatchStatus,
  readNullableInteger,
  readNullableString,
  readNonNegativeInteger,
  readParticipantType,
  readPositiveInteger,
  readStringArray,
  readStringId,
} from "@/lib/data/normalize"
import {
  readParticipantReference,
  resolveParticipantName,
  type ParticipantReference,
} from "@/lib/data/participants"
import { normalizeRows } from "@/lib/data/query"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"
import {
  getTournamentRegistrationSummary,
  type TournamentRegistrationSummary,
} from "@/lib/data/registrations"

const BRACKET_FINAL_RESULT_NOTE_PREFIX = "synced:bracket-final:"

export type HomepageTournament = {
  id: string
  name: string | null
  title: string | null
  display_name: string | null
  game: string | null
  participant_type: "team" | "player" | null
  event_date: string | null
  format: string | null
  team_count: number | null
  match_days: number | null
  status: string | null
  prize_pool: string | number | null
  arena_title: string | null
  arena_description: string | null
  arena_tags: string[]
  bracket_title: string | null
  bracket_subtitle: string | null
  bracket_stage_label: string | null
  bracket_participant_label: string | null
  bracket_arena_label: string | null
  check_in_opens_at: string | null
  check_in_closes_at: string | null
  is_active: boolean
}

export type HomepageTeam = {
  id: string
  tournament_id: string | null
  name: string
  seed: number | null
  wins: number
  losses: number
  logo_url: string | null
}

export type HomepagePlayer = {
  id: string
  tournament_id: string | null
  name: string
  nickname: string | null
  real_name: string | null
  display_name: string
  seed: number | null
  wins: number
  losses: number
  owner_profile: HomepagePlayerOwnerProfile | null
}

export type HomepagePlayerOwnerProfile = {
  avatar_url: string | null
  discord_username: string | null
  display_name: string | null
}

export type HomepageParticipant = {
  id: string
  tournament_id: string
  participant_type: "team" | "player"
  display_name: string
  seed: number | null
  source_team_id: string | null
  source_player_id: string | null
}

export type HomepageMatch = {
  id: string
  tournament_id: string
  round: string | null
  match_order: number | null
  team1: string | null
  team2: string | null
  score1: number | null
  score2: number | null
  status: "upcoming" | "live" | "finished"
  participant_type: "team" | "player"
  participant_1_id: string | null
  participant_2_id: string | null
  participant_1: ParticipantReference | null
  participant_2: ParticipantReference | null
  winner_participant_id: string | null
  bracket_id: string | null
  bracket_type: string | null
  bracket_status: string | null
  round_order: number | null
  bracket_round: string | null
  bracket_position: number | null
  next_match_id: string | null
  next_match_slot: number | null
  scheduled_at: string | null
  timezone: string | null
  schedule_note: string | null
}

export type HomepageResult = {
  id: string
  tournament_id: string
  team: string | null
  placement: number | null
  label: string | null
  mvp: string | null
  scoreline: string | null
  note: string | null
  participant_type: "team" | "player"
  participant_id: string | null
}

export type TournamentBlocksView = {
  heroName?: string
  sectionName?: string
  date?: string
  game?: string
  format?: string
  teamCount?: string
  status?: string
  prizePool?: string
  matchDays?: string
  arenaTitle?: string
  arenaDescription?: string
  arenaTags?: string[]
  participantLabel: "Teams" | "Players"
}

export type HomepageData = {
  tournament: HomepageTournament | null
  teams: HomepageTeam[]
  players: HomepagePlayer[]
  participants: HomepageParticipant[]
  matches: HomepageMatch[]
  results: HomepageResult[]
  participantType: "team" | "player"
  participantLabel: "Teams" | "Players"
  tournamentView: TournamentBlocksView | null
  participantCards: TeamCard[]
  publicBracket: PublicBracketData | null
  matchScheduleItems: MatchScheduleItem[]
  resultCards: ResultCard[]
  registrationSummary: TournamentRegistrationSummary | null
}

export const getHomepageData = cache(async (): Promise<HomepageData> => {
  noStore()

  const tournament = await fetchHomepageTournament()
  if (!tournament) {
    return await createHomepageData({
      tournament: null,
      teams: [],
      players: [],
      participants: [],
      matches: [],
      results: [],
    })
  }

  const participants = await fetchHomepageParticipants(tournament.id)

  const sourceTeamIds = participants
    .map((p) => p.source_team_id)
    .filter((id): id is string => typeof id === "string")

  const sourcePlayerIds = participants
    .map((p) => p.source_player_id)
    .filter((id): id is string => typeof id === "string")

  const [teams, players, matches, results] = await Promise.all([
    fetchAllEclypsTeams(sourceTeamIds, tournament.id),
    fetchAllEclypsPlayers(sourcePlayerIds, tournament.id),
    fetchHomepageMatches(tournament.id),
    fetchHomepageResults(tournament.id),
  ])

  return await createHomepageData({
    tournament,
    teams,
    players,
    participants,
    matches,
    results,
  })
})

async function fetchHomepageTournament() {
  if (!supabase) {
    console.warn("Skipping homepage tournament query because Supabase is not configured.")
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
      console.error("Failed to fetch active homepage tournament:", error)
      return null
    }

    if (data) {
      return normalizeHomepageTournament(data)
    }

    const { data: fallbackTournament, error: fallbackError } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fallbackError) {
      console.error("Failed to fetch fallback homepage tournament:", fallbackError)
      return null
    }

    return fallbackTournament ? normalizeHomepageTournament(fallbackTournament) : null
  } catch (error) {
    console.error("Unexpected error while fetching homepage tournament:", error)
    return null
  }
}

async function fetchAllEclypsTeams(targetIds?: string[], tournamentId?: string): Promise<HomepageTeam[]> {
  if (!supabase) {
    console.warn("Skipping Eclyps teams query because Supabase is not configured.")
    return []
  }

  try {
    let query = supabase
      .from("teams")
      .select("id, tournament_id, name, seed, wins, losses, logo_url")

    if (targetIds && targetIds.length > 0) {
      if (tournamentId) {
        query = query.or(`id.in.(${targetIds.map((id) => `"${id}"`).join(",")}),tournament_id.eq.${tournamentId}`)
      } else {
        query = query.in("id", targetIds)
      }
    } else if (tournamentId) {
      query = query.eq("tournament_id", tournamentId)
    } else {
      return []
    }

    const { data, error } = await query.order("name", { ascending: true })

    if (error) {
      console.error("Failed to fetch all Eclyps teams:", error)
      return []
    }

    return normalizeRows(data, normalizeHomepageTeam)
  } catch (error) {
    console.error("Unexpected error while fetching all Eclyps teams:", error)
    return []
  }
}

async function fetchAllEclypsPlayers(targetIds?: string[], tournamentId?: string): Promise<HomepagePlayer[]> {
  if (!supabase) {
    console.warn("Skipping Eclyps players query because Supabase is not configured.")
    return []
  }

  try {
    let query = supabase
      .from("players")
      .select("id, tournament_id, name, nickname, seed, wins, losses, owner_profile:user_profiles!players_owner_user_id_fkey(avatar_url, discord_username, display_name)")

    if (targetIds && targetIds.length > 0) {
      if (tournamentId) {
        query = query.or(`id.in.(${targetIds.map((id) => `"${id}"`).join(",")}),tournament_id.eq.${tournamentId}`)
      } else {
        query = query.in("id", targetIds)
      }
    } else if (tournamentId) {
      query = query.eq("tournament_id", tournamentId)
    } else {
      return []
    }

    const { data, error } = await query
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })

    if (error) {
      console.error("Failed to fetch all Eclyps players:", error)
      return []
    }

    return normalizeRows(data, normalizeHomepagePlayer)
  } catch (error) {
    console.error("Unexpected error while fetching all Eclyps players:", error)
    return []
  }
}

async function fetchHomepageParticipants(
  tournamentId: string,
): Promise<HomepageParticipant[]> {
  if (!supabase) {
    console.warn("Skipping homepage participants query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("participants")
      .select("id, tournament_id, participant_type, display_name, seed, source_team_id, source_player_id")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true })

    if (error) {
      console.error("Failed to fetch homepage participants:", error)
      return []
    }

    return normalizeRows(data, normalizeHomepageParticipant)
  } catch (error) {
    console.error("Unexpected error while fetching homepage participants:", error)
    return []
  }
}

async function fetchHomepageMatches(tournamentId: string): Promise<HomepageMatch[]> {
  if (!supabase) {
    console.warn("Skipping homepage matches query because Supabase is not configured.")
    return []
  }

  try {
    const orderedResult = await supabase
      .from("matches")
      .select("id, tournament_id, round, match_order, team1, team2, score1, score2, status, participant_type, participant_1_id, participant_2_id, participant_1:participants!matches_participant_1_id_fkey(id, display_name, participant_type), participant_2:participants!matches_participant_2_id_fkey(id, display_name, participant_type), winner_participant_id, bracket_id, bracket_type, bracket_status, round_order, bracket_round, bracket_position, next_match_id, next_match_slot, scheduled_at, timezone, schedule_note")
      .eq("tournament_id", tournamentId)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("round_order", { ascending: true, nullsFirst: false })
      .order("bracket_position", { ascending: true, nullsFirst: false })
      .order("match_order", { ascending: true, nullsFirst: false })

    if (orderedResult.error && isMissingColumnError(orderedResult.error)) {
      console.warn(
        "New match participant columns are unavailable. Falling back to legacy homepage matches.",
      )

      const fallbackResult = await supabase
        .from("matches")
        .select("id, tournament_id, round, team1, team2, score1, score2, status, participant_type")
        .eq("tournament_id", tournamentId)

      return logAndReturnHomepageMatches(fallbackResult.data, fallbackResult.error)
    }

    return logAndReturnHomepageMatches(orderedResult.data, orderedResult.error)
  } catch (error) {
    console.error("Unexpected error while fetching homepage matches:", error)
    return []
  }
}

async function fetchHomepageResults(tournamentId: string): Promise<HomepageResult[]> {
  if (!supabase) {
    console.warn("Skipping homepage results query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("results")
      .select("id, tournament_id, team, placement, label, mvp, scoreline, note, participant_type, participant_id")
      .eq("tournament_id", tournamentId)
      .order("placement", { ascending: true, nullsFirst: false })

    if (error && isMissingColumnError(error)) {
      const fallbackResult = await supabase
        .from("results")
        .select("id, tournament_id, team, placement, label, mvp, scoreline, note, participant_type")
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true, nullsFirst: false })

      return logAndReturnHomepageResults(fallbackResult.data, fallbackResult.error)
    }

    if (error) {
      console.error("Failed to fetch homepage results:", error)
      return []
    }

    return normalizeRows(data, normalizeHomepageResult)
  } catch (error) {
    console.error("Unexpected error while fetching homepage results:", error)
    return []
  }
}

async function createHomepageData({
  tournament,
  teams,
  players,
  participants,
  matches,
  results,
}: {
  tournament: HomepageTournament | null
  teams: HomepageTeam[]
  players: HomepagePlayer[]
  participants: HomepageParticipant[]
  matches: HomepageMatch[]
  results: HomepageResult[]
}): Promise<HomepageData> {
  const lang = await getLanguage()
  const participantType =
    tournament?.participant_type ?? getParticipantType(participants, matches, results)
  const participantLabel = participantType === "player" ? "Players" : "Teams"
  const participantCards =
    participantType === "player"
      ? getPlayerCards(players, participants)
      : getTeamCards(teams, participants)
  const { bracketMatches, normalMatches } = splitHomepageMatches(matches)
  const tournamentParticipantCount = getTournamentParticipantCount(
    participants,
    participantType,
  )
  const registrationSummary = tournament
    ? await getTournamentRegistrationSummary({
        tournamentId: tournament.id,
        participantType,
        capacity: tournament.team_count,
        checkInOpensAt: tournament.check_in_opens_at,
        checkInClosesAt: tournament.check_in_closes_at,
        tournamentStatus: tournament.status,
      })
    : null

  return {
    tournament,
    teams,
    players,
    participants,
    matches,
    results,
    participantType,
    participantLabel,
    tournamentView: tournament
      ? getTournamentBlocksView(tournament, participantType, tournamentParticipantCount, lang)
      : null,
    participantCards,
    publicBracket: getPublicBracketData(bracketMatches, tournament),
    matchScheduleItems: getMatchScheduleItems(normalMatches),
    resultCards: getResultCards(results, tournament),
    registrationSummary,
  }
}

function normalizeHomepageTournament(
  row: Record<string, unknown>,
): HomepageTournament | null {
  const id = readStringId(row.id)
  if (!id) {
    console.error("Skipping malformed homepage tournament row without a valid id:", row)
    return null
  }

  return {
    id,
    name: readNullableString(row.name),
    title: readNullableString(row.title),
    display_name: readNullableString(row.display_name),
    game: readNullableString(row.game),
    participant_type: readTournamentParticipantType(row.participant_type),
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
    bracket_title: readNullableString(row.bracket_title),
    bracket_subtitle: readNullableString(row.bracket_subtitle),
    bracket_stage_label: readNullableString(row.bracket_stage_label),
    bracket_participant_label: readNullableString(row.bracket_participant_label),
    bracket_arena_label: readNullableString(row.bracket_arena_label),
    check_in_opens_at: readNullableString(row.check_in_opens_at),
    check_in_closes_at: readNullableString(row.check_in_closes_at),
    is_active: row.is_active === true,
  }
}

function readTournamentParticipantType(value: unknown): "team" | "player" | null {
  return value === "team" || value === "player" ? value : null
}

function normalizeHomepageTeam(row: Record<string, unknown>): HomepageTeam | null {
  const id = readStringId(row.id)
  const name = readNullableString(row.name)

  if (!id || !name) {
    console.error("Skipping malformed homepage team row:", row)
    return null
  }

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    name,
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
    logo_url: readNullableString(row.logo_url),
  }
}

function normalizeHomepagePlayer(row: Record<string, unknown>): HomepagePlayer | null {
  const id = readStringId(row.id)
  const name = readNullableString(row.name)
  const nickname = readNullableString(row.nickname)

  if (!id || !name) {
    console.error("Skipping malformed homepage player row:", row)
    return null
  }

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    name,
    nickname,
    real_name: name,
    display_name: getPlayerDisplayName(name, nickname),
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
    owner_profile: normalizeHomepagePlayerOwnerProfile(row.owner_profile),
  }
}

function normalizeHomepagePlayerOwnerProfile(
  value: unknown,
): HomepagePlayerOwnerProfile | null {
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

function normalizeHomepageParticipant(
  row: Record<string, unknown>,
): HomepageParticipant | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const displayName = readNullableString(row.display_name)

  if (!id || !tournamentId || !displayName) {
    console.error("Skipping malformed homepage participant row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    participant_type: readParticipantType(row.participant_type),
    display_name: displayName,
    seed: readNullableInteger(row.seed),
    source_team_id: readStringId(row.source_team_id),
    source_player_id: readStringId(row.source_player_id),
  }
}

function normalizeHomepageMatch(row: Record<string, unknown>): HomepageMatch | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)

  if (!id || !tournamentId) {
    console.error("Skipping malformed homepage match row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    round: readNullableString(row.round),
    match_order: readNullableInteger(row.match_order),
    team1: resolveParticipantName(
      readParticipantReference(row.participant_1, readParticipantType(row.participant_type)),
      readNullableString(row.team1),
    ),
    team2: resolveParticipantName(
      readParticipantReference(row.participant_2, readParticipantType(row.participant_type)),
      readNullableString(row.team2),
    ),
    score1: readNullableInteger(row.score1),
    score2: readNullableInteger(row.score2),
    status: readMatchStatus(row.status),
    participant_type: readParticipantType(row.participant_type),
    participant_1_id: readStringId(row.participant_1_id),
    participant_2_id: readStringId(row.participant_2_id),
    participant_1: readParticipantReference(row.participant_1, readParticipantType(row.participant_type)),
    participant_2: readParticipantReference(row.participant_2, readParticipantType(row.participant_type)),
    winner_participant_id: readStringId(row.winner_participant_id),
    bracket_id: readStringId(row.bracket_id),
    bracket_type: readNullableString(row.bracket_type),
    bracket_status: readNullableString(row.bracket_status),
    round_order: readNullableInteger(row.round_order),
    bracket_round: readNullableString(row.bracket_round),
    bracket_position: readNullableInteger(row.bracket_position),
    next_match_id: readStringId(row.next_match_id),
    next_match_slot: readNullableInteger(row.next_match_slot),
    scheduled_at: readNullableString(row.scheduled_at),
    timezone: readNullableString(row.timezone),
    schedule_note: readNullableString(row.schedule_note),
  }
}

function normalizeHomepageResult(row: Record<string, unknown>): HomepageResult | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)

  if (!id || !tournamentId) {
    console.error("Skipping malformed homepage result row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
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

function logAndReturnHomepageMatches(
  data: Record<string, unknown>[] | null,
  error: {
    message: string
    code: string
    details: string
    hint: string
  } | null,
) {
  if (error) {
    console.error("Failed to fetch homepage matches:", error)
    return []
  }

  return normalizeRows(data, normalizeHomepageMatch)
}

function logAndReturnHomepageResults(
  data: Record<string, unknown>[] | null,
  error: {
    message: string
    code: string
    details: string
    hint: string
  } | null,
) {
  if (error) {
    console.error("Failed to fetch homepage results:", error)
    return []
  }

  return normalizeRows(data, normalizeHomepageResult)
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}

function getTournamentBlocksView(
  tournament: HomepageTournament,
  participantType: "team" | "player",
  participantCount: number,
  lang: "uk" | "en",
): TournamentBlocksView {
  return {
    heroName: readString(tournament.name, tournament.title),
    sectionName: readString(tournament.name, tournament.display_name, tournament.title),
    date: formatEventDate(tournament.event_date, lang),
    game: readString(tournament.game),
    format: readString(tournament.format),
    teamCount: String(participantCount),
    status: formatStatus(readString(tournament.status)),
    prizePool: formatPrizePool(tournament.prize_pool),
    matchDays: readNumberString(tournament.match_days),
    arenaTitle: readString(tournament.arena_title),
    arenaDescription: readString(tournament.arena_description),
    arenaTags: readOptionalStringArray(tournament.arena_tags),
    participantLabel: participantType === "player" ? "Players" : "Teams",
  }
}

export function getTeamCards(
  teams: HomepageTeam[],
  participants: HomepageParticipant[],
): TeamCard[] {
  const teamParticipants = participants.filter((p) => p.participant_type === "team")
  const teamsById = new Map(teams.map((team) => [team.id, team]))

  return teamParticipants.map((participant, index) => {
    const team = participant.source_team_id
      ? teamsById.get(participant.source_team_id)
      : null
    const displayName = participant.display_name

    return {
      id: participant.id,
      name: displayName,
      tag: createTeamTag(displayName),
      wins: team?.wins ?? 0,
      losses: team?.losses ?? 0,
      rank: participant.seed ?? index + 1,
      profileHref: `/teams/${team?.id ?? participant.id}`,
      avatarUrl: team?.logo_url ?? null,
      avatarAlt: displayName,
    }
  })
}

export function getPlayerCards(
  players: HomepagePlayer[],
  participants: HomepageParticipant[],
): TeamCard[] {
  const playerParticipants = getPlayerParticipants(participants)

  const playersById = new Map(players.map((player) => [player.id, player]))

  return playerParticipants.map((participant, index) => {
    const player = participant.source_player_id
      ? playersById.get(participant.source_player_id)
      : null
    const displayName = participant.display_name

    return {
      id: participant.id,
      name: displayName,
      subtitle: getPlayerCardSubtitle({
        realName: player?.real_name ?? null,
        displayName,
        seed: participant.seed,
      }),
      tag: createTeamTag(displayName),
      wins: player?.wins ?? 0,
      losses: player?.losses ?? 0,
      rank: participant.seed ?? index + 1,
      profileHref: `/players/${player?.id ?? participant.id}`,
    }
  })
}

export function getAllPlayerCards(
  players: HomepagePlayer[],
  participants: HomepageParticipant[],
): TeamCard[] {
  const participantByPlayerId = new Map<string, HomepageParticipant>()
  for (const p of participants) {
    if (p.participant_type === "player" && p.source_player_id) {
      participantByPlayerId.set(p.source_player_id, p)
    }
  }

  return players.map((player, index) => {
    const participant = participantByPlayerId.get(player.id)
    const displayName = player.display_name || player.nickname || player.name
    const seed = participant?.seed ?? player.seed

    return {
      id: player.id,
      name: displayName,
      subtitle: getPlayerCardSubtitle({
        realName: player.real_name ?? player.name,
        displayName,
        seed,
      }),
      tag: createTeamTag(displayName),
      wins: player.wins,
      losses: player.losses,
      rank: seed ?? index + 1,
      profileHref: `/players/${player.id}`,
      avatarUrl: player.owner_profile?.avatar_url ?? null,
      avatarAlt:
        player.owner_profile?.discord_username ??
        player.owner_profile?.display_name ??
        displayName,
    }
  })
}


function getParticipantType(
  participants: HomepageParticipant[],
  matches: HomepageMatch[],
  results: HomepageResult[],
): "team" | "player" {
  return participants.some((participant) => participant.participant_type === "player") ||
    matches.some((match) => match.participant_type === "player") ||
    results.some((result) => result.participant_type === "player")
    ? "player"
    : "team"
}

function getTournamentParticipantCount(
  participants: HomepageParticipant[],
  participantType: "team" | "player",
) {
  return participants.filter(
    (participant) => participant.participant_type === participantType,
  ).length
}

function getPlayerParticipants(participants: HomepageParticipant[]) {
  return participants.filter((participant) => participant.participant_type === "player")
}

function getPlayerCardSubtitle({
  realName,
  displayName,
  seed,
}: {
  realName: string | null
  displayName: string
  seed: number | null
}) {
  if (realName && realName !== displayName) return realName

  return seed ? `Seed ${seed}` : "Player"
}

function splitHomepageMatches(matches: HomepageMatch[]) {
  return {
    bracketMatches: matches.filter((match) => Boolean(match.bracket_id)),
    normalMatches: matches.filter((match) => !match.bracket_id),
  }
}

function getMatchScheduleItems(matches: HomepageMatch[]): MatchScheduleItem[] {
  return matches
    .filter(
      (match): match is HomepageMatch & { team1: string; team2: string } =>
        Boolean(match.team1 && match.team2),
    )
    .map((match) => ({
      id: match.id,
      round: formatRoundLabel(match.round),
      teamA: match.team1,
      teamB: match.team2,
      time: formatMatchScheduleTime({
        scheduledAt: match.scheduled_at,
        timezone: match.timezone,
        scheduleNote: match.schedule_note,
      }),
      status: match.status,
      score1: match.score1,
      score2: match.score2,
      participant1Id: match.participant_1_id,
      participant2Id: match.participant_2_id,
    }))
}

function getPublicBracketData(
  bracketMatches: HomepageMatch[],
  tournament: HomepageTournament | null,
): PublicBracketData | null {
  const sortedBracketMatches = [...bracketMatches].sort(compareBracketMatches)

  if (sortedBracketMatches.length === 0) return null

  const bracketId = sortedBracketMatches[0]?.bracket_id
  if (!bracketId) return null

  const selectedBracketMatches = sortedBracketMatches.filter(
    (match) => match.bracket_id === bracketId,
  )

  if (selectedBracketMatches.length === 0) return null

  const roundMap = new Map<number, HomepageMatch[]>()

  selectedBracketMatches.forEach((match) => {
    const roundOrder = match.round_order ?? Number.MAX_SAFE_INTEGER
    roundMap.set(roundOrder, [...(roundMap.get(roundOrder) ?? []), match])
  })

  const rounds: PublicBracketRound[] = Array.from(roundMap.entries())
    .sort(([leftOrder], [rightOrder]) => leftOrder - rightOrder)
    .map(([order, roundMatches]) => {
      const sortedRoundMatches = [...roundMatches].sort(compareBracketMatches)
      const label =
        sortedRoundMatches.find((match) => match.bracket_round || match.round)
          ?.bracket_round ??
        sortedRoundMatches.find((match) => match.round)?.round ??
        "Bracket"

      return {
        order,
        label,
        matches: sortedRoundMatches.map(getPublicBracketMatch),
      }
    })

  return {
    id: bracketId,
    status: selectedBracketMatches.find((match) => match.bracket_status)?.bracket_status ?? null,
    labels: getPublicBracketLabels(tournament),
    rounds,
    champion: getBracketChampion(selectedBracketMatches),
  }
}

function getPublicBracketLabels(tournament: HomepageTournament | null): PublicBracketLabels {
  return {
    title: readString(tournament?.bracket_title) ?? "Live Bracket",
    subtitle: readString(tournament?.bracket_subtitle) ?? "Tournament Tree",
    stageLabel: readString(tournament?.bracket_stage_label) ?? "Grand Final",
    participantLabel: readString(tournament?.bracket_participant_label) ?? "Finalist",
    arenaLabel: readString(tournament?.bracket_arena_label) ?? "Eclyps Arena",
  }
}

function getPublicBracketMatch(match: HomepageMatch): PublicBracketMatch {
  return {
    id: match.id,
    label: match.bracket_round ?? match.round ?? "Bracket match",
    position: match.bracket_position ?? 0,
    status: match.status,
    participants: [
      getPublicBracketParticipant({
        participantId: match.participant_1_id,
        name: match.team1,
        score: match.score1,
        winnerParticipantId: match.winner_participant_id,
      }),
      getPublicBracketParticipant({
        participantId: match.participant_2_id,
        name: match.team2,
        score: match.score2,
        winnerParticipantId: match.winner_participant_id,
      }),
    ],
  }
}

function getPublicBracketParticipant({
  participantId,
  name,
  score,
  winnerParticipantId,
}: {
  participantId: string | null
  name: string | null
  score: number | null
  winnerParticipantId: string | null
}): PublicBracketParticipant {
  return {
    id: participantId,
    name: name ?? "TBD",
    score,
    isWinner: Boolean(participantId && participantId === winnerParticipantId),
  }
}

function getBracketChampion(matches: HomepageMatch[]) {
  const finalMatch = [...matches]
    .filter((match) => match.status === "finished" && match.winner_participant_id)
    .sort(compareBracketMatches)
    .at(-1)

  if (!finalMatch?.winner_participant_id) return null

  if (finalMatch.winner_participant_id === finalMatch.participant_1_id) {
    return finalMatch.team1 ?? "TBD"
  }

  if (finalMatch.winner_participant_id === finalMatch.participant_2_id) {
    return finalMatch.team2 ?? "TBD"
  }

  return null
}

function compareBracketMatches(left: HomepageMatch, right: HomepageMatch) {
  return (
    (left.round_order ?? Number.MAX_SAFE_INTEGER) -
      (right.round_order ?? Number.MAX_SAFE_INTEGER) ||
    (left.bracket_position ?? Number.MAX_SAFE_INTEGER) -
      (right.bracket_position ?? Number.MAX_SAFE_INTEGER) ||
    (left.match_order ?? Number.MAX_SAFE_INTEGER) -
      (right.match_order ?? Number.MAX_SAFE_INTEGER)
  )
}

function getResultCards(
  results: HomepageResult[],
  tournament: HomepageTournament | null,
): ResultCard[] {
  if (results.length === 0) {
    return []
  }

  const placements = results
    .filter(
      (result): result is HomepageResult & { placement: 1 | 2 | 3; team: string } =>
        (result.placement === 1 ||
          result.placement === 2 ||
          result.placement === 3) &&
        Boolean(result.team),
    )
    .map((result) => ({
      placement: result.placement,
      team: result.team,
      isBracketSynced: isBracketSyncedResult(result),
    }))

  if (placements.length === 0) return []
  const placementsByRank = new Map<
    1 | 2 | 3,
    { placement: 1 | 2 | 3; team: string; isBracketSynced: boolean }
  >()

  placements.forEach((placement) => {
    const existing = placementsByRank.get(placement.placement)
    if (!existing || (!existing.isBracketSynced && placement.isBracketSynced)) {
      placementsByRank.set(placement.placement, placement)
    }
  })

  const visiblePlacements = Array.from(placementsByRank.values())
    .sort((left, right) => left.placement - right.placement)
    .map(({ placement, team }) => ({ placement, team }))

  const season = readString(tournament?.name)
  if (!season) return []

  return [
    {
      season,
      placements: visiblePlacements,
      mvp: readString(results.find((result) => result.placement === 1)?.mvp),
      date: formatEventMonthYear(tournament?.event_date),
    },
  ]
}

function isBracketSyncedResult(result: HomepageResult) {
  return result.note?.startsWith(BRACKET_FINAL_RESULT_NOTE_PREFIX) ?? false
}

function createTeamTag(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase()
}

function getPlayerDisplayName(realName: string | null, nickname: string | null) {
  return nickname?.trim() || realName?.trim() || "Untitled player"
}

function formatRoundLabel(round: string | null) {
  if (!round) return "Matches"

  const normalized = round.toLowerCase()

  if (normalized === "quarterfinal") return "Quarterfinals"
  if (normalized === "semifinal") return "Semifinals"
  if (normalized === "final" || normalized === "grand final") return "Grand Final"

  return round
}

function readString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)
}

function readNumberString(...values: unknown[]) {
  const value = values.find(
    (candidate): candidate is number | string =>
      typeof candidate === "number" ||
      (typeof candidate === "string" && candidate.trim().length > 0),
  )

  return value === undefined ? undefined : String(value)
}

function readOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined

  const tags = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  )

  return tags.length > 0 ? tags : undefined
}

function formatStatus(status?: string) {
  if (!status) return undefined

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPrizePool(value: unknown) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return readString(value)
}
