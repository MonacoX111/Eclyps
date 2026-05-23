export const EVENT_DATE_TBA_LABEL_EN = "Date TBA"
export const EVENT_DATE_TBA_LABEL_UK = "Дата не оголошена"

export function formatEventDate(value: string | null | undefined, lang?: "uk" | "en") {
  return formatDateValue(value, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }, lang)
}

export function formatShortEventDate(value: string | null | undefined, lang?: "uk" | "en") {
  return formatDateValue(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }, lang)
}

export function formatEventMonthYear(value: string | null | undefined, lang?: "uk" | "en") {
  return formatDateValue(value, {
    month: "long",
    year: "numeric",
  }, lang)
}

function formatDateValue(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  lang: "uk" | "en" = "uk",
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return lang === "en" ? EVENT_DATE_TBA_LABEL_EN : EVENT_DATE_TBA_LABEL_UK
  }

  const normalizedValue = value.trim()
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) return normalizedValue

  const locale = lang === "en" ? "en-US" : "uk-UA"
  return new Intl.DateTimeFormat(locale, options).format(date)
}

