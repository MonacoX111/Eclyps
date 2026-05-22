export type CheckInWindowState = "soon" | "open" | "closed"

export function getCheckInWindowStateUtc({
  opensAt,
  closesAt,
  now = Date.now(),
}: {
  opensAt: unknown
  closesAt: unknown
  now?: number
}): CheckInWindowState {
  const openTime = readUtcTimestamp(opensAt)
  const closeTime = readUtcTimestamp(closesAt)

  if (!openTime || !closeTime || closeTime <= openTime) return "closed"
  if (now < openTime) return "soon"
  if (now > closeTime) return "closed"

  return "open"
}

export function parseUtcDateTimeInput(value: unknown) {
  if (typeof value !== "string") return null

  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) return null

  const normalizedValue = hasTimezoneDesignator(trimmedValue)
    ? trimmedValue
    : `${trimmedValue}:00.000Z`
  const timestamp = Date.parse(normalizedValue)

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

export function formatUtcDateTimeInput(value: string | null | undefined) {
  const timestamp = readUtcTimestamp(value)
  return timestamp ? new Date(timestamp).toISOString().slice(0, 16) : ""
}

export function formatLocalCheckInDate(value: string | null | undefined) {
  const timestamp = readUtcTimestamp(value)
  if (!timestamp) return value ?? "soon"

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(timestamp))
}

export function readUtcTimestamp(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return null

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function hasTimezoneDesignator(value: string) {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
}
