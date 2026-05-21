import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { getSafeAdminFetchError } from "@/lib/admin/errors"
import {
  getRegistrationSelect,
  isMissingRegistrationTableError,
  normalizeRegistration,
  type TournamentRegistrationRecord,
} from "@/lib/data/registrations"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type AdminRegistration = TournamentRegistrationRecord

export type AdminRegistrationQueryResult = {
  registrations: AdminRegistration[]
  error: string | null
}

export async function getAdminRegistrations(): Promise<AdminRegistrationQueryResult> {
  noStore()
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    return {
      registrations: [],
      error: "Server-only Supabase admin client is not configured.",
    }
  }

  try {
    const result = await supabaseAdmin
      .from("tournament_registrations")
      .select(getRegistrationSelect())
      .order("created_at", { ascending: false })

    if (result.error && isMissingRegistrationStorageError(result.error)) {
      return { registrations: [], error: null }
    }

    if (result.error) {
      return {
        registrations: [],
        error: getSafeAdminFetchError("registrations", result.error),
      }
    }

    return {
      registrations: (Array.isArray(result.data)
        ? (result.data as unknown as Record<string, unknown>[])
        : []
      )
        .map(normalizeRegistration)
        .filter((registration): registration is AdminRegistration => registration !== null),
      error: null,
    }
  } catch (error) {
    return {
      registrations: [],
      error: getSafeAdminFetchError("registrations", error),
    }
  }
}

export function isMissingRegistrationStorageError(error: { code?: string }) {
  return isMissingRegistrationTableError(error)
}
