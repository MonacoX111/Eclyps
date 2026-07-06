import { randomUUID } from "node:crypto"
import { isBracketSize, type BracketSize } from "@/lib/brackets/template"
import { nextBracketSize, orderParticipants, standardSeedOrder } from "@/lib/brackets/seeding"
import type {
  GeneratedTournamentMatch,
  TournamentEngine,
  TournamentEngineResult,
  TournamentSeededRequest,
  TournamentSeededStructure,
  TournamentTemplateRequest,
  TournamentTemplateStructure,
} from "@/lib/tournament-engine/types"

const DOUBLE_ELIMINATION_BRACKET_TYPE = "double_elimination"
const BRACKET_STATUS_TEMPLATE = "template"

type SlotParticipant = {
  id: string
  displayName: string
} | null

type DoubleEliminationMatch = GeneratedTournamentMatch & {
  loser_next_match_id: string | null
  loser_next_match_slot: number | null
}

type MatchSlot = {
  id: string
  roundOrder: number
  roundLabel: string
  bracketPosition: number
  bracketRound: string
  bracketSection: "winners" | "losers" | "grand_final"
}

export const doubleEliminationEngine: TournamentEngine = {
  format: "double_elimination",
  createTemplate(_request: TournamentTemplateRequest): TournamentEngineResult<TournamentTemplateStructure> {
    return { ok: false, error: "unsupported-tournament-format" }
  },
  generateSeeded(request: TournamentSeededRequest): TournamentEngineResult<TournamentSeededStructure> {
    if (request.participants.length < 4) {
      return { ok: false, error: "not-enough-participants" }
    }

    const bracketSize = nextBracketSize(request.participants.length)
    if (!bracketSize) {
      return { ok: false, error: "too-many-participants" }
    }

    if (!isBracketSize(bracketSize)) {
      return { ok: false, error: "invalid-bracket-size" }
    }

    const generated = createDoubleEliminationMatches({
      tournamentId: request.tournamentId,
      participants: request.participants.map((participant) => ({
        id: participant.id,
        displayName: participant.displayName,
        seed: participant.seed,
      })),
      seedMethod: request.seedMethod,
      bracketSize,
      startingMatchOrder: request.startingMatchOrder,
      participantType: request.participantType,
      includeGrandFinalReset: request.config?.grand_final_reset !== false,
    })

    return { ok: true, data: generated }
  },
}

function createDoubleEliminationMatches({
  tournamentId,
  participants,
  seedMethod,
  bracketSize,
  startingMatchOrder,
  participantType,
  includeGrandFinalReset,
}: {
  tournamentId: string
  participants: { id: string; displayName: string; seed: number | null }[]
  seedMethod: TournamentSeededRequest["seedMethod"]
  bracketSize: BracketSize
  startingMatchOrder: number
  participantType: TournamentSeededRequest["participantType"]
  includeGrandFinalReset: boolean
}): TournamentSeededStructure {
  const bracketId = randomUUID()
  const winnersRounds = buildWinnersRounds(bracketSize)
  const losersRounds = buildLosersRounds(bracketSize, winnersRounds.length)
  const grandFinal = makeSlot(winnersRounds.length + losersRounds.length + 1, "Grand Final", 1, "Grand Final", "grand_final")
  const grandFinalReset = includeGrandFinalReset
    ? makeSlot(winnersRounds.length + losersRounds.length + 2, "Grand Final Reset", 1, "Grand Final Reset", "grand_final")
    : null

  const allSlots = [...winnersRounds.flat(), ...losersRounds.flat(), grandFinal, ...(grandFinalReset ? [grandFinalReset] : [])]
  const matchesById = new Map<string, DoubleEliminationMatch>()
  let matchOrder = startingMatchOrder

  for (const slot of allSlots) {
    matchesById.set(slot.id, {
      id: slot.id,
      tournament_id: tournamentId,
      round: slot.roundLabel,
      match_order: matchOrder++,
      team1: null,
      team2: null,
      score1: null,
      score2: null,
      status: "upcoming",
      participant_type: participantType,
      participant_1_id: null,
      participant_2_id: null,
      winner_participant_id: null,
      bracket_id: bracketId,
      bracket_type: DOUBLE_ELIMINATION_BRACKET_TYPE,
      bracket_status: BRACKET_STATUS_TEMPLATE,
      round_order: slot.roundOrder,
      bracket_round: slot.bracketRound,
      bracket_position: slot.bracketPosition,
      next_match_id: null,
      next_match_slot: null,
      loser_next_match_id: null,
      loser_next_match_slot: null,
    })
  }

  wireWinnersBracket(winnersRounds, losersRounds, grandFinal.id, matchesById)
  wireLosersBracket(losersRounds, grandFinal.id, matchesById)

  const winnersFinal = winnersRounds[winnersRounds.length - 1]?.[0]
  if (winnersFinal) {
    setWinnerNext(matchesById, winnersFinal.id, grandFinal.id, 1)
  }

  const losersFinal = losersRounds[losersRounds.length - 1]?.[0]
  if (losersFinal) {
    setWinnerNext(matchesById, losersFinal.id, grandFinal.id, 2)
  }

  if (grandFinalReset) {
    setWinnerNext(matchesById, grandFinal.id, grandFinalReset.id, 1)
    setLoserNext(matchesById, grandFinal.id, grandFinalReset.id, 2)
  }

  const seeded = seedWinnersRoundOne({
    matchesById,
    roundOne: winnersRounds[0] ?? [],
    participants,
    seedMethod,
    bracketSize,
  })

  const matches = allSlots.map((slot) => matchesById.get(slot.id)).filter(Boolean) as DoubleEliminationMatch[]

  return {
    bracketId,
    matches,
    byeCount: seeded.byeCount,
    bracketSize,
  }
}

function buildWinnersRounds(bracketSize: BracketSize): MatchSlot[][] {
  const roundCount = Math.log2(bracketSize)
  return Array.from({ length: roundCount }, (_, roundIndex) => {
    const matchCount = bracketSize / 2 ** (roundIndex + 1)
    const roundOrder = roundIndex + 1
    const label = getWinnersRoundLabel(roundOrder, roundCount)
    return Array.from({ length: matchCount }, (_, positionIndex) =>
      makeSlot(roundOrder, label, positionIndex + 1, label, "winners"),
    )
  })
}

function buildLosersRounds(bracketSize: BracketSize, winnersRoundCount: number): MatchSlot[][] {
  const losersRoundCount = Math.max(0, winnersRoundCount * 2 - 2)
  let previousSize = bracketSize / 4

  return Array.from({ length: losersRoundCount }, (_, roundIndex) => {
    const oneBasedRound = roundIndex + 1
    const size = oneBasedRound === 1 ? previousSize : oneBasedRound % 2 === 0 ? previousSize : previousSize / 2
    previousSize = size
    const roundOrder = winnersRoundCount + oneBasedRound
    const label = getLosersRoundLabel(oneBasedRound, losersRoundCount)
    return Array.from({ length: size }, (_, positionIndex) =>
      makeSlot(roundOrder, label, positionIndex + 1, label, "losers"),
    )
  })
}

function makeSlot(
  roundOrder: number,
  roundLabel: string,
  bracketPosition: number,
  bracketRound: string,
  bracketSection: MatchSlot["bracketSection"],
): MatchSlot {
  return {
    id: randomUUID(),
    roundOrder,
    roundLabel,
    bracketPosition,
    bracketRound,
    bracketSection,
  }
}

function wireWinnersBracket(
  winnersRounds: MatchSlot[][],
  losersRounds: MatchSlot[][],
  grandFinalId: string,
  matchesById: Map<string, DoubleEliminationMatch>,
) {
  winnersRounds.forEach((round, roundIndex) => {
    const nextRound = winnersRounds[roundIndex + 1]
    round.forEach((slot) => {
      if (nextRound) {
        const next = nextRound[Math.floor((slot.bracketPosition - 1) / 2)]
        setWinnerNext(matchesById, slot.id, next.id, slot.bracketPosition % 2 === 1 ? 1 : 2)
      } else {
        setWinnerNext(matchesById, slot.id, grandFinalId, 1)
      }

      const loserDestination = getLoserDestinationFromWinners(slot, roundIndex, winnersRounds, losersRounds)
      if (loserDestination) {
        setLoserNext(matchesById, slot.id, loserDestination.match.id, loserDestination.slot)
      }
    })
  })
}

function getLoserDestinationFromWinners(
  slot: MatchSlot,
  roundIndex: number,
  winnersRounds: MatchSlot[][],
  losersRounds: MatchSlot[][],
): { match: MatchSlot; slot: 1 | 2 } | null {
  if (roundIndex === 0) {
    const destination = losersRounds[0]?.[Math.floor((slot.bracketPosition - 1) / 2)]
    if (!destination) return null
    return { match: destination, slot: slot.bracketPosition % 2 === 1 ? 1 : 2 }
  }

  if (roundIndex >= winnersRounds.length - 1) {
    const destination = losersRounds[losersRounds.length - 1]?.[0]
    return destination ? { match: destination, slot: 2 } : null
  }

  const destinationRound = losersRounds[roundIndex * 2 - 1]
  const destination = destinationRound?.[slot.bracketPosition - 1]
  return destination ? { match: destination, slot: 2 } : null
}

function wireLosersBracket(
  losersRounds: MatchSlot[][],
  grandFinalId: string,
  matchesById: Map<string, DoubleEliminationMatch>,
) {
  losersRounds.forEach((round, roundIndex) => {
    const nextRound = losersRounds[roundIndex + 1]
    round.forEach((slot) => {
      if (!nextRound) {
        setWinnerNext(matchesById, slot.id, grandFinalId, 2)
        return
      }

      if (nextRound.length === round.length) {
        const next = nextRound[slot.bracketPosition - 1]
        setWinnerNext(matchesById, slot.id, next.id, 1)
        return
      }

      const next = nextRound[Math.floor((slot.bracketPosition - 1) / 2)]
      setWinnerNext(matchesById, slot.id, next.id, slot.bracketPosition % 2 === 1 ? 1 : 2)
    })
  })
}

function seedWinnersRoundOne({
  matchesById,
  roundOne,
  participants,
  seedMethod,
  bracketSize,
}: {
  matchesById: Map<string, DoubleEliminationMatch>
  roundOne: MatchSlot[]
  participants: { id: string; displayName: string; seed: number | null }[]
  seedMethod: TournamentSeededRequest["seedMethod"]
  bracketSize: BracketSize
}) {
  const ordered = orderParticipants(participants, seedMethod)
  const bySeed = new Map<number, { id: string; displayName: string }>()
  ordered.forEach((participant, index) => bySeed.set(index + 1, participant))

  const slotOrder = standardSeedOrder(bracketSize)
  let byeCount = 0

  roundOne.forEach((slot, matchIndex) => {
    const match = matchesById.get(slot.id)
    if (!match) return

    const seed1 = slotOrder[matchIndex * 2]
    const seed2 = slotOrder[matchIndex * 2 + 1]
    const p1 = bySeed.get(seed1) ?? null
    const p2 = bySeed.get(seed2) ?? null

    assignParticipant(match, 1, p1)
    assignParticipant(match, 2, p2)

    const lone = p1 && !p2 ? p1 : !p1 && p2 ? p2 : null
    if (lone) {
      byeCount += 1
      match.status = "finished"
      match.winner_participant_id = lone.id
      advanceSeededParticipant(matchesById, match.next_match_id, match.next_match_slot, lone)
    }
  })

  return { byeCount }
}

function assignParticipant(
  match: DoubleEliminationMatch,
  slot: 1 | 2,
  participant: { id: string; displayName: string } | null,
) {
  if (!participant) return
  if (slot === 1) {
    match.participant_1_id = participant.id
    match.team1 = participant.displayName
  } else {
    match.participant_2_id = participant.id
    match.team2 = participant.displayName
  }
}

function advanceSeededParticipant(
  matchesById: Map<string, DoubleEliminationMatch>,
  nextMatchId: string | null,
  nextMatchSlot: number | null,
  participant: { id: string; displayName: string },
) {
  if (!nextMatchId || (nextMatchSlot !== 1 && nextMatchSlot !== 2)) return
  const next = matchesById.get(nextMatchId)
  if (!next) return
  assignParticipant(next, nextMatchSlot, participant)
}

function setWinnerNext(
  matchesById: Map<string, DoubleEliminationMatch>,
  matchId: string,
  nextMatchId: string,
  nextMatchSlot: 1 | 2,
) {
  const match = matchesById.get(matchId)
  if (!match) return
  match.next_match_id = nextMatchId
  match.next_match_slot = nextMatchSlot
}

function setLoserNext(
  matchesById: Map<string, DoubleEliminationMatch>,
  matchId: string,
  nextMatchId: string,
  nextMatchSlot: 1 | 2,
) {
  const match = matchesById.get(matchId)
  if (!match) return
  match.loser_next_match_id = nextMatchId
  match.loser_next_match_slot = nextMatchSlot
}

function getWinnersRoundLabel(roundOrder: number, roundCount: number) {
  if (roundOrder === roundCount) return "Winners Final"
  return `Winners Round ${roundOrder}`
}

function getLosersRoundLabel(roundOrder: number, roundCount: number) {
  if (roundOrder === roundCount) return "Losers Final"
  return `Losers Round ${roundOrder}`
}
