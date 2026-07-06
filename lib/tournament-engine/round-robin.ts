import { randomUUID } from "node:crypto"
import { orderParticipants } from "@/lib/brackets/seeding"
import type {
  TournamentEngine,
  TournamentEngineResult,
  TournamentSeededRequest,
  TournamentSeededStructure,
  TournamentTemplateRequest,
  TournamentTemplateStructure,
  GeneratedTournamentMatch,
} from "@/lib/tournament-engine/types"

const ROUND_ROBIN_BRACKET_TYPE = "round_robin"
const BRACKET_STATUS_TEMPLATE = "template"

type RoundRobinSlot = {
  id: string
  displayName: string
} | null

export const roundRobinEngine: TournamentEngine = {
  format: "round_robin",
  createTemplate(_request: TournamentTemplateRequest): TournamentEngineResult<TournamentTemplateStructure> {
    return { ok: false, error: "unsupported-tournament-format" }
  },
  generateSeeded(request: TournamentSeededRequest): TournamentEngineResult<TournamentSeededStructure> {
    if (request.participants.length < 3) {
      return { ok: false, error: "not-enough-participants" }
    }

    const matchesPerOpponent = clampMatchesPerOpponent(request.config?.matches_per_opponent)
    const ordered = orderParticipants(request.participants, request.seedMethod)
    const rounds = buildRoundRobinRounds(
      ordered.map((participant) => ({
        id: participant.id,
        displayName: participant.displayName,
      })),
    )

    const bracketId = randomUUID()
    let matchOrder = request.startingMatchOrder
    const matches: GeneratedTournamentMatch[] = []

    for (let cycleIndex = 0; cycleIndex < matchesPerOpponent; cycleIndex += 1) {
      const shouldFlipCycle = cycleIndex % 2 === 1
      rounds.forEach((roundPairings, roundIndex) => {
        const roundOrder = cycleIndex * rounds.length + roundIndex + 1
        let bracketPosition = 1

        roundPairings.forEach(([left, right], pairingIndex) => {
          if (!left || !right) return

          const shouldFlipPairing = shouldFlipCycle || (cycleIndex === 0 && pairingIndex % 2 === 1)
          const participant1 = shouldFlipPairing ? right : left
          const participant2 = shouldFlipPairing ? left : right

          matches.push({
            id: randomUUID(),
            tournament_id: request.tournamentId,
            round: `Round ${roundOrder}`,
            match_order: matchOrder++,
            team1: participant1.displayName,
            team2: participant2.displayName,
            score1: null,
            score2: null,
            status: "upcoming",
            participant_type: request.participantType,
            participant_1_id: participant1.id,
            participant_2_id: participant2.id,
            winner_participant_id: null,
            bracket_id: bracketId,
            bracket_type: ROUND_ROBIN_BRACKET_TYPE,
            bracket_status: BRACKET_STATUS_TEMPLATE,
            round_order: roundOrder,
            bracket_round: `Round ${roundOrder}`,
            bracket_position: bracketPosition++,
            next_match_id: null,
            next_match_slot: null,
          })
        })
      })
    }

    return {
      ok: true,
      data: {
        bracketId,
        matches,
        byeCount: 0,
        bracketSize: request.participants.length,
      },
    }
  },
}

function buildRoundRobinRounds(participants: RoundRobinSlot[]) {
  const slots: RoundRobinSlot[] = participants.length % 2 === 0 ? [...participants] : [...participants, null]
  const rounds: [RoundRobinSlot, RoundRobinSlot][][] = []
  const roundCount = slots.length - 1
  const pairingsPerRound = slots.length / 2

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const pairings: [RoundRobinSlot, RoundRobinSlot][] = []

    for (let pairingIndex = 0; pairingIndex < pairingsPerRound; pairingIndex += 1) {
      pairings.push([slots[pairingIndex] ?? null, slots[slots.length - 1 - pairingIndex] ?? null])
    }

    rounds.push(pairings)

    const fixed = slots[0] ?? null
    const rotated = [fixed, slots[slots.length - 1] ?? null, ...slots.slice(1, slots.length - 1)]
    slots.splice(0, slots.length, ...rotated)
  }

  return rounds
}

function clampMatchesPerOpponent(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) return 1
  return Math.min(Math.max(value, 1), 4)
}
