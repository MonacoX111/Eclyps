export type CheckInWindowState = "soon" | "open" | "closed"

export const CHECK_IN_DISPLAY_TIME_ZONE = "Europe/Kyiv"
export const CHECK_IN_DISPLAY_TIME_ZONE_LABEL = "Kyiv Time"

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

export function parseKyivDateTimeInput(value: unknown) {
  if (typeof value !== "string") return null

  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) return null
  if (hasTimezoneDesignator(trimmedValue)) return parseUtcDateTimeInput(trimmedValue)

  const match = trimmedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  )

  if (!match) return null

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] =
    match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  const second = Number(secondValue ?? "0")
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  const offset = getKyivOffsetMinutes(utcGuess)
  const timestamp = utcGuess - offset * 60_000

  if (!Number.isFinite(timestamp)) return null

  return new Date(timestamp).toISOString()
}

export function formatUtcDateTimeInput(value: string | null | undefined) {
  const timestamp = readUtcTimestamp(value)
  return timestamp ? new Date(timestamp).toISOString().slice(0, 16) : ""
}

export function formatKyivDateTimeInput(value: string | null | undefined) {
  const timestamp = readUtcTimestamp(value)
  if (!timestamp) return ""

  const parts = getKyivDateTimeParts(timestamp)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function formatKyivCheckInDate(value: string | null | undefined, lang: string = "uk") {
  const timestamp = readUtcTimestamp(value)
  if (!timestamp) return value ?? (lang === "en" ? "soon" : "незабаром")

  const locale = lang === "en" ? "en-US" : "uk-UA"
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CHECK_IN_DISPLAY_TIME_ZONE,
  }).format(new Date(timestamp))
}

export function formatKyivCheckInDateWithLabel(value: string | null | undefined, lang: string = "uk") {
  const label = lang === "en" ? "Kyiv Time" : "за київським часом"
  return `${formatKyivCheckInDate(value, lang)} ${label}`
}

export function readUtcTimestamp(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return null

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function hasTimezoneDesignator(value: string) {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
}

function getKyivDateTimeParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHECK_IN_DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp))

  return {
    year: readDateTimePart(parts, "year"),
    month: readDateTimePart(parts, "month"),
    day: readDateTimePart(parts, "day"),
    hour: normalizeHour(readDateTimePart(parts, "hour")),
    minute: readDateTimePart(parts, "minute"),
  }
}

function getKyivOffsetMinutes(timestamp: number) {
  const parts = getKyivDateTimeParts(timestamp)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  )

  return (asUtc - timestamp) / 60_000
}

function readDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return parts.find((part) => part.type === type)?.value ?? "00"
}

function normalizeHour(value: string) {
  return value === "24" ? "00" : value
}
