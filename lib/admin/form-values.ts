import "server-only"

const VALID_STATUSES = ["upcoming", "live", "finished"] as const

export type ValidStatus = (typeof VALID_STATUSES)[number]
export type ParticipantType = "team" | "player"

export function readRequiredString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

export function readOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

export function readOptionalStringArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null

  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  return values.length > 0 ? values : null
}

export function readPositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function readNonNegativeInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export function readOptionalInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) return null

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : undefined
}

export function readValidStatus(value: FormDataEntryValue | null): ValidStatus | null {
  if (typeof value !== "string") return null

  const normalized = value.trim().toLowerCase()

  return VALID_STATUSES.includes(normalized as ValidStatus)
    ? (normalized as ValidStatus)
    : null
}

export function readParticipantType(value: FormDataEntryValue | null): ParticipantType | null {
  return value === "team" || value === "player" ? value : null
}

export function readOptionalPositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) return null

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
