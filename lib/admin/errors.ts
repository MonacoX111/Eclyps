export function getSafeAdminFetchError(context: string, error: unknown) {
  console.error(`Failed to fetch admin ${context}:`, error)
  return "Unable to load data from Supabase."
}

export function logMutationError(context: string, error: unknown) {
  console.error(`Failed to ${context}:`, error)
}
