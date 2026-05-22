import "server-only"

import { z } from "zod"
import { BRACKET_SIZES } from "@/lib/brackets/template"
import { parseUtcDateTimeInput } from "@/lib/check-ins/time"
import { MATCH_STATUSES, isWinnerSelection } from "@/lib/matches/core"
import { DEFAULT_MATCH_TIMEZONE, normalizeTimeZone } from "@/lib/matches/schedule"

const participantTypes = ["team", "player"] as const
const registrationStatuses = ["approved", "rejected"] as const

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
  participant_type: participantTypeSchema(),
  event_date: optionalString(),
  format: optionalString(),
  team_count: positiveInteger(),
  match_days: positiveInteger(),
  status: statusSchema(),
  prize_pool: optionalString(),
  arena_title: optionalString(),
  arena_description: optionalString(),
  arena_tags: optionalStringArray(),
  bracket_title: optionalString(),
  bracket_subtitle: optionalString(),
  bracket_stage_label: optionalString(),
  bracket_participant_label: optionalString(),
  bracket_arena_label: optionalString(),
  check_in_opens_at: optionalDateTimeInput(),
  check_in_closes_at: optionalDateTimeInput(),
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
  region: optionalString(),
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
    score1: optionalNonNegativeInteger(),
    score2: optionalNonNegativeInteger(),
    status: statusSchema(),
    match_order: positiveInteger(),
    participant_type: participantTypeSchema(),
    winner_selection: winnerSelectionSchema(),
    schedule_date: optionalDateInput(),
    schedule_time: optionalTimeInput(),
    timezone: timezoneSchema(),
    schedule_note: optionalString(),
  })
  .superRefine((value, context) => {
    if (value.team1.toLowerCase() === value.team2.toLowerCase()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "duplicate-match-teams",
        path: ["team2"],
      })
    }

    if ((value.schedule_date && !value.schedule_time) || (!value.schedule_date && value.schedule_time)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invalid-schedule",
        path: ["schedule_date"],
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

export const bracketTemplateSchema = z.object({
  tournament_id: requiredString(),
  bracket_size: z.preprocess(toRequiredNumber, z.union([
    z.literal(BRACKET_SIZES[0]),
    z.literal(BRACKET_SIZES[1]),
    z.literal(BRACKET_SIZES[2]),
    z.literal(BRACKET_SIZES[3]),
  ])),
  confirm_regenerate: checkboxBoolean(),
})

export const bracketSlotAssignmentSchema = z.object({
  tournament_id: requiredString(),
  match_id: requiredString(),
  slot: z.preprocess(toRequiredNumber, z.union([z.literal(1), z.literal(2)])),
  participant_id: optionalString(),
})

export const bracketStatusSchema = z.object({
  tournament_id: requiredString(),
  bracket_id: requiredString(),
  action: z.union([z.literal("lock"), z.literal("unlock")]),
})

export const bracketMatchUpdateSchema = z.object({
  tournament_id: requiredString(),
  match_id: requiredString(),
  status: statusSchema(),
  score1: optionalNonNegativeInteger(),
  score2: optionalNonNegativeInteger(),
  winner_selection: winnerSelectionSchema(),
})

export const publicRegistrationSchema = z.object({
  tournament_id: requiredString(),
  participant_type: participantTypeSchema(),
  display_name: requiredString(),
  contact_email: optionalEmailString(),
  contact_handle: optionalString(),
  region: optionalString(),
})

const teamRosterSchema = z
  .object({
    captain_nickname: requiredString(),
    main_players: z.array(requiredString()).length(5),
    substitutes: z.array(optionalString()).max(2),
  })
  .superRefine((value, context) => {
    const substitutes = value.substitutes.filter(
      (nickname): nickname is string => Boolean(nickname),
    )
    const roster = [...value.main_players, ...substitutes]
    const normalizedRoster = roster.map(normalizeRosterNickname)

    if (roster.length < 5) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invalid-roster-minimum",
        path: ["main_players"],
      })
    }

    if (roster.length > 7) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invalid-roster-maximum",
        path: ["substitutes"],
      })
    }

    if (new Set(normalizedRoster).size !== normalizedRoster.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "duplicate-roster-player",
        path: ["main_players"],
      })
    }

    if (!normalizedRoster.includes(normalizeRosterNickname(value.captain_nickname))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invalid-roster-captain",
        path: ["captain_nickname"],
      })
    }
  })

export const registrationDecisionSchema = z.object({
  id: requiredString(),
  status: z.enum(registrationStatuses),
})

export type AdminLoginInput = z.infer<typeof loginPasswordSchema>
export type ActiveTournamentInput = z.infer<typeof activeTournamentSchema>
export type TournamentInput = z.infer<typeof tournamentSchema>
export type TeamInput = z.infer<typeof teamSchema>
export type PlayerInput = z.infer<typeof playerSchema>
export type MatchInput = z.infer<typeof matchSchema>
export type ResultInput = z.infer<typeof resultSchema>
export type BracketTemplateInput = z.infer<typeof bracketTemplateSchema>
export type BracketSlotAssignmentInput = z.infer<typeof bracketSlotAssignmentSchema>
export type BracketStatusInput = z.infer<typeof bracketStatusSchema>
export type BracketMatchUpdateInput = z.infer<typeof bracketMatchUpdateSchema>
export type TeamRosterInput = z.infer<typeof teamRosterSchema>
export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema> & {
  roster: TeamRosterInput | null
}
export type RegistrationDecisionInput = z.infer<typeof registrationDecisionSchema>

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
    participant_type: "invalid-participant-type",
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
    winner_selection: "invalid-winner",
    schedule_date: "invalid-schedule",
    schedule_time: "invalid-schedule",
    timezone: "invalid-timezone",
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

export function parseBracketTemplateFormData(
  formData: FormData,
): ParseResult<BracketTemplateInput> {
  return parseFormData(bracketTemplateSchema, formData, {
    tournament_id: "invalid-tournament-id",
    bracket_size: "invalid-bracket-size",
  })
}

export function parseBracketSlotAssignmentFormData(
  formData: FormData,
): ParseResult<BracketSlotAssignmentInput> {
  return parseFormData(bracketSlotAssignmentSchema, formData, {
    tournament_id: "invalid-tournament-id",
    match_id: "missing-id",
    slot: "invalid-bracket-slot",
    participant_id: "invalid-participant",
  })
}

export function parseBracketStatusFormData(
  formData: FormData,
): ParseResult<BracketStatusInput> {
  return parseFormData(bracketStatusSchema, formData, {
    tournament_id: "invalid-tournament-id",
    bracket_id: "invalid-bracket",
    action: "invalid-bracket-status",
  })
}

export function parseBracketMatchUpdateFormData(
  formData: FormData,
): ParseResult<BracketMatchUpdateInput> {
  return parseFormData(bracketMatchUpdateSchema, formData, {
    tournament_id: "invalid-tournament-id",
    match_id: "missing-id",
    status: "invalid-status",
    score1: "invalid-score",
    score2: "invalid-score",
    winner_selection: "invalid-winner",
  })
}

export function parsePublicRegistrationFormData(
  formData: FormData,
): ParseResult<PublicRegistrationInput> {
  const registrationResult = parseFormData(publicRegistrationSchema, formData, {
    tournament_id: "invalid-tournament-id",
    participant_type: "invalid-participant-type",
    display_name: "invalid-display-name",
    contact_email: "invalid-contact-email",
  })

  if (!registrationResult.ok) return registrationResult

  if (registrationResult.data.participant_type !== "team") {
    return { ok: true, data: { ...registrationResult.data, roster: null } }
  }

  const rosterResult = teamRosterSchema.safeParse({
    captain_nickname: formData.get("captain_nickname"),
    main_players: [1, 2, 3, 4, 5].map((index) =>
      formData.get(`roster_main_${index}`),
    ),
    substitutes: [1, 2].map((index) => formData.get(`roster_sub_${index}`)),
  })

  if (!rosterResult.success) {
    const issue = rosterResult.error.issues[0]
    return {
      ok: false,
      error: issue?.message || "invalid-roster",
    }
  }

  return {
    ok: true,
    data: {
      ...registrationResult.data,
      roster: {
        captain_nickname: rosterResult.data.captain_nickname,
        main_players: rosterResult.data.main_players,
        substitutes: rosterResult.data.substitutes.filter(
          (nickname): nickname is string => Boolean(nickname),
        ),
      },
    },
  }
}

export function parseRegistrationDecisionFormData(
  formData: FormData,
): ParseResult<RegistrationDecisionInput> {
  return parseFormData(registrationDecisionSchema, formData, {
    id: "missing-id",
    status: "invalid-status",
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

  if (typeof issue?.message === "string" && issue.message.startsWith("invalid-")) {
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

function optionalEmailString() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : null
    },
    z.string().email().nullable(),
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

function optionalNonNegativeInteger() {
  return z.preprocess(
    toOptionalNumber,
    z.union([z.number().int().min(0), z.null()]),
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
    z.enum(MATCH_STATUSES),
  )
}

function participantTypeSchema() {
  return z.enum(participantTypes)
}

function winnerSelectionSchema() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return ""

      const normalized = value.trim()
      return isWinnerSelection(normalized) ? normalized : value
    },
    z.union([
      z.literal(""),
      z.literal("participant_1"),
      z.literal("participant_2"),
    ]),
  )
}

function optionalDateInput() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : null
    },
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`)
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
      })
      .nullable(),
  )
}

function optionalTimeInput() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : null
    },
    z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  )
}

function optionalDateTimeInput() {
  return z.preprocess(
    parseUtcDateTimeInput,
    z
      .string()
      .refine((value) => parseUtcDateTimeInput(value) !== null)
      .nullable(),
  )
}

function timezoneSchema() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return DEFAULT_MATCH_TIMEZONE

      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : DEFAULT_MATCH_TIMEZONE
    },
    z.string().refine((value) => normalizeTimeZone(value) === value),
  )
}

function normalizeRosterNickname(value: string) {
  return value.trim().toLowerCase()
}

function checkboxBoolean() {
  return z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  )
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
