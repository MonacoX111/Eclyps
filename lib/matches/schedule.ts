export const DEFAULT_MATCH_TIMEZONE = "Europe/Kyiv"
export const MATCH_TIME_TBA_LABEL = "Time TBA"

export type MatchScheduleInput = {
  scheduled_at: string | null
  timezone: string | null
  schedule_note: string | null
}

export function formatMatchScheduleTime({
  scheduledAt,
  timezone,
  scheduleNote,
  lang = "uk",
}: {
  scheduledAt: string | null
  timezone: string | null
  scheduleNote: string | null
  lang?: string
}) {
  const tbaLabel = lang === "en" ? "Time TBA" : "Час не оголошено"

  if (!scheduledAt) {
    return scheduleNote || tbaLabel
  }

  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) {
    return scheduleNote || tbaLabel
  }

  const locale = lang === "en" ? "en-US" : "uk-UA"
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: normalizeTimeZone(timezone),
    timeZoneName: "short",
  }).format(date)
}

export function getScheduleDateInputValue(scheduledAt: string | null | undefined) {
  return getScheduleInputParts(scheduledAt).date
}

export function getScheduleTimeInputValue(scheduledAt: string | null | undefined) {
  return getScheduleInputParts(scheduledAt).time
}

export function getScheduleDateInputValueForTimeZone(
  scheduledAt: string | null | undefined,
  timezone: string | null | undefined,
) {
  return getScheduleInputParts(scheduledAt, timezone).date
}

export function getScheduleTimeInputValueForTimeZone(
  scheduledAt: string | null | undefined,
  timezone: string | null | undefined,
) {
  return getScheduleInputParts(scheduledAt, timezone).time
}

export function parseMatchScheduleInput({
  scheduleDate,
  scheduleTime,
  timezone,
}: {
  scheduleDate: string | null
  scheduleTime: string | null
  timezone: string | null | undefined
}) {
  if (!scheduleDate || !scheduleTime) return null

  const match = `${scheduleDate}T${scheduleTime}`.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  )
  if (!match) return null

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute)
  const offset = getTimeZoneOffsetMinutes(
    utcGuess,
    normalizeTimeZone(timezone),
  )
  const timestamp = utcGuess - offset * 60_000

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

export function normalizeTimeZone(value: string | null | undefined) {
  if (!value) return DEFAULT_MATCH_TIMEZONE

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return value
  } catch {
    return DEFAULT_MATCH_TIMEZONE
  }
}

function getScheduleInputParts(
  scheduledAt: string | null | undefined,
  timezone?: string | null,
) {
  if (!scheduledAt) return { date: "", time: "" }

  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return { date: "", time: "" }

  const parts = getTimeZoneDateTimeParts(date.getTime(), normalizeTimeZone(timezone))

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

function getTimeZoneOffsetMinutes(timestamp: number, timeZone: string) {
  const parts = getTimeZoneDateTimeParts(timestamp, timeZone)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  )

  return (asUtc - timestamp) / 60_000
}

function getTimeZoneDateTimeParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
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

function readDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return parts.find((part) => part.type === type)?.value ?? "00"
}

function normalizeHour(value: string) {
  return value === "24" ? "00" : value
}
