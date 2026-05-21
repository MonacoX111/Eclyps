import type { TournamentMatch } from "@/lib/data/matches"
import {
  getWinnerSelectionFromParticipantId,
  resolveMatchWinner,
} from "@/lib/matches/core"

export type ParticipantStatsIdentity = {
  participantId: string | null
  displayName: string
  name: string
  nickname: string | null
}

export type ParticipantMatchHistoryItem = {
  id: string
  opponent: string
  result: "win" | "loss"
  scoreline: string | null
  round: string
}

export type ParticipantStats = {
  wins: number
  losses: number
  totalMatches: number
  winRate: number
  currentStreak: {
    result: "win" | "loss" | null
    count: number
  }
  recentHistory: ParticipantMatchHistoryItem[]
}

type ParticipantMatchResult = {
  match: TournamentMatch
  result: "win" | "loss"
  opponent: string
}

export function calculateParticipantStats({
  matches,
  identity,
}: {
  matches: TournamentMatch[]
  identity: ParticipantStatsIdentity
}): ParticipantStats {
  const finishedResults = filterDuplicateBracketMatches(matches)
    .filter((match) => match.status === "finished")
    .map((match) => getParticipantMatchResult(match, identity))
    .filter((result): result is ParticipantMatchResult => result !== null)
  const recentResults = [...finishedResults].sort(compareMatchesNewestFirst)
  const wins = finishedResults.filter((result) => result.result === "win").length
  const losses = finishedResults.length - wins
  const totalMatches = wins + losses

  return {
    wins,
    losses,
    totalMatches,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
    currentStreak: getCurrentStreak(recentResults),
    recentHistory: recentResults.slice(0, 5).map(toHistoryItem),
  }
}

export function filterDuplicateBracketMatches<TMatch extends TournamentMatch>(
  matches: TMatch[],
) {
  const normalMatchSignatures = new Set(
    matches
      .filter((match) => !isBracketMatch(match))
      .flatMap((match) => getMatchDuplicateSignatures(match)),
  )

  if (normalMatchSignatures.size === 0) return matches

  return matches.filter((match) => {
    if (!isBracketMatch(match)) return true

    return !getMatchDuplicateSignatures(match).some((signature) =>
      normalMatchSignatures.has(signature),
    )
  })
}

function getParticipantMatchResult(
  match: TournamentMatch,
  identity: ParticipantStatsIdentity,
): ParticipantMatchResult | null {
  const slot = getParticipantSlot(match, identity)
  if (!slot) return null

  const winnerParticipantId = resolveWinnerParticipantId(match)
  const result = winnerParticipantId
    ? slot.participantId && slot.participantId === winnerParticipantId
      ? "win"
      : "loss"
    : resolveResultFromScore(match, slot.slot)

  if (!result) return null

  return {
    match,
    result,
    opponent: slot.opponentName ?? "TBD",
  }
}

function resolveWinnerParticipantId(match: TournamentMatch) {
  if (match.winner_participant_id) return match.winner_participant_id

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

  return winnerResult.ok ? winnerResult.winnerParticipantId : null
}

function resolveResultFromScore(match: TournamentMatch, slot: 1 | 2) {
  if (match.score1 === null || match.score2 === null || match.score1 === match.score2) {
    return null
  }

  if (slot === 1) return match.score1 > match.score2 ? "win" : "loss"

  return match.score2 > match.score1 ? "win" : "loss"
}

function getParticipantSlot(
  match: TournamentMatch,
  identity: ParticipantStatsIdentity,
) {
  const names = createIdentityNames(identity)

  if (
    identity.participantId &&
    match.participant_1_id === identity.participantId
  ) {
    return {
      slot: 1 as const,
      participantId: match.participant_1_id,
      opponentName: match.team2,
    }
  }

  if (
    identity.participantId &&
    match.participant_2_id === identity.participantId
  ) {
    return {
      slot: 2 as const,
      participantId: match.participant_2_id,
      opponentName: match.team1,
    }
  }

  if (names.has(normalizeName(match.team1))) {
    return {
      slot: 1 as const,
      participantId: match.participant_1_id,
      opponentName: match.team2,
    }
  }

  if (names.has(normalizeName(match.team2))) {
    return {
      slot: 2 as const,
      participantId: match.participant_2_id,
      opponentName: match.team1,
    }
  }

  return null
}

function getCurrentStreak(results: ParticipantMatchResult[]) {
  const latest = results[0]
  if (!latest) return { result: null, count: 0 }

  let count = 0
  for (const result of results) {
    if (result.result !== latest.result) break
    count += 1
  }

  return {
    result: latest.result,
    count,
  }
}

function toHistoryItem(result: ParticipantMatchResult): ParticipantMatchHistoryItem {
  return {
    id: result.match.id,
    opponent: result.opponent,
    result: result.result,
    scoreline:
      result.match.score1 !== null && result.match.score2 !== null
        ? `${result.match.score1}-${result.match.score2}`
        : null,
    round: formatRoundLabel(result.match.round),
  }
}

function compareMatchesNewestFirst(
  left: ParticipantMatchResult,
  right: ParticipantMatchResult,
) {
  return compareMatchDate(right.match, left.match) ||
    (right.match.match_order ?? 0) - (left.match.match_order ?? 0)
}

function compareMatchDate(left: TournamentMatch, right: TournamentMatch) {
  return getMatchTime(left) - getMatchTime(right)
}

function getMatchTime(match: TournamentMatch) {
  if (!match.scheduled_at) return 0

  const time = new Date(match.scheduled_at).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isBracketMatch(match: TournamentMatch) {
  return Boolean(
    match.bracket_id ||
      match.bracket_type ||
      match.bracket_status ||
      match.bracket_round ||
      match.bracket_position !== null ||
      match.round_order !== null ||
      match.next_match_id ||
      match.next_match_slot !== null,
  )
}

function getMatchDuplicateSignatures(match: TournamentMatch) {
  const signatures: string[] = []
  const participantSignature = getUnorderedSignature(
    "participants",
    match.participant_1_id,
    match.participant_2_id,
  )
  const nameSignature = getUnorderedSignature(
    "names",
    normalizeName(match.team1),
    normalizeName(match.team2),
  )

  if (participantSignature) signatures.push(participantSignature)
  if (nameSignature) signatures.push(nameSignature)

  return signatures
}

function getUnorderedSignature(
  prefix: string,
  left: string | null | undefined,
  right: string | null | undefined,
) {
  if (!left || !right) return null

  return `${prefix}:${[left, right].sort().join("|")}`
}

function createIdentityNames(identity: ParticipantStatsIdentity) {
  return new Set(
    [identity.displayName, identity.name, identity.nickname]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeName(value)),
  )
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function formatRoundLabel(round: string | null) {
  if (!round) return "Matches"

  const normalized = round.toLowerCase()
  if (normalized === "quarterfinal") return "Quarterfinals"
  if (normalized === "semifinal") return "Semifinals"
  if (normalized === "final" || normalized === "grand final") return "Grand Final"

  return round
}
