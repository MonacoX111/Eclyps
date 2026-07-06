import { randomUUID } from "node:crypto"
import { orderParticipants, type SeedableParticipant } from "@/lib/brackets/seeding"
import type { TournamentFormatConfig } from "@/lib/tournament-formats"
import type {
  GeneratedTournamentMatch,
  ParticipantType,
  TournamentEngine,
  TournamentEngineResult,
  TournamentSeededRequest,
  TournamentSeededStructure,
  TournamentTemplateRequest,
  TournamentTemplateStructure,
} from "@/lib/tournament-engine/types"

const SWISS_BRACKET_TYPE = "swiss"
const BRACKET_STATUS_TEMPLATE = "template"
const DEFAULT_POINTS_WIN = 3
const DEFAULT_POINTS_DRAW = 1
const DEFAULT_POINTS_LOSS = 0

type SwissParticipant = SeedableParticipant

export type SwissMatchRecord = {
  id?: string
  tournament_id?: string
  round?: string | null
  match_order?: number | null
  team1?: string | null
  team2?: string | null
  score1?: number | null
  score2?: number | null
  status: "upcoming" | "live" | "finished"
  participant_type?: ParticipantType
  participant_1_id: string | null
  participant_2_id: string | null
  winner_participant_id?: string | null
  bracket_id?: string | null
  bracket_type?: string | null
  bracket_status?: string | null
  round_order?: number | null
  bracket_round?: string | null
  bracket_position?: number | null
  next_match_id?: string | null
  next_match_slot?: number | null
  loser_next_match_id?: string | null
  loser_next_match_slot?: number | null
}

export type SwissStanding = {
  participantId: string
  name: string
  seed: number | null
  played: number
  wins: number
  losses: number
  draws: number
  points: number
  buchholz: number
  omw: number
  hadBye: boolean
}

export type GenerateNextSwissRoundRequest = {
  tournamentId: string
  participants: SwissParticipant[]
  matches: SwissMatchRecord[]
  startingMatchOrder: number
  participantType: ParticipantType
  config?: TournamentFormatConfig
  bracketId?: string | null
}

export type GenerateNextSwissRoundResult = {
  bracketId: string
  roundOrder: number
  matches: GeneratedTournamentMatch[]
  standings: SwissStanding[]
  isFinalRound: boolean
}

export const swissEngine: TournamentEngine = {
  format: "swiss",
  createTemplate(_request: TournamentTemplateRequest): TournamentEngineResult<TournamentTemplateStructure> {
    return { ok: false, error: "unsupported-tournament-format" }
  },
  generateSeeded(request: TournamentSeededRequest): TournamentEngineResult<TournamentSeededStructure> {
    if (request.participants.length < 4) {
      return { ok: false, error: "not-enough-participants" }
    }

    const bracketId = randomUUID()
    const ordered = orderParticipants(request.participants, request.seedMethod)
    const paired = pairFirstSwissRound(ordered)
    const matches = createSwissRoundMatches({
      tournamentId: request.tournamentId,
      bracketId,
      pairings: paired.pairings,
      bye: paired.bye,
      roundOrder: 1,
      startingMatchOrder: request.startingMatchOrder,
      participantType: request.participantType,
    })

    return {
      ok: true,
      data: {
        bracketId,
        matches,
        byeCount: paired.bye ? 1 : 0,
        bracketSize: request.participants.length,
      },
    }
  },
}

export function generateNextSwissRound(
  request: GenerateNextSwissRoundRequest,
): TournamentEngineResult<GenerateNextSwissRoundResult> {
  if (request.participants.length < 4) {
    return { ok: false, error: "not-enough-participants" }
  }

  const swissMatches = request.matches.filter((match) => match.bracket_type === SWISS_BRACKET_TYPE)
  const currentRound = getCurrentRoundOrder(swissMatches)
  if (currentRound < 1) {
    return { ok: false, error: "swiss-pairing-failed" }
  }

  const latestRoundMatches = swissMatches.filter((match) => (match.round_order ?? 0) === currentRound)
  if (latestRoundMatches.some((match) => match.status !== "finished")) {
    return { ok: false, error: "swiss-round-incomplete" }
  }

  const totalRounds = getSwissRoundCount(request.config, request.participants.length)
  const nextRound = currentRound + 1
  if (nextRound > totalRounds) {
    return { ok: false, error: "swiss-round-limit-reached" }
  }

  const standings = getSwissStandings(request.participants, swissMatches, request.config)
  const paired = pairSwissRound(standings, swissMatches)
  if (!paired) {
    return { ok: false, error: "swiss-pairing-failed" }
  }

  const bracketId = request.bracketId ?? swissMatches.find((match) => match.bracket_id)?.bracket_id ?? randomUUID()
  const matches = createSwissRoundMatches({
    tournamentId: request.tournamentId,
    bracketId,
    pairings: paired.pairings.map(([left, right]) => [
      toParticipant(left),
      toParticipant(right),
    ]),
    bye: paired.bye ? toParticipant(paired.bye) : null,
    roundOrder: nextRound,
    startingMatchOrder: request.startingMatchOrder,
    participantType: request.participantType,
  })

  return {
    ok: true,
    data: {
      bracketId,
      roundOrder: nextRound,
      matches,
      standings,
      isFinalRound: nextRound === totalRounds,
    },
  }
}

export function getSwissStandings(
  participants: SwissParticipant[],
  matches: SwissMatchRecord[],
  config?: TournamentFormatConfig,
): SwissStanding[] {
  const scoring = getScoring(config)
  const table = new Map<string, SwissStanding>()
  const opponents = new Map<string, Set<string>>()

  for (const participant of participants) {
    table.set(participant.id, {
      participantId: participant.id,
      name: participant.displayName,
      seed: participant.seed,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      buchholz: 0,
      omw: 0,
      hadBye: false,
    })
    opponents.set(participant.id, new Set())
  }

  for (const match of matches) {
    if (match.bracket_type && match.bracket_type !== SWISS_BRACKET_TYPE) continue
    const left = match.participant_1_id ? table.get(match.participant_1_id) : null
    const right = match.participant_2_id ? table.get(match.participant_2_id) : null
    if (!left && !right) continue

    if (left && right) {
      opponents.get(left.participantId)?.add(right.participantId)
      opponents.get(right.participantId)?.add(left.participantId)
    }

    if (match.status !== "finished") continue

    if (left && !right) {
      left.wins += 1
      left.points += scoring.win
      left.hadBye = true
      continue
    }

    if (!left && right) {
      right.wins += 1
      right.points += scoring.win
      right.hadBye = true
      continue
    }

    if (!left || !right) continue

    left.played += 1
    right.played += 1

    const winnerId = resolveWinnerId(match)
    if (winnerId === left.participantId) {
      left.wins += 1
      right.losses += 1
      left.points += scoring.win
      right.points += scoring.loss
    } else if (winnerId === right.participantId) {
      right.wins += 1
      left.losses += 1
      right.points += scoring.win
      left.points += scoring.loss
    } else {
      left.draws += 1
      right.draws += 1
      left.points += scoring.draw
      right.points += scoring.draw
    }
  }

  for (const row of table.values()) {
    const playedOpponents = Array.from(opponents.get(row.participantId) ?? [])
      .map((opponentId) => table.get(opponentId))
      .filter(Boolean) as SwissStanding[]

    row.buchholz = playedOpponents.reduce((total, opponent) => total + opponent.points, 0)
    row.omw = playedOpponents.length
      ? playedOpponents.reduce((total, opponent) => {
          const matchWinRate = opponent.played > 0 ? opponent.wins / opponent.played : 0
          return total + matchWinRate
        }, 0) / playedOpponents.length
      : 0
  }

  return Array.from(table.values()).sort(compareSwissStandings)
}

function pairFirstSwissRound(participants: SwissParticipant[]) {
  const slots = [...participants]
  const bye = slots.length % 2 === 1 ? slots.pop() ?? null : null
  const midpoint = Math.ceil(slots.length / 2)
  const topHalf = slots.slice(0, midpoint)
  const bottomHalf = slots.slice(midpoint)
  const pairings: [SwissParticipant, SwissParticipant][] = topHalf.map((participant, index) => [
    participant,
    bottomHalf[index],
  ]).filter((pair): pair is [SwissParticipant, SwissParticipant] => Boolean(pair[0] && pair[1]))

  return { pairings, bye }
}

function pairSwissRound(standings: SwissStanding[], matches: SwissMatchRecord[]) {
  const priorOpponents = buildPriorOpponentMap(matches)
  const pool = [...standings].sort(compareSwissStandings)
  const bye = pool.length % 2 === 1 ? pickSwissBye(pool) : null

  if (bye) {
    const byeIndex = pool.findIndex((row) => row.participantId === bye.participantId)
    if (byeIndex >= 0) pool.splice(byeIndex, 1)
  } else if (pool.length % 2 === 1) {
    return null
  }

  const pairings = pairWithoutRematches(pool, priorOpponents)
  return pairings ? { pairings, bye } : null
}

function pairWithoutRematches(
  pool: SwissStanding[],
  priorOpponents: Map<string, Set<string>>,
): [SwissStanding, SwissStanding][] | null {
  if (pool.length === 0) return []

  const [left, ...rest] = pool
  for (let index = 0; index < rest.length; index += 1) {
    const right = rest[index]
    if (priorOpponents.get(left.participantId)?.has(right.participantId)) continue

    const remaining = [...rest.slice(0, index), ...rest.slice(index + 1)]
    const next = pairWithoutRematches(remaining, priorOpponents)
    if (next) return [[left, right], ...next]
  }

  return null
}

function pickSwissBye(pool: SwissStanding[]) {
  return [...pool]
    .sort((left, right) => {
      if (left.hadBye !== right.hadBye) return left.hadBye ? 1 : -1
      if (left.points !== right.points) return left.points - right.points
      if (left.buchholz !== right.buchholz) return left.buchholz - right.buchholz
      if (left.wins !== right.wins) return left.wins - right.wins
      return compareSeedAndName(left, right)
    })
    .find((row) => !row.hadBye) ?? null
}

function createSwissRoundMatches({
  tournamentId,
  bracketId,
  pairings,
  bye,
  roundOrder,
  startingMatchOrder,
  participantType,
}: {
  tournamentId: string
  bracketId: string
  pairings: [SwissParticipant, SwissParticipant][]
  bye: SwissParticipant | null
  roundOrder: number
  startingMatchOrder: number
  participantType: ParticipantType
}): GeneratedTournamentMatch[] {
  let matchOrder = startingMatchOrder
  let bracketPosition = 1
  const roundLabel = `Round ${roundOrder}`
  const matches: GeneratedTournamentMatch[] = pairings.map(([left, right]) => ({
    id: randomUUID(),
    tournament_id: tournamentId,
    round: roundLabel,
    match_order: matchOrder++,
    team1: left.displayName,
    team2: right.displayName,
    score1: null,
    score2: null,
    status: "upcoming",
    participant_type: participantType,
    participant_1_id: left.id,
    participant_2_id: right.id,
    winner_participant_id: null,
    bracket_id: bracketId,
    bracket_type: SWISS_BRACKET_TYPE,
    bracket_status: BRACKET_STATUS_TEMPLATE,
    round_order: roundOrder,
    bracket_round: roundLabel,
    bracket_position: bracketPosition++,
    next_match_id: null,
    next_match_slot: null,
    loser_next_match_id: null,
    loser_next_match_slot: null,
  }))

  if (bye) {
    matches.push({
      id: randomUUID(),
      tournament_id: tournamentId,
      round: roundLabel,
      match_order: matchOrder++,
      team1: bye.displayName,
      team2: "BYE",
      score1: null,
      score2: null,
      status: "finished",
      participant_type: participantType,
      participant_1_id: bye.id,
      participant_2_id: null,
      winner_participant_id: bye.id,
      bracket_id: bracketId,
      bracket_type: SWISS_BRACKET_TYPE,
      bracket_status: BRACKET_STATUS_TEMPLATE,
      round_order: roundOrder,
      bracket_round: roundLabel,
      bracket_position: bracketPosition,
      next_match_id: null,
      next_match_slot: null,
      loser_next_match_id: null,
      loser_next_match_slot: null,
    })
  }

  return matches
}

function getCurrentRoundOrder(matches: SwissMatchRecord[]) {
  return matches.reduce((max, match) => Math.max(max, match.round_order ?? 0), 0)
}

function getSwissRoundCount(config: TournamentFormatConfig | undefined, participantCount: number) {
  return config?.swiss_rounds ?? Math.ceil(Math.log2(participantCount))
}

function buildPriorOpponentMap(matches: SwissMatchRecord[]) {
  const map = new Map<string, Set<string>>()
  for (const match of matches) {
    if (match.bracket_type && match.bracket_type !== SWISS_BRACKET_TYPE) continue
    if (!match.participant_1_id || !match.participant_2_id) continue
    addOpponent(map, match.participant_1_id, match.participant_2_id)
    addOpponent(map, match.participant_2_id, match.participant_1_id)
  }
  return map
}

function addOpponent(map: Map<string, Set<string>>, participantId: string, opponentId: string) {
  const opponents = map.get(participantId) ?? new Set<string>()
  opponents.add(opponentId)
  map.set(participantId, opponents)
}

function resolveWinnerId(match: SwissMatchRecord) {
  if (match.winner_participant_id) return match.winner_participant_id
  if (typeof match.score1 !== "number" || typeof match.score2 !== "number") return null
  if (match.score1 > match.score2) return match.participant_1_id
  if (match.score2 > match.score1) return match.participant_2_id
  return null
}

function getScoring(config: TournamentFormatConfig | undefined) {
  return {
    win: config?.points_win ?? DEFAULT_POINTS_WIN,
    draw: config?.points_draw ?? DEFAULT_POINTS_DRAW,
    loss: config?.points_loss ?? DEFAULT_POINTS_LOSS,
  }
}

function compareSwissStandings(left: SwissStanding, right: SwissStanding) {
  if (left.points !== right.points) return right.points - left.points
  if (left.buchholz !== right.buchholz) return right.buchholz - left.buchholz
  if (left.omw !== right.omw) return right.omw - left.omw
  if (left.wins !== right.wins) return right.wins - left.wins
  return compareSeedAndName(left, right)
}

function compareSeedAndName(
  left: Pick<SwissStanding, "seed" | "name">,
  right: Pick<SwissStanding, "seed" | "name">,
) {
  const leftSeed = left.seed ?? Number.POSITIVE_INFINITY
  const rightSeed = right.seed ?? Number.POSITIVE_INFINITY
  if (leftSeed !== rightSeed) return leftSeed - rightSeed
  return left.name.localeCompare(right.name)
}

function toParticipant(standing: SwissStanding): SwissParticipant {
  return {
    id: standing.participantId,
    displayName: standing.name,
    seed: standing.seed,
  }
}
