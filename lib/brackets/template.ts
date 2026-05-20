import { randomUUID } from "node:crypto"

export const BRACKET_SIZES = [2, 4, 8, 16] as const
export const BRACKET_TYPE = "single_elimination"
export const BRACKET_STATUS_TEMPLATE = "template"

export type BracketSize = (typeof BRACKET_SIZES)[number]

export type BracketTemplateMatch = {
  id: string
  tournament_id: string
  round: string
  match_order: number
  team1: null
  team2: null
  score1: null
  score2: null
  status: "upcoming"
  participant_type: "team"
  participant_1_id: null
  participant_2_id: null
  winner_participant_id: null
  bracket_id: string
  bracket_type: typeof BRACKET_TYPE
  bracket_status: typeof BRACKET_STATUS_TEMPLATE
  round_order: number
  bracket_round: string
  bracket_position: number
  next_match_id: string | null
  next_match_slot: number | null
}

export function isBracketSize(value: number): value is BracketSize {
  return BRACKET_SIZES.some((size) => size === value)
}

export function createBracketTemplateMatches({
  tournamentId,
  bracketSize,
  startingMatchOrder,
}: {
  tournamentId: string
  bracketSize: BracketSize
  startingMatchOrder: number
}) {
  const bracketId = randomUUID()
  const roundLabels = getRoundLabels(bracketSize)
  const rounds = roundLabels.map((roundLabel, roundIndex) =>
    Array.from({ length: bracketSize / 2 ** (roundIndex + 1) }, (_, positionIndex) => ({
      id: randomUUID(),
      roundLabel,
      roundOrder: roundIndex + 1,
      bracketPosition: positionIndex + 1,
    })),
  )
  let matchOrder = startingMatchOrder

  const matches: BracketTemplateMatch[] = rounds.flatMap((round, roundIndex) =>
    round.map((slot) => {
      const nextRound = rounds[roundIndex + 1]
      const nextMatch = nextRound?.[Math.floor((slot.bracketPosition - 1) / 2)]

      return {
        id: slot.id,
        tournament_id: tournamentId,
        round: slot.roundLabel,
        match_order: matchOrder++,
        team1: null,
        team2: null,
        score1: null,
        score2: null,
        status: "upcoming",
        participant_type: "team",
        participant_1_id: null,
        participant_2_id: null,
        winner_participant_id: null,
        bracket_id: bracketId,
        bracket_type: BRACKET_TYPE,
        bracket_status: BRACKET_STATUS_TEMPLATE,
        round_order: slot.roundOrder,
        bracket_round: slot.roundLabel,
        bracket_position: slot.bracketPosition,
        next_match_id: nextMatch?.id ?? null,
        next_match_slot: nextMatch
          ? slot.bracketPosition % 2 === 1
            ? 1
            : 2
          : null,
      }
    }),
  )

  return { bracketId, matches }
}

export function getRoundLabels(bracketSize: BracketSize) {
  if (bracketSize === 2) return ["Final"]
  if (bracketSize === 4) return ["Semifinal", "Final"]
  if (bracketSize === 8) return ["Quarterfinal", "Semifinal", "Final"]

  return ["Round of 16", "Quarterfinal", "Semifinal", "Final"]
}
