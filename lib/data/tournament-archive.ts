import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import type {
  PublicBracketData,
  PublicBracketLabels,
  PublicLeaderboardStanding,
  PublicBracketMatch,
  PublicBracketParticipant,
  PublicBracketRound,
  PublicRoundRobinStanding,
} from "@/components/public-bracket"
import { supabase } from "@/lib/supabase/client"
import { getDisplayGameName } from "@/lib/games"
import { getTournamentFormatLabel, normalizeTournamentFormat, type TournamentFormat } from "@/lib/tournament-formats"
import {
  readMatchStatus,
  readNullableInteger,
  readNullableString,
  readParticipantType,
  readStringArray,
  readStringId,
} from "@/lib/data/normalize"

export const PUBLIC_ARCHIVE_STATUSES = ["finished", "archived", "cancelled"] as const

export type ArchiveTournamentStatus = (typeof PUBLIC_ARCHIVE_STATUSES)[number]

export type TournamentArchiveFilters = {
  q?: string | null
  game?: string | null
  status?: string | null
}

export type ArchiveTournament = {
  id: string
  name: string
  game: string | null
  gameMode: string | null
  tournamentFormat: TournamentFormat
  status: ArchiveTournamentStatus
  eventDate: string | null
  createdAt: string | null
  participantType: "team" | "player"
  participantCount: number
  winner: string | null
  resultSummary: string | null
  bannerUrl: string | null
}

export type ArchiveParticipant = {
  id: string
  displayName: string
  participantType: "team" | "player"
  seed: number | null
  logoUrl: string | null
  avatarUrl: string | null
  sourceTeamId: string | null
  sourcePlayerId: string | null
}

export type ArchiveResult = {
  id: string
  team: string | null
  placement: number | null
  label: string | null
  mvp: string | null
  scoreline: string | null
  participantType: "team" | "player"
  participantId: string | null
  lobbyRound: number | null
  lobbyOrder: number | null
  kills: number | null
  points: number | null
}

export type ArchiveMatch = {
  id: string
  round: string | null
  bracketRound: string | null
  bracketPosition: number | null
  roundOrder: number | null
  matchOrder: number | null
  team1: string | null
  team2: string | null
  score1: number | null
  score2: number | null
  status: "upcoming" | "live" | "finished"
  participantType: "team" | "player"
  participant1Id: string | null
  participant2Id: string | null
  participant1ImageUrl: string | null
  participant2ImageUrl: string | null
  winnerParticipantId: string | null
  bracketId: string | null
  bracketStatus: string | null
  bracketType: string | null
  scheduledAt: string | null
  timezone: string | null
  scheduleNote: string | null
}

export type TournamentArchiveDetail = {
  tournament: ArchiveTournament & {
    format: string | null
    prizePool: string | null
    matchDays: number | null
    bannerUrl: string | null
    arenaTitle: string | null
    arenaDescription: string | null
    arenaTags: string[]
  }
  participants: ArchiveParticipant[]
  results: ArchiveResult[]
  matches: ArchiveMatch[]
  bracket: PublicBracketData | null
}

type TournamentRow = Record<string, unknown>

const TOURNAMENT_SELECT =
  "id, name, game, game_mode, participant_type, event_date, format, tournament_format, team_count, match_days, status, prize_pool, banner_url, arena_title, arena_description, arena_tags, bracket_title, bracket_subtitle, bracket_stage_label, bracket_participant_label, bracket_arena_label, created_at"

const PARTICIPANT_SELECT =
  "id, tournament_id, participant_type, display_name, seed, logo_url, avatar_url, source_team_id, source_player_id"

const MATCH_SELECT =
  "id, tournament_id, round, match_order, team1, team2, score1, score2, status, participant_type, participant_1_id, participant_2_id, participant_1:participants!matches_participant_1_id_fkey(id, display_name, participant_type, logo_url, avatar_url), participant_2:participants!matches_participant_2_id_fkey(id, display_name, participant_type, logo_url, avatar_url), winner_participant_id, bracket_id, bracket_type, bracket_status, round_order, bracket_round, bracket_position, scheduled_at, timezone, schedule_note"

const RESULT_SELECT =
  "id, tournament_id, team, placement, label, mvp, scoreline, participant_type, participant_id, lobby_round, lobby_order, kills, points"

export async function getTournamentArchiveList(
  filters: TournamentArchiveFilters = {},
): Promise<{
  tournaments: ArchiveTournament[]
  games: string[]
  statuses: ArchiveTournamentStatus[]
}> {
  noStore()

  if (!supabase) {
    console.warn("Skipping tournament archive query because Supabase is not configured.")
    return { tournaments: [], games: [], statuses: [] }
  }

  const rows = await fetchArchiveTournamentRows(filters)
  const tournamentIds = rows.map((row) => row.id).filter((id): id is string => Boolean(id))
  const [participants, results, matches] = await Promise.all([
    fetchParticipants(tournamentIds),
    fetchResults(tournamentIds),
    fetchMatches(tournamentIds),
  ])

  const participantCountByTournament = countByTournament(participants)
  const resultsByTournament = groupByTournament(results)
  const matchesByTournament = groupByTournament(matches)

  const tournaments = rows.map((row) => {
    const tournamentResults = resultsByTournament.get(row.id) ?? []
    const tournamentMatches = matchesByTournament.get(row.id) ?? []
    const winner = resolveWinner(tournamentResults, tournamentMatches)

    return {
      id: row.id,
      name: row.name,
      game: row.game,
      gameMode: row.gameMode,
      tournamentFormat: row.tournamentFormat,
      status: row.status,
      eventDate: row.eventDate,
      createdAt: row.createdAt,
      participantType: row.participantType,
      participantCount: participantCountByTournament.get(row.id) ?? 0,
      winner,
      resultSummary: createResultSummary(tournamentResults),
      bannerUrl: row.bannerUrl,
    } satisfies ArchiveTournament
  })

  return {
    tournaments,
    games: Array.from(new Set(rows.map((row) => row.game).filter(Boolean) as string[])).sort(),
    statuses: Array.from(new Set(rows.map((row) => row.status))),
  }
}

export async function getTournamentArchiveDetail(
  id: string,
): Promise<TournamentArchiveDetail | null> {
  noStore()

  if (!supabase) {
    console.warn("Skipping tournament archive detail query because Supabase is not configured.")
    return null
  }

  const tournament = await fetchArchiveTournamentById(id)
  if (!tournament) return null

  const [participants, results, matches] = await Promise.all([
    fetchParticipants([id]),
    fetchResults([id]),
    fetchMatches([id]),
  ])

  return {
    tournament: {
      ...tournament,
      participantCount: participants.length,
      winner: resolveWinner(results, matches),
      resultSummary: createResultSummary(results),
    },
    participants,
    results: [...results].sort(compareResults),
    matches: [...matches].sort(compareMatches),
    bracket: createPublicBracket(matches, tournament, results),
  }
}

async function fetchArchiveTournamentRows(filters: TournamentArchiveFilters) {
  let query = supabase
    .from("tournaments")
    .select(TOURNAMENT_SELECT)
    .in("status", [...PUBLIC_ARCHIVE_STATUSES])
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })

  const search = filters.q?.trim()
  const game = filters.game?.trim()
  const status = normalizeArchiveStatus(filters.status)

  if (search) query = query.ilike("name", `%${search}%`)
  if (game) query = query.eq("game", game)
  if (status) query = query.eq("status", status)

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch tournament archive list:", error)
    return []
  }

  return normalizeTournamentRows(data)
}

async function fetchArchiveTournamentById(id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select(TOURNAMENT_SELECT)
    .eq("id", id)
    .in("status", [...PUBLIC_ARCHIVE_STATUSES])
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch tournament archive detail:", error)
    return null
  }

  return data ? normalizeTournamentRow(data) : null
}

async function fetchParticipants(tournamentIds: string[]) {
  if (tournamentIds.length === 0) return []

  const { data, error } = await supabase
    .from("participants")
    .select(PARTICIPANT_SELECT)
    .in("tournament_id", tournamentIds)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true })

  if (error) {
    console.error("Failed to fetch archive participants:", error)
    return []
  }

  return (data ?? [])
    .map(normalizeParticipant)
    .filter((participant): participant is ArchiveParticipant & { tournamentId: string } => participant !== null)
}

async function fetchResults(tournamentIds: string[]) {
  if (tournamentIds.length === 0) return []

  const { data, error } = await supabase
    .from("results")
    .select(RESULT_SELECT)
    .in("tournament_id", tournamentIds)
    .order("placement", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("Failed to fetch archive results:", error)
    return []
  }

  return (data ?? [])
    .map(normalizeResult)
    .filter((result): result is ArchiveResult & { tournamentId: string } => result !== null)
}

async function fetchMatches(tournamentIds: string[]) {
  if (tournamentIds.length === 0) return []

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .in("tournament_id", tournamentIds)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("round_order", { ascending: true, nullsFirst: false })
    .order("bracket_position", { ascending: true, nullsFirst: false })
    .order("match_order", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("Failed to fetch archive matches:", error)
    return []
  }

  return (data ?? [])
    .map(normalizeMatch)
    .filter((match): match is ArchiveMatch & { tournamentId: string } => match !== null)
}

function normalizeTournamentRows(rows: TournamentRow[] | null) {
  return (rows ?? [])
    .map(normalizeTournamentRow)
    .filter((row): row is NonNullable<ReturnType<typeof normalizeTournamentRow>> => row !== null)
}

function normalizeTournamentRow(row: TournamentRow) {
  const id = readStringId(row.id)
  const name = readNullableString(row.name)
  const status = normalizeArchiveStatus(row.status)
  if (!id || !name || !status) return null

  return {
    id,
    name,
    game: getDisplayGameName(readNullableString(row.game)),
    gameMode: readNullableString(row.game_mode),
    tournamentFormat: normalizeTournamentFormat(row.tournament_format),
    status,
    eventDate: readNullableString(row.event_date),
    createdAt: readNullableString(row.created_at),
    participantType: readParticipantType(row.participant_type),
    participantCount: readNullableInteger(row.team_count) ?? 0,
    winner: null,
    resultSummary: null,
    format: readNullableString(row.format),
    prizePool: readNullableString(row.prize_pool),
    matchDays: readNullableInteger(row.match_days),
    arenaTitle: readNullableString(row.arena_title),
    arenaDescription: readNullableString(row.arena_description),
    bannerUrl: readNullableString(row.banner_url),
    arenaTags: readStringArray(row.arena_tags),
    bracketTitle: readNullableString(row.bracket_title),
    bracketSubtitle: readNullableString(row.bracket_subtitle),
    bracketStageLabel: readNullableString(row.bracket_stage_label),
    bracketParticipantLabel: readNullableString(row.bracket_participant_label),
    bracketArenaLabel: readNullableString(row.bracket_arena_label),
  }
}

function normalizeParticipant(row: Record<string, unknown>) {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const displayName = readNullableString(row.display_name)
  if (!id || !tournamentId || !displayName) return null

  return {
    id,
    tournamentId,
    displayName,
    participantType: readParticipantType(row.participant_type),
    seed: readNullableInteger(row.seed),
    logoUrl: readNullableString(row.logo_url),
    avatarUrl: readNullableString(row.avatar_url),
    sourceTeamId: readStringId(row.source_team_id),
    sourcePlayerId: readStringId(row.source_player_id),
  }
}

function normalizeResult(row: Record<string, unknown>) {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  if (!id || !tournamentId) return null

  return {
    id,
    tournamentId,
    team: readNullableString(row.team),
    placement: readNullableInteger(row.placement),
    label: readNullableString(row.label),
    mvp: readNullableString(row.mvp),
    scoreline: readNullableString(row.scoreline),
    participantType: readParticipantType(row.participant_type),
    participantId: readStringId(row.participant_id),
    lobbyRound: readNullableInteger(row.lobby_round),
    lobbyOrder: readNullableInteger(row.lobby_order),
    kills: readNullableInteger(row.kills),
    points: readNullableInteger(row.points),
  }
}

function normalizeMatch(row: Record<string, unknown>) {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  if (!id || !tournamentId) return null

  const participantType = readParticipantType(row.participant_type)
  const participant1 = readJoinedObject(row.participant_1)
  const participant2 = readJoinedObject(row.participant_2)

  return {
    id,
    tournamentId,
    round: readNullableString(row.round),
    bracketRound: readNullableString(row.bracket_round),
    bracketPosition: readNullableInteger(row.bracket_position),
    roundOrder: readNullableInteger(row.round_order),
    matchOrder: readNullableInteger(row.match_order),
    team1: readNullableString(participant1?.display_name) ?? readNullableString(row.team1),
    team2: readNullableString(participant2?.display_name) ?? readNullableString(row.team2),
    score1: readNullableInteger(row.score1),
    score2: readNullableInteger(row.score2),
    status: readMatchStatus(row.status),
    participantType,
    participant1Id: readStringId(row.participant_1_id),
    participant2Id: readStringId(row.participant_2_id),
    participant1ImageUrl: readParticipantImageUrl(participant1, participantType),
    participant2ImageUrl: readParticipantImageUrl(participant2, participantType),
    winnerParticipantId: readStringId(row.winner_participant_id),
    bracketId: readStringId(row.bracket_id),
    bracketStatus: readNullableString(row.bracket_status),
    bracketType: readNullableString(row.bracket_type),
    scheduledAt: readNullableString(row.scheduled_at),
    timezone: readNullableString(row.timezone),
    scheduleNote: readNullableString(row.schedule_note),
  }
}

function createPublicBracket(
  matches: ArchiveMatch[],
  tournament: NonNullable<ReturnType<typeof normalizeTournamentRow>>,
  results: ArchiveResult[] = [],
): PublicBracketData | null {
  const bracketMatches = matches.filter((match) => Boolean(match.bracketId))
  const sorted = [...bracketMatches].sort(compareMatches)
  const bracketId = sorted[0]?.bracketId
  if (!bracketId) return null

  const selected = sorted.filter((match) => match.bracketId === bracketId)
  const roundMap = new Map<number, ArchiveMatch[]>()

  for (const match of selected) {
    const order = match.roundOrder ?? Number.MAX_SAFE_INTEGER
    roundMap.set(order, [...(roundMap.get(order) ?? []), match])
  }

  const rounds: PublicBracketRound[] = Array.from(roundMap.entries())
    .sort(([left], [right]) => left - right)
    .map(([order, roundMatches]) => ({
      order,
      label:
        roundMatches.find((match) => match.bracketRound || match.round)?.bracketRound ??
        roundMatches.find((match) => match.round)?.round ??
        "Bracket",
      matches: [...roundMatches].sort(compareMatches).map(toPublicBracketMatch),
    }))

  const bracketType = selected.find((match) => match.bracketType)?.bracketType ?? tournament.tournamentFormat ?? null
  const isTableFormat = bracketType === "round_robin" || bracketType === "swiss" || bracketType === "groups_then_playoffs"
  const isLeaderboardFormat = bracketType === "battle_royale" || bracketType === "free_for_all"
  const standingsMatches = bracketType === "groups_then_playoffs"
    ? selected.filter((match) => isGroupRoundLabel(match.bracketRound ?? match.round))
    : selected

  return {
    id: bracketId,
    type: bracketType,
    formatLabel: getTournamentFormatLabel(bracketType ?? tournament.tournamentFormat),
    status: selected.find((match) => match.bracketStatus)?.bracketStatus ?? null,
    labels: getPublicBracketLabels(tournament),
    rounds,
    champion: isTableFormat || isLeaderboardFormat ? null : resolveWinner([], selected),
    standings: isTableFormat
      ? getArchiveRoundRobinStandings(standingsMatches, {
          includeGroups: bracketType === "groups_then_playoffs",
          includeBuchholz: bracketType === "swiss",
        })
      : undefined,
    leaderboard: isLeaderboardFormat ? getArchiveLeaderboardStandings(results) : undefined,
  }
}

function toPublicBracketMatch(match: ArchiveMatch): PublicBracketMatch {
  return {
    id: match.id,
    label: match.bracketRound ?? match.round ?? "Bracket match",
    position: match.bracketPosition ?? 0,
    status: match.status,
    participants: [
      toPublicBracketParticipant({
        id: match.participant1Id,
        name: match.team1,
        score: match.score1,
        winnerParticipantId: match.winnerParticipantId,
        imageUrl: match.participant1ImageUrl,
        kind: match.participantType,
      }),
      toPublicBracketParticipant({
        id: match.participant2Id,
        name: match.team2,
        score: match.score2,
        winnerParticipantId: match.winnerParticipantId,
        imageUrl: match.participant2ImageUrl,
        kind: match.participantType,
      }),
    ],
  }
}

function toPublicBracketParticipant({
  id,
  name,
  score,
  winnerParticipantId,
  imageUrl,
  kind,
}: {
  id: string | null
  name: string | null
  score: number | null
  winnerParticipantId: string | null
  imageUrl: string | null
  kind: "team" | "player"
}): PublicBracketParticipant {
  return {
    id,
    name: name ?? "TBD",
    score,
    isWinner: Boolean(id && id === winnerParticipantId),
    imageUrl,
    kind,
  }
}

function readParticipantImageUrl(
  participant: Record<string, unknown> | null,
  participantType: "team" | "player",
) {
  if (participantType === "team") {
    return readNullableString(participant?.logo_url) ?? readNullableString(participant?.avatar_url)
  }

  return readNullableString(participant?.avatar_url) ?? readNullableString(participant?.logo_url)
}

function getArchiveRoundRobinStandings(
  matches: ArchiveMatch[],
  options: { includeGroups?: boolean; includeBuchholz?: boolean } = {},
): PublicRoundRobinStanding[] {
  const table = new Map<string, PublicRoundRobinStanding>()
  const opponents = new Map<string, Set<string>>()

  const ensureRow = (participantId: string | null, name: string | null, groupLabel?: string | null) => {
    if (!participantId) return null
    const group = options.includeGroups ? parseGroupLabel(groupLabel) : null
    const key = group ? `${group.key}:${participantId}` : participantId
    const existing = table.get(key)
    if (existing) return existing

    const row: PublicRoundRobinStanding = {
      participantId,
      name: name ?? "TBD",
      groupKey: group?.key,
      groupLabel: group?.label,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      scoreDiff: 0,
      points: 0,
    }
    table.set(key, row)
    opponents.set(key, new Set())
    return row
  }

  for (const match of matches) {
    const left = ensureRow(match.participant1Id, match.team1, match.bracketRound ?? match.round)
    const right = ensureRow(match.participant2Id, match.team2, match.bracketRound ?? match.round)
    if (options.includeBuchholz && left && right) {
      opponents.get(getStandingKey(left))?.add(getStandingKey(right))
      opponents.get(getStandingKey(right))?.add(getStandingKey(left))
    }
    if (!left || !right || match.status !== "finished") continue
    if (match.score1 === null || match.score2 === null) continue

    left.played += 1
    right.played += 1
    left.pointsFor += match.score1
    left.pointsAgainst += match.score2
    right.pointsFor += match.score2
    right.pointsAgainst += match.score1
    left.scoreDiff = left.pointsFor - left.pointsAgainst
    right.scoreDiff = right.pointsFor - right.pointsAgainst

    const leftWon = match.winnerParticipantId === match.participant1Id || (!match.winnerParticipantId && match.score1 > match.score2)
    const rightWon = match.winnerParticipantId === match.participant2Id || (!match.winnerParticipantId && match.score2 > match.score1)

    if (leftWon && !rightWon) {
      left.wins += 1
      right.losses += 1
      left.points += 3
    } else if (rightWon && !leftWon) {
      right.wins += 1
      left.losses += 1
      right.points += 3
    } else {
      left.draws += 1
      right.draws += 1
      left.points += 1
      right.points += 1
    }
  }

  if (options.includeBuchholz) {
    for (const row of table.values()) {
      const rowOpponents = Array.from(opponents.get(getStandingKey(row)) ?? [])
        .map((key) => table.get(key))
        .filter(Boolean) as PublicRoundRobinStanding[]
      row.buchholz = rowOpponents.reduce((total, opponent) => total + opponent.points, 0)
      row.omw = rowOpponents.length
        ? rowOpponents.reduce((total, opponent) => total + (opponent.played > 0 ? opponent.wins / opponent.played : 0), 0) / rowOpponents.length
        : 0
    }
  }

  const sorted = Array.from(table.values()).sort((a, b) => {
    const groupCompare = (a.groupKey ?? "").localeCompare(b.groupKey ?? "")
    if (options.includeGroups && groupCompare !== 0) return groupCompare
    if (a.points !== b.points) return b.points - a.points
    if (a.scoreDiff !== b.scoreDiff) return b.scoreDiff - a.scoreDiff
    if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor
    if (a.wins !== b.wins) return b.wins - a.wins
    return a.name.localeCompare(b.name)
  })

  let currentGroup = ""
  let rank = 0
  return sorted.map((row) => {
    const groupKey = row.groupKey ?? ""
    rank = groupKey === currentGroup ? rank + 1 : 1
    currentGroup = groupKey
    return { ...row, rank }
  })
}

function getArchiveLeaderboardStandings(results: ArchiveResult[]): PublicLeaderboardStanding[] {
  const rows = new Map<string, PublicLeaderboardStanding>()

  for (const result of results) {
    if (!result.participantId && !result.team) continue
    const participantId = result.participantId ?? result.team ?? "participant"
    const existing = rows.get(participantId) ?? {
      participantId,
      name: result.team ?? result.label ?? "TBD",
      placement: null,
      played: 0,
      wins: 0,
      kills: 0,
      points: 0,
    }

    existing.played += 1
    existing.wins += result.placement === 1 ? 1 : 0
    existing.kills = (existing.kills ?? 0) + (result.kills ?? 0)
    existing.points += result.points ?? (result.placement ? Math.max(0, 21 - result.placement) + (result.kills ?? 0) : 0)
    rows.set(participantId, existing)
  }

  return Array.from(rows.values()).sort((left, right) => {
    if (left.points !== right.points) return right.points - left.points
    if (left.wins !== right.wins) return right.wins - left.wins
    if ((left.kills ?? 0) !== (right.kills ?? 0)) return (right.kills ?? 0) - (left.kills ?? 0)
    return left.name.localeCompare(right.name)
  }).map((row, index) => ({ ...row, placement: index + 1 }))
}

function parseGroupLabel(label: string | null | undefined) {
  if (!label) return null
  const match = /^(Group\s+([A-Z]+|\d+))\s+-\s+Round\s+\d+$/i.exec(label)
  if (!match) return null
  return { key: match[2].toUpperCase(), label: match[1] }
}

function isGroupRoundLabel(label: string | null | undefined) {
  return Boolean(parseGroupLabel(label))
}

function getStandingKey(row: Pick<PublicRoundRobinStanding, "participantId" | "groupKey">) {
  return row.groupKey ? `${row.groupKey}:${row.participantId}` : row.participantId
}

function getPublicBracketLabels(
  tournament: NonNullable<ReturnType<typeof normalizeTournamentRow>>,
): PublicBracketLabels {
  return {
    title: tournament.bracketTitle ?? "Live Bracket",
    subtitle: tournament.bracketSubtitle ?? "Tournament Tree",
    stageLabel: tournament.bracketStageLabel ?? "Grand Final",
    participantLabel: tournament.bracketParticipantLabel ?? "Finalist",
    arenaLabel: tournament.bracketArenaLabel ?? "Eclyps Arena",
  }
}

function resolveWinner(results: ArchiveResult[], matches: ArchiveMatch[]) {
  const placementWinner = [...results]
    .filter((result) => result.placement === 1 && result.team)
    .sort(compareResults)
    .at(0)?.team

  if (placementWinner) return placementWinner

  const finalMatch = [...matches]
    .filter((match) => match.status === "finished" && match.winnerParticipantId)
    .sort(compareMatches)
    .at(-1)

  if (!finalMatch?.winnerParticipantId) return null
  if (finalMatch.winnerParticipantId === finalMatch.participant1Id) return finalMatch.team1 ?? null
  if (finalMatch.winnerParticipantId === finalMatch.participant2Id) return finalMatch.team2 ?? null
  return null
}

function createResultSummary(results: ArchiveResult[]) {
  const top = [...results]
    .filter((result) => result.placement && result.team)
    .sort(compareResults)
    .slice(0, 3)

  if (top.length === 0) return null
  return top.map((result) => `#${result.placement} ${result.team}`).join(" | ")
}

function countByTournament(rows: Array<{ tournamentId: string }>) {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.tournamentId, (counts.get(row.tournamentId) ?? 0) + 1)
  return counts
}

function groupByTournament<T extends { tournamentId: string }>(rows: T[]) {
  const groups = new Map<string, T[]>()
  for (const row of rows) groups.set(row.tournamentId, [...(groups.get(row.tournamentId) ?? []), row])
  return groups
}

function compareResults(left: ArchiveResult, right: ArchiveResult) {
  return (left.placement ?? Number.MAX_SAFE_INTEGER) - (right.placement ?? Number.MAX_SAFE_INTEGER)
}

function compareMatches(left: ArchiveMatch, right: ArchiveMatch) {
  return (
    (left.roundOrder ?? Number.MAX_SAFE_INTEGER) -
      (right.roundOrder ?? Number.MAX_SAFE_INTEGER) ||
    (left.bracketPosition ?? Number.MAX_SAFE_INTEGER) -
      (right.bracketPosition ?? Number.MAX_SAFE_INTEGER) ||
    (left.matchOrder ?? Number.MAX_SAFE_INTEGER) -
      (right.matchOrder ?? Number.MAX_SAFE_INTEGER)
  )
}

function normalizeArchiveStatus(value: unknown): ArchiveTournamentStatus | null {
  return value === "finished" || value === "archived" || value === "cancelled"
    ? value
    : null
}

function readJoinedObject(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null
}
