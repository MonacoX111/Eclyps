import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { getSafeAdminFetchError } from "@/lib/admin/errors"
import {
  getRegistrationSelect,
  isMissingRegistrationTableError,
  normalizeRegistration,
  normalizeRegistrationRosterEntry,
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

    const registrations = (Array.isArray(result.data)
        ? (result.data as unknown as Record<string, unknown>[])
        : []
      )
        .map(normalizeRegistration)
        .filter((registration): registration is AdminRegistration => registration !== null)

    await attachRegistrationRosters(supabaseAdmin, registrations)

    return {
      registrations,
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

async function attachRegistrationRosters(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  registrations: AdminRegistration[],
) {
  const registrationIds = registrations.map((registration) => registration.id)
  if (registrationIds.length === 0) return

  const { data, error } = await supabaseAdmin
    .from("tournament_registration_roster_entries")
    .select("id, registration_id, tournament_id, team_participant_id, source_player_id, nickname, roster_role, roster_order, is_captain, created_at")
    .in("registration_id", registrationIds)
    .order("roster_order", { ascending: true })

  if (error) {
    if (isMissingRegistrationStorageError(error)) return

    console.error("Failed to fetch registration rosters:", error)
    return
  }

  const rosterByRegistrationId = new Map<string, AdminRegistration["roster"]>()

  ;(Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [])
    .map(normalizeRegistrationRosterEntry)
    .filter((entry): entry is NonNullable<ReturnType<typeof normalizeRegistrationRosterEntry>> => entry !== null)
    .forEach((entry) => {
      const roster = rosterByRegistrationId.get(entry.registration_id) ?? []
      roster.push(entry)
      rosterByRegistrationId.set(entry.registration_id, roster)
    })

  registrations.forEach((registration) => {
    registration.roster = rosterByRegistrationId.get(registration.id) ?? []
  })
}
