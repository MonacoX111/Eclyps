export const EVENT_DATE_TBA_LABEL = "Date TBA"

export function formatEventDate(value: string | null | undefined) {
  return formatDateValue(value, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function formatShortEventDate(value: string | null | undefined) {
  return formatDateValue(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatEventMonthYear(value: string | null | undefined) {
  return formatDateValue(value, {
    month: "long",
    year: "numeric",
  })
}

function formatDateValue(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return EVENT_DATE_TBA_LABEL
  }

  const normalizedValue = value.trim()
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) return normalizedValue

  return new Intl.DateTimeFormat("en-US", options).format(date)
}
