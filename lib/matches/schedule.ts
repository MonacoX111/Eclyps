export const DEFAULT_MATCH_TIMEZONE = "UTC"
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

export function normalizeTimeZone(value: string | null | undefined) {
  if (!value) return DEFAULT_MATCH_TIMEZONE

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return value
  } catch {
    return DEFAULT_MATCH_TIMEZONE
  }
}

function getScheduleInputParts(scheduledAt: string | null | undefined) {
  if (!scheduledAt) return { date: "", time: "" }

  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return { date: "", time: "" }

  return {
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
  }
}
