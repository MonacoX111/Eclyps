export function getSafeAdminFetchError(context: string, error: unknown) {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>
    console.error(`Failed to fetch admin ${context}:`, {
      message: err.message ?? "No message",
      details: err.details ?? "No details",
      hint: err.hint ?? "No hint",
      code: err.code ?? "No code",
      raw: JSON.stringify(error),
    })
  } else {
    console.error(`Failed to fetch admin ${context}:`, error)
  }
  return "Unable to load data from Supabase."
}

export function logMutationError(context: string, error: unknown) {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>
    console.error(`Failed to ${context}:`, {
      message: err.message ?? "No message",
      details: err.details ?? "No details",
      hint: err.hint ?? "No hint",
      code: err.code ?? "No code",
      raw: JSON.stringify(error),
    })
  } else {
    console.error(`Failed to ${context}:`, error)
  }
}
