import "server-only"

import { z } from "zod"

const validStatuses = ["upcoming", "live", "finished"] as const
const participantTypes = ["team", "player"] as const

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string }

const loginPasswordSchema = z.object({
  password: requiredString(),
})

export const activeTournamentSchema = z.object({
  id: requiredString(),
})

export const tournamentSchema = z.object({
  name: requiredString(),
  game: requiredString(),
  event_date: optionalString(),
  format: optionalString(),
  team_count: positiveInteger(),
  match_days: positiveInteger(),
  status: statusSchema(),
  prize_pool: optionalString(),
  arena_title: optionalString(),
  arena_description: optionalString(),
  arena_tags: optionalStringArray(),
})

export const teamSchema = z.object({
  tournament_id: requiredString(),
  name: requiredString(),
  seed: positiveInteger(),
  wins: nonNegativeInteger(),
  losses: nonNegativeInteger(),
})

export const playerSchema = z.object({
  tournament_id: requiredString(),
  name: requiredString(),
  nickname: optionalString(),
  seed: optionalPositiveInteger(),
  wins: nonNegativeInteger(),
  losses: nonNegativeInteger(),
})

export const matchSchema = z
  .object({
    tournament_id: requiredString(),
    round: optionalString(),
    team1: requiredString(),
    team2: requiredString(),
    score1: optionalInteger(),
    score2: optionalInteger(),
    status: statusSchema(),
    match_order: positiveInteger(),
    participant_type: participantTypeSchema(),
  })
  .superRefine((value, context) => {
    if (value.team1.toLowerCase() === value.team2.toLowerCase()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "duplicate-match-teams",
        path: ["team2"],
      })
    }
  })

export const resultSchema = z.object({
  tournament_id: requiredString(),
  team: requiredString(),
  placement: positiveInteger(),
  label: optionalString(),
  mvp: optionalString(),
  scoreline: optionalString(),
  note: optionalString(),
  participant_type: participantTypeSchema(),
})

export type AdminLoginInput = z.infer<typeof loginPasswordSchema>
export type ActiveTournamentInput = z.infer<typeof activeTournamentSchema>
export type TournamentInput = z.infer<typeof tournamentSchema>
export type TeamInput = z.infer<typeof teamSchema>
export type PlayerInput = z.infer<typeof playerSchema>
export type MatchInput = z.infer<typeof matchSchema>
export type ResultInput = z.infer<typeof resultSchema>

export function parseLoginFormData(formData: FormData): ParseResult<AdminLoginInput> {
  return parseFormData(loginPasswordSchema, formData, {
    password: "invalid",
  })
}

export function parseActiveTournamentFormData(
  formData: FormData,
): ParseResult<ActiveTournamentInput> {
  return parseFormData(activeTournamentSchema, formData, {
    id: "missing-id",
  })
}

export function parseRequiredIdFormData(
  formData: FormData,
  error: string,
): ParseResult<ActiveTournamentInput> {
  return parseFormData(activeTournamentSchema, formData, {
    id: error,
  })
}

export function parseTournamentFormData(
  formData: FormData,
): ParseResult<TournamentInput> {
  return parseFormData(tournamentSchema, formData, {
    name: "invalid-name",
    game: "invalid-game",
    team_count: "invalid-team-count",
    match_days: "invalid-match-days",
    status: "invalid-status",
  })
}

export function parseTeamFormData(formData: FormData): ParseResult<TeamInput> {
  return parseFormData(teamSchema, formData, {
    tournament_id: "invalid-tournament-id",
    name: "invalid-team-name",
    seed: "invalid-seed",
    wins: "invalid-wins",
    losses: "invalid-losses",
  })
}

export function parsePlayerFormData(formData: FormData): ParseResult<PlayerInput> {
  return parseFormData(playerSchema, formData, {
    tournament_id: "invalid-tournament-id",
    name: "invalid-player-name",
    seed: "invalid-player-seed",
    wins: "invalid-wins",
    losses: "invalid-losses",
  })
}

export function parseMatchFormData(formData: FormData): ParseResult<MatchInput> {
  return parseFormData(matchSchema, formData, {
    tournament_id: "invalid-tournament-id",
    team1: "invalid-team1",
    team2: "invalid-team2",
    score1: "invalid-score",
    score2: "invalid-score",
    status: "invalid-status",
    match_order: "invalid-match-order",
    participant_type: "invalid-participant-type",
  })
}

export function parseResultFormData(formData: FormData): ParseResult<ResultInput> {
  return parseFormData(resultSchema, formData, {
    tournament_id: "invalid-tournament-id",
    team: "invalid-result-team",
    placement: "invalid-placement",
    participant_type: "invalid-participant-type",
  })
}

function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
  errorByField: Record<string, string>,
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(Object.fromEntries(formData.entries()))

  if (result.success) {
    return { ok: true, data: result.data }
  }

  const issue = result.error.issues[0]
  const field = issue?.path[0]

  if (typeof issue?.message === "string" && issue.message.startsWith("duplicate-")) {
    return { ok: false, error: issue.message }
  }

  if (typeof field === "string" && errorByField[field]) {
    return { ok: false, error: errorByField[field] }
  }

  return { ok: false, error: issue?.message || "invalid-form" }
}

function requiredString() {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1),
  )
}

function optionalString() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : null
    },
    z.string().nullable(),
  )
}

function optionalStringArray() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const values = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)

      return values.length > 0 ? values : null
    },
    z.array(z.string().min(1)).nullable(),
  )
}

function positiveInteger() {
  return z.preprocess(toRequiredNumber, z.number().int().positive())
}

function nonNegativeInteger() {
  return z.preprocess(toRequiredNumber, z.number().int().min(0))
}

function optionalInteger() {
  return z.preprocess(
    toOptionalNumber,
    z.union([z.number().int(), z.null()]),
  )
}

function optionalPositiveInteger() {
  return z.preprocess(
    toOptionalNumber,
    z.union([z.number().int().positive(), z.null()]),
  )
}

function statusSchema() {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.enum(validStatuses),
  )
}

function participantTypeSchema() {
  return z.enum(participantTypes)
}

function toRequiredNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string" || value.trim().length === 0) return Number.NaN

  return Number(value)
}

function toOptionalNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string" || value.trim().length === 0) return null

  return Number(value)
}
