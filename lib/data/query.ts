export function normalizeRows<T>(
  rows: Record<string, unknown>[] | null,
  normalize: (row: Record<string, unknown>) => T | null,
) {
  return (rows ?? []).map(normalize).filter((row): row is T => row !== null)
}
