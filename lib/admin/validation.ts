import "server-only"

import { z } from "zod"
import { BRACKET_SIZES } from "@/lib/brackets/template"
import { parseKyivDateTimeInput } from "@/lib/check-ins/time"
import { MATCH_STATUSES, isWinnerSelection } from "@/lib/matches/core"
import { DEFAULT_MATCH_TIMEZONE, normalizeTimeZone } from "@/lib/matches/schedule"
import { getGameConfig } from "@/lib/games"

const participantTypes = ["team", "player"] as const
const registrationStatuses = ["approved", "rejected"] as const
const disputeTypes = [
  "no_show",
  "wrong_result",
  "cheating",
  "connection_issue",
  "rule_violation",
  "other",
] as const
const disputeStatuses = ["open", "under_review", "resolved", "rejected"] as const

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
  game_mode: optionalString(),
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
  tournament_id: optionalString(),
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

// Dynamic roster validation is performed during form parsing

export const registrationDecisionSchema = z.object({
  id: requiredString(),
  status: z.enum(registrationStatuses),
})

export const matchDisputeSchema = z.object({
  match_id: requiredString(),
  dispute_type: z.enum(disputeTypes),
  title: requiredString(),
  description: requiredString(),
  evidence_url: optionalUrlString(),
})

export const disputeReviewSchema = z.object({
  id: requiredString(),
  status: z.enum(disputeStatuses),
  admin_note: optionalString(),
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
export type TeamRosterInput = {
  captain_nickname: string
  main_players: string[]
  substitutes: string[]
}
export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema> & {
  roster: TeamRosterInput | null
}
export type RegistrationDecisionInput = z.infer<typeof registrationDecisionSchema>
export type MatchDisputeInput = z.infer<typeof matchDisputeSchema>
export type DisputeReviewInput = z.infer<typeof disputeReviewSchema>

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
  gameName?: string | null,
  gameMode?: string | null,
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

  const gameConfig = getGameConfig(gameName, gameMode)
  const teamSize = gameConfig.teamSize
  const substitutesMax = gameConfig.substitutes

  const mainPlayers: (string | null)[] = []
  for (let i = 1; i <= teamSize; i++) {
    const val = formData.get(`roster_main_${i}`)
    mainPlayers.push(typeof val === "string" ? val : null)
  }

  const substitutes: (string | null)[] = []
  for (let i = 1; i <= substitutesMax; i++) {
    const val = formData.get(`roster_sub_${i}`)
    substitutes.push(typeof val === "string" ? val : null)
  }

  const captainNickname = formData.get("captain_nickname") as string | null

  if (!captainNickname || captainNickname.trim().length === 0) {
    return { ok: false, error: "invalid-roster-captain" }
  }

  const validMainPlayers = mainPlayers.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
  if (validMainPlayers.length < teamSize) {
    return { ok: false, error: "invalid-roster-minimum" }
  }

  const validSubstitutes = substitutes.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
  if (validSubstitutes.length > substitutesMax) {
    return { ok: false, error: "invalid-roster-maximum" }
  }

  const roster = [...validMainPlayers, ...validSubstitutes]
  const normalizedRoster = roster.map(normalizeRosterNickname)

  if (new Set(normalizedRoster).size !== normalizedRoster.length) {
    return { ok: false, error: "duplicate-roster-player" }
  }

  if (!normalizedRoster.includes(normalizeRosterNickname(captainNickname))) {
    return { ok: false, error: "invalid-roster-captain" }
  }

  return {
    ok: true,
    data: {
      ...registrationResult.data,
      roster: {
        captain_nickname: captainNickname.trim(),
        main_players: validMainPlayers.map((p) => p.trim()),
        substitutes: validSubstitutes.map((p) => p.trim()),
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

export function parseMatchDisputeFormData(
  formData: FormData,
): ParseResult<MatchDisputeInput> {
  return parseFormData(matchDisputeSchema, formData, {
    match_id: "invalid-match",
    dispute_type: "invalid-dispute-type",
    title: "invalid-title",
    description: "invalid-description",
    evidence_url: "invalid-evidence-url",
  })
}

export function parseDisputeReviewFormData(
  formData: FormData,
): ParseResult<DisputeReviewInput> {
  return parseFormData(disputeReviewSchema, formData, {
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

function optionalUrlString() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : null
    },
    z.string().url().nullable(),
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
    parseKyivDateTimeInput,
    z
      .string()
      .refine((value) => parseKyivDateTimeInput(value) !== null)
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
