import "server-only"

import { getSafeAdminFetchError } from "@/lib/admin/errors"

export async function runAdminRowsQuery<T>(
  context: string,
  query: () => Promise<{ data: Record<string, unknown>[] | null; error: unknown }>,
  normalize: (row: Record<string, unknown>) => T | null,
) {
  try {
    const { data, error } = await query()

    if (error) {
      return { rows: [] as T[], error: getSafeAdminFetchError(context, error) }
    }

    return {
      rows: (data ?? []).map(normalize).filter((row): row is T => row !== null),
      error: null,
    }
  } catch (error) {
    return { rows: [] as T[], error: getSafeAdminFetchError(context, error) }
  }
}
