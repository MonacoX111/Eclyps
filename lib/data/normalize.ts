export function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function readStringId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null
}

export function readNullableInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

export function readNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0
}

export function readPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
}

export function readParticipantType(value: unknown): "team" | "player" {
  return value === "player" ? "player" : "team"
}

export function readMatchStatus(value: unknown): "upcoming" | "live" | "finished" {
  return value === "live" || value === "finished" ? value : "upcoming"
}

export function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => readNullableString(item))
    .filter((item): item is string => item !== null)
}

export function isValidDateString(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return false

  return !Number.isNaN(new Date(value).getTime())
}
