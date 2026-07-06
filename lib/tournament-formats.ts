export const TOURNAMENT_FORMATS = [
  "single_elimination",
  "double_elimination",
  "round_robin",
  "swiss",
  "groups_then_playoffs",
  "battle_royale",
  "free_for_all",
] as const

export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number]

export const DEFAULT_TOURNAMENT_FORMAT: TournamentFormat = "single_elimination"

export type TournamentFormatConfig = {
  matches_per_opponent: number
  points_win: number
  points_draw: number
  points_loss: number
  swiss_rounds: number | null
  group_count: number | null
  advancing_per_group: number
  third_place_match: boolean
  grand_final_reset: boolean
  lobby_size: number | null
  scoring_model: "match_wins" | "points" | "placement" | "kills_and_placement"
}

export type TournamentFormatDefinition = {
  id: TournamentFormat
  label: string
  shortLabel: string
  description: string
  minParticipants: number
  maxParticipants: number | null
  matchGeneration: "bracket" | "table" | "rounds" | "leaderboard"
  isImplemented: boolean
  configurableFields: readonly (keyof TournamentFormatConfig)[]
  defaultConfig: TournamentFormatConfig
}

const BASE_CONFIG: TournamentFormatConfig = {
  matches_per_opponent: 1,
  points_win: 3,
  points_draw: 1,
  points_loss: 0,
  swiss_rounds: null,
  group_count: null,
  advancing_per_group: 2,
  third_place_match: false,
  grand_final_reset: true,
  lobby_size: null,
  scoring_model: "match_wins",
}

export const TOURNAMENT_FORMAT_DEFINITIONS: readonly TournamentFormatDefinition[] = [
  {
    id: "single_elimination",
    label: "Single Elimination",
    shortLabel: "Single Elim",
    description: "One loss eliminates a participant. This is the currently supported bracket engine.",
    minParticipants: 2,
    maxParticipants: 16,
    matchGeneration: "bracket",
    isImplemented: true,
    configurableFields: ["third_place_match"],
    defaultConfig: { ...BASE_CONFIG, third_place_match: false },
  },
  {
    id: "double_elimination",
    label: "Double Elimination",
    shortLabel: "Double Elim",
    description: "Participants move to a lower bracket after their first loss and are eliminated after the second.",
    minParticipants: 4,
    maxParticipants: 16,
    matchGeneration: "bracket",
    isImplemented: true,
    configurableFields: ["grand_final_reset"],
    defaultConfig: { ...BASE_CONFIG, grand_final_reset: true },
  },
  {
    id: "round_robin",
    label: "Round Robin",
    shortLabel: "Round Robin",
    description: "Every participant plays every other participant; standings decide final placement.",
    minParticipants: 3,
    maxParticipants: 32,
    matchGeneration: "table",
    isImplemented: true,
    configurableFields: ["matches_per_opponent", "points_win", "points_draw", "points_loss"],
    defaultConfig: { ...BASE_CONFIG, matches_per_opponent: 1, scoring_model: "points" },
  },
  {
    id: "swiss",
    label: "Swiss",
    shortLabel: "Swiss",
    description: "Participants with similar records are paired across multiple rounds without immediate elimination.",
    minParticipants: 4,
    maxParticipants: 128,
    matchGeneration: "rounds",
    isImplemented: true,
    configurableFields: ["swiss_rounds", "points_win", "points_draw", "points_loss"],
    defaultConfig: { ...BASE_CONFIG, swiss_rounds: null, scoring_model: "points" },
  },
  {
    id: "groups_then_playoffs",
    label: "Groups + Playoffs",
    shortLabel: "Groups",
    description: "Participants start in groups; top performers advance into a playoff bracket.",
    minParticipants: 8,
    maxParticipants: 128,
    matchGeneration: "table",
    isImplemented: true,
    configurableFields: ["group_count", "advancing_per_group", "matches_per_opponent", "points_win", "points_draw", "points_loss"],
    defaultConfig: { ...BASE_CONFIG, group_count: 2, advancing_per_group: 2, matches_per_opponent: 1, scoring_model: "points" },
  },
  {
    id: "battle_royale",
    label: "Battle Royale",
    shortLabel: "BR",
    description: "Many participants play in shared lobbies; a leaderboard determines standings.",
    minParticipants: 8,
    maxParticipants: null,
    matchGeneration: "leaderboard",
    isImplemented: true,
    configurableFields: ["lobby_size", "matches_per_opponent", "scoring_model"],
    defaultConfig: { ...BASE_CONFIG, lobby_size: 16, scoring_model: "kills_and_placement" },
  },
  {
    id: "free_for_all",
    label: "Free-for-All",
    shortLabel: "FFA",
    description: "Multiple participants compete in the same match or lobby; scoring is placement-based.",
    minParticipants: 3,
    maxParticipants: null,
    matchGeneration: "leaderboard",
    isImplemented: true,
    configurableFields: ["lobby_size", "matches_per_opponent", "scoring_model"],
    defaultConfig: { ...BASE_CONFIG, lobby_size: 8, scoring_model: "placement" },
  },
] as const

const FORMAT_SET = new Set<string>(TOURNAMENT_FORMATS)
const SCORING_MODELS = new Set<TournamentFormatConfig["scoring_model"]>([
  "match_wins",
  "points",
  "placement",
  "kills_and_placement",
])

export function isTournamentFormat(value: unknown): value is TournamentFormat {
  return typeof value === "string" && FORMAT_SET.has(value)
}

export function normalizeTournamentFormat(value: unknown): TournamentFormat {
  return isTournamentFormat(value) ? value : DEFAULT_TOURNAMENT_FORMAT
}

export function getTournamentFormatDefinition(value: unknown): TournamentFormatDefinition {
  const format = normalizeTournamentFormat(value)
  return TOURNAMENT_FORMAT_DEFINITIONS.find((definition) => definition.id === format) ?? TOURNAMENT_FORMAT_DEFINITIONS[0]
}

export function getTournamentFormatLabel(value: unknown) {
  return getTournamentFormatDefinition(value).label
}

export function isSingleEliminationFormat(value: unknown): value is "single_elimination" {
  return normalizeTournamentFormat(value) === "single_elimination"
}

export function normalizeTournamentFormatConfig(
  formatValue: unknown,
  input: unknown,
): TournamentFormatConfig {
  const definition = getTournamentFormatDefinition(formatValue)
  const source = isPlainObject(input) ? input : {}
  const defaults = definition.defaultConfig

  return {
    matches_per_opponent: clampInteger(source.matches_per_opponent, defaults.matches_per_opponent, 1, 4),
    points_win: clampInteger(source.points_win, defaults.points_win, 0, 20),
    points_draw: clampInteger(source.points_draw, defaults.points_draw, 0, 20),
    points_loss: clampInteger(source.points_loss, defaults.points_loss, 0, 20),
    swiss_rounds: nullableInteger(source.swiss_rounds, defaults.swiss_rounds, 1, 20),
    group_count: nullableInteger(source.group_count, defaults.group_count, 2, 32),
    advancing_per_group: clampInteger(source.advancing_per_group, defaults.advancing_per_group, 1, 16),
    third_place_match: readBoolean(source.third_place_match, defaults.third_place_match),
    grand_final_reset: readBoolean(source.grand_final_reset, defaults.grand_final_reset),
    lobby_size: nullableInteger(source.lobby_size, defaults.lobby_size, 2, 512),
    scoring_model: readScoringModel(source.scoring_model, defaults.scoring_model),
  }
}

export function getDefaultTournamentFormatConfig(formatValue: unknown): TournamentFormatConfig {
  return normalizeTournamentFormatConfig(formatValue, getTournamentFormatDefinition(formatValue).defaultConfig)
}

export function buildTournamentFormatConfigFromFormData(
  formatValue: unknown,
  formData: Pick<FormData, "get" | "getAll">,
): TournamentFormatConfig {
  const definition = getTournamentFormatDefinition(formatValue)
  const getLast = (name: string) => {
    const values = formData.getAll(name)
    return values.length > 0 ? values[values.length - 1] : formData.get(name)
  }

  return normalizeTournamentFormatConfig(definition.id, {
    matches_per_opponent: getLast("config_matches_per_opponent"),
    points_win: getLast("config_points_win"),
    points_draw: getLast("config_points_draw"),
    points_loss: getLast("config_points_loss"),
    swiss_rounds: getLast("config_swiss_rounds"),
    group_count: getLast("config_group_count"),
    advancing_per_group: getLast("config_advancing_per_group"),
    third_place_match: getLast("config_third_place_match"),
    grand_final_reset: getLast("config_grand_final_reset"),
    lobby_size: getLast("config_lobby_size"),
    scoring_model: getLast("config_scoring_model"),
  })
}

export function validateTournamentFormatSetup(
  formatValue: unknown,
  participantSlots: number | null | undefined,
  configValue: unknown,
): string | null {
  const definition = getTournamentFormatDefinition(formatValue)
  const config = normalizeTournamentFormatConfig(definition.id, configValue)
  const slots = typeof participantSlots === "number" && Number.isInteger(participantSlots) ? participantSlots : 0

  if (slots < definition.minParticipants) return "invalid-format-min-participants"
  if (definition.maxParticipants !== null && slots > definition.maxParticipants) return "invalid-format-max-participants"

  if (definition.id === "single_elimination" && !isPowerOfTwo(slots)) return "invalid-single-elimination-slots"

  if (definition.id === "groups_then_playoffs") {
    if (!config.group_count || config.group_count < 2) return "invalid-group-count"
    if (config.group_count > slots) return "invalid-group-count"
    if (slots / config.group_count < 3) return "invalid-group-size"
    if (config.advancing_per_group * config.group_count > slots) return "invalid-advancing-slots"
  }

  if ((definition.id === "battle_royale" || definition.id === "free_for_all") && config.lobby_size !== null) {
    if (config.lobby_size < 2) return "invalid-lobby-size"
    if (config.lobby_size > slots) return "invalid-lobby-size"
  }

  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "on", "yes"].includes(normalized)) return true
    if (["false", "0", "off", "no", ""].includes(normalized)) return false
  }
  return fallback
}

function readScoringModel(value: unknown, fallback: TournamentFormatConfig["scoring_model"]) {
  return typeof value === "string" && SCORING_MODELS.has(value as TournamentFormatConfig["scoring_model"])
    ? (value as TournamentFormatConfig["scoring_model"])
    : fallback
}

function nullableInteger(value: unknown, fallback: number | null, min: number, max: number) {
  if (value === null || value === undefined || value === "") return fallback
  return clampInteger(value, fallback ?? min, min, max)
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  if (!Number.isFinite(numberValue)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(numberValue)))
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0
}
