import type { TournamentMatch } from "@/lib/data/matches"
import {
  getWinnerSelectionFromParticipantId,
  resolveMatchWinner,
} from "@/lib/matches/core"
import { filterDuplicateBracketMatches } from "@/lib/stats/participants"

export const DEFAULT_ELO_RATING = 1000
export const DEFAULT_ELO_K_FACTOR = 32

export type RankingParticipant = {
  id: string
  displayName: string
  participantType: "team" | "player"
  startingRating?: number | null
}

export type RatingHistoryEntry = {
  matchId: string
  opponentId: string
  opponentName: string
  result: "win" | "loss"
  ratingBefore: number
  ratingAfter: number
  ratingChange: number
}

export type RankingRow = {
  participantId: string
  displayName: string
  participantType: "team" | "player"
  rating: number
  rankPosition: number
  matchesPlayed: number
  ratingHistory: RatingHistoryEntry[]
}

export type RankingTable = {
  participantType: "team" | "player"
  rows: RankingRow[]
}

type RatingState = {
  participant: RankingParticipant
  rating: number
  matchesPlayed: number
  ratingHistory: RatingHistoryEntry[]
}

type RateableMatch = {
  match: TournamentMatch
  winnerId: string
  loserId: string
  winnerName: string
  loserName: string
}

export function calculateEloRankings({
  participants,
  matches,
  participantType,
  kFactor = DEFAULT_ELO_K_FACTOR,
}: {
  participants: RankingParticipant[]
  matches: TournamentMatch[]
  participantType: "team" | "player"
  kFactor?: number
}): RankingTable {
  const states = new Map<string, RatingState>()

  participants
    .filter((participant) => participant.participantType === participantType)
    .forEach((participant) => {
      states.set(participant.id, {
        participant,
        rating: normalizeStartingRating(participant.startingRating),
        matchesPlayed: 0,
        ratingHistory: [],
      })
    })

  getRateableMatches(matches, participantType).forEach((match) => {
    const winner = getOrCreateState(states, {
      id: match.winnerId,
      displayName: match.winnerName,
      participantType,
    })
    const loser = getOrCreateState(states, {
      id: match.loserId,
      displayName: match.loserName,
      participantType,
    })
    const winnerBefore = winner.rating
    const loserBefore = loser.rating
    const winnerExpected = getExpectedScore(winnerBefore, loserBefore)
    const loserExpected = getExpectedScore(loserBefore, winnerBefore)
    const winnerChange = Math.round(kFactor * (1 - winnerExpected))
    const loserChange = Math.round(kFactor * (0 - loserExpected))

    winner.rating += winnerChange
    loser.rating += loserChange
    winner.matchesPlayed += 1
    loser.matchesPlayed += 1
    winner.ratingHistory.push({
      matchId: match.match.id,
      opponentId: loser.participant.id,
      opponentName: loser.participant.displayName,
      result: "win",
      ratingBefore: winnerBefore,
      ratingAfter: winner.rating,
      ratingChange: winnerChange,
    })
    loser.ratingHistory.push({
      matchId: match.match.id,
      opponentId: winner.participant.id,
      opponentName: winner.participant.displayName,
      result: "loss",
      ratingBefore: loserBefore,
      ratingAfter: loser.rating,
      ratingChange: loserChange,
    })
  })

  const rows = Array.from(states.values())
    .sort(compareRatingStates)
    .map((state, index) => ({
      participantId: state.participant.id,
      displayName: state.participant.displayName,
      participantType,
      rating: state.rating,
      rankPosition: index + 1,
      matchesPlayed: state.matchesPlayed,
      ratingHistory: [...state.ratingHistory].reverse(),
    }))

  return { participantType, rows }
}

export function getTopRankings(table: RankingTable, limit = 10) {
  return table.rows.slice(0, limit)
}

export function findRankingRow(
  table: RankingTable,
  participantId: string | null,
  displayName?: string | null,
) {
  const normalizedDisplayName = normalizeName(displayName)

  return (
    (participantId
      ? table.rows.find((row) => row.participantId === participantId)
      : null) ??
    table.rows.find((row) => normalizeName(row.displayName) === normalizedDisplayName) ??
    null
  )
}

function getRateableMatches(
  matches: TournamentMatch[],
  participantType: "team" | "player",
) {
  return filterDuplicateBracketMatches(matches)
    .filter((match) => match.status === "finished")
    .filter((match) => match.participant_type === participantType)
    .sort(compareMatchesOldestFirst)
    .map(resolveRateableMatch)
    .filter((match): match is RateableMatch => match !== null)
}

function resolveRateableMatch(match: TournamentMatch): RateableMatch | null {
  if (!match.participant_1_id || !match.participant_2_id) return null
  if (!match.team1 || !match.team2) return null

  const winnerResult = resolveMatchWinner({
    status: match.status,
    score1: match.score1,
    score2: match.score2,
    participant1Id: match.participant_1_id,
    participant2Id: match.participant_2_id,
    winnerSelection: getWinnerSelectionFromParticipantId({
      winnerParticipantId: match.winner_participant_id,
      participant1Id: match.participant_1_id,
      participant2Id: match.participant_2_id,
    }),
  })

  const winnerId = winnerResult.ok
    ? winnerResult.winnerParticipantId
    : match.winner_participant_id
  if (!winnerId) return null

  if (
    winnerId !== match.participant_1_id &&
    winnerId !== match.participant_2_id
  ) {
    return null
  }

  const loserId =
    winnerId === match.participant_1_id
      ? match.participant_2_id
      : match.participant_1_id

  return {
    match,
    winnerId,
    loserId,
    winnerName: winnerId === match.participant_1_id ? match.team1 : match.team2,
    loserName: winnerId === match.participant_1_id ? match.team2 : match.team1,
  }
}

function getOrCreateState(
  states: Map<string, RatingState>,
  participant: RankingParticipant,
) {
  const existingState = states.get(participant.id)
  if (existingState) return existingState

  const state = {
    participant,
    rating: normalizeStartingRating(participant.startingRating),
    matchesPlayed: 0,
    ratingHistory: [],
  }
  states.set(participant.id, state)

  return state
}

function getExpectedScore(rating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

function normalizeStartingRating(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_ELO_RATING
}

function compareRatingStates(left: RatingState, right: RatingState) {
  return (
    right.rating - left.rating ||
    right.matchesPlayed - left.matchesPlayed ||
    left.participant.displayName.localeCompare(right.participant.displayName)
  )
}

function compareMatchesOldestFirst(left: TournamentMatch, right: TournamentMatch) {
  return compareMatchDate(left, right) ||
    (left.match_order ?? 0) - (right.match_order ?? 0)
}

function compareMatchDate(left: TournamentMatch, right: TournamentMatch) {
  return getMatchTime(left) - getMatchTime(right)
}

function getMatchTime(match: TournamentMatch) {
  if (!match.scheduled_at) return 0

  const time = new Date(match.scheduled_at).getTime()
  return Number.isNaN(time) ? 0 : time
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}
