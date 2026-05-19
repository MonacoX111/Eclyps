import { cache } from "react"
import { unstable_noStore as noStore } from "next/cache"
import type { MatchScheduleItem } from "@/components/match-schedule"
import type { ResultCard } from "@/components/results"
import type { TeamCard } from "@/components/teams-grid"
import { formatEventDate, formatEventMonthYear } from "@/lib/date-format"
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
import { normalizeRows } from "@/lib/data/query"

export type HomepageTournament = {
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

export type HomepageTeam = {
  id: string
  tournament_id: string
  name: string
  seed: number | null
  wins: number
  losses: number
}

export type HomepagePlayer = {
  id: string
  tournament_id: string
  name: string
  nickname: string | null
  seed: number | null
  wins: number
  losses: number
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
  winner_participant_id: string | null
  bracket_round: string | null
  bracket_position: number | null
  next_match_id: string | null
  next_match_slot: number | null
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
  matches: HomepageMatch[]
  results: HomepageResult[]
  participantType: "team" | "player"
  participantLabel: "Teams" | "Players"
  tournamentView: TournamentBlocksView | null
  participantCards: TeamCard[]
  matchScheduleItems: MatchScheduleItem[]
  resultCards: ResultCard[]
}

export const getHomepageData = cache(async (): Promise<HomepageData> => {
  noStore()

  const tournament = await fetchHomepageTournament()
  if (!tournament) {
    return createHomepageData({
      tournament: null,
      teams: [],
      players: [],
      matches: [],
      results: [],
    })
  }

  const [teams, players, matches, results] = await Promise.all([
    fetchHomepageTeams(tournament.id),
    fetchHomepagePlayers(tournament.id),
    fetchHomepageMatches(tournament.id),
    fetchHomepageResults(tournament.id),
  ])

  return createHomepageData({
    tournament,
    teams,
    players,
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

async function fetchHomepageTeams(tournamentId: string): Promise<HomepageTeam[]> {
  if (!supabase) {
    console.warn("Skipping homepage teams query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("teams")
      .select("id, tournament_id, name, seed, wins, losses")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Failed to fetch homepage teams:", error)
      return []
    }

    return normalizeRows(data, normalizeHomepageTeam)
  } catch (error) {
    console.error("Unexpected error while fetching homepage teams:", error)
    return []
  }
}

async function fetchHomepagePlayers(tournamentId: string): Promise<HomepagePlayer[]> {
  if (!supabase) {
    console.warn("Skipping homepage players query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("players")
      .select("id, tournament_id, name, nickname, seed, wins, losses")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Failed to fetch homepage players:", error)
      return []
    }

    return normalizeRows(data, normalizeHomepagePlayer)
  } catch (error) {
    console.error("Unexpected error while fetching homepage players:", error)
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
      .select("id, tournament_id, round, match_order, team1, team2, score1, score2, status, participant_type, participant_1_id, participant_2_id, winner_participant_id, bracket_round, bracket_position, next_match_id, next_match_slot")
      .eq("tournament_id", tournamentId)
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

function createHomepageData({
  tournament,
  teams,
  players,
  matches,
  results,
}: {
  tournament: HomepageTournament | null
  teams: HomepageTeam[]
  players: HomepagePlayer[]
  matches: HomepageMatch[]
  results: HomepageResult[]
}): HomepageData {
  const participantType = getParticipantType(matches, results)
  const participantLabel = participantType === "player" ? "Players" : "Teams"
  const participantCards =
    participantType === "player" ? getPlayerCards(players) : getTeamCards(teams)

  return {
    tournament,
    teams,
    players,
    matches,
    results,
    participantType,
    participantLabel,
    tournamentView: tournament
      ? getTournamentBlocksView(tournament, participantType, players.length)
      : null,
    participantCards,
    matchScheduleItems: getMatchScheduleItems(matches),
    resultCards: getResultCards(results, tournament),
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

function normalizeHomepageTeam(row: Record<string, unknown>): HomepageTeam | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)

  if (!id || !tournamentId || !name) {
    console.error("Skipping malformed homepage team row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    name,
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}

function normalizeHomepagePlayer(row: Record<string, unknown>): HomepagePlayer | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)

  if (!id || !tournamentId || !name) {
    console.error("Skipping malformed homepage player row:", row)
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
    team1: readNullableString(row.team1),
    team2: readNullableString(row.team2),
    score1: readNullableInteger(row.score1),
    score2: readNullableInteger(row.score2),
    status: readMatchStatus(row.status),
    participant_type: readParticipantType(row.participant_type),
    participant_1_id: readStringId(row.participant_1_id),
    participant_2_id: readStringId(row.participant_2_id),
    winner_participant_id: readStringId(row.winner_participant_id),
    bracket_round: readNullableString(row.bracket_round),
    bracket_position: readNullableInteger(row.bracket_position),
    next_match_id: readStringId(row.next_match_id),
    next_match_slot: readNullableInteger(row.next_match_slot),
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
  return error.code === "42703" || error.code === "PGRST204"
}

function getTournamentBlocksView(
  tournament: HomepageTournament,
  participantType: "team" | "player",
  playerCount: number,
): TournamentBlocksView {
  return {
    heroName: readString(tournament.name, tournament.title),
    sectionName: readString(tournament.name, tournament.display_name, tournament.title),
    date: formatEventDate(tournament.event_date),
    game: readString(tournament.game),
    format: readString(tournament.format),
    teamCount:
      participantType === "player"
        ? String(playerCount || readNumberString(tournament.team_count) || "0")
        : readNumberString(tournament.team_count),
    status: formatStatus(readString(tournament.status)),
    prizePool: formatPrizePool(tournament.prize_pool),
    matchDays: readNumberString(tournament.match_days),
    arenaTitle: readString(tournament.arena_title),
    arenaDescription: readString(tournament.arena_description),
    arenaTags: readOptionalStringArray(tournament.arena_tags),
    participantLabel: participantType === "player" ? "Players" : "Teams",
  }
}

function getTeamCards(teams: HomepageTeam[]): TeamCard[] {
  return teams.map((team, index) => ({
    id: team.id,
    name: team.name,
    tag: createTeamTag(team.name),
    wins: team.wins,
    losses: team.losses,
    rank: team.seed ?? index + 1,
  }))
}

function getPlayerCards(players: HomepagePlayer[]): TeamCard[] {
  return players.map((player, index) => ({
    id: player.id,
    name: player.name,
    tag: player.nickname || createTeamTag(player.name),
    wins: player.wins,
    losses: player.losses,
    rank: player.seed ?? index + 1,
  }))
}

function getParticipantType(
  matches: HomepageMatch[],
  results: HomepageResult[],
): "team" | "player" {
  return matches.some((match) => match.participant_type === "player") ||
    results.some((result) => result.participant_type === "player")
    ? "player"
    : "team"
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
      time: null,
      status: match.status,
      score1: match.score1,
      score2: match.score2,
    }))
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
    }))

  if (placements.length === 0) return []

  const season = readString(tournament?.name)
  if (!season) return []

  return [
    {
      season,
      placements,
      mvp: readString(results.find((result) => result.placement === 1)?.mvp),
      date: formatEventMonthYear(tournament?.event_date),
    },
  ]
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
