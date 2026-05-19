import { formatShortEventDate } from "@/lib/date-format"

export const formatDisplayDate = formatShortEventDate

export function normalizeStatus(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase()

  return normalized === "live" || normalized === "finished" ? normalized : "upcoming"
}

export function formatStatus(status: string | null) {
  const normalized = normalizeStatus(status)

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function formatDisplayDateTime(value: string | null) {
  if (!value) return "???"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
