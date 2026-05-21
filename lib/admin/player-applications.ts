import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { getSafeAdminFetchError } from "@/lib/admin/errors"
import { readNullableString, readStringId } from "@/lib/data/normalize"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type AdminPlayerApplication = {
  id: string
  user_profile_id: string
  requested_nickname: string
  requested_region: string | null
  status: "pending" | "approved" | "rejected"
  created_player_id: string | null
  created_at: string | null
  reviewed_at: string | null
  owner_profile: {
    discord_username: string
    display_name: string
    avatar_url: string | null
  } | null
}

export async function getAdminPlayerApplications() {
  noStore()
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    return {
      applications: [] as AdminPlayerApplication[],
      error: "Server-only Supabase admin client is not configured.",
    }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("player_applications")
      .select("id, user_profile_id, requested_nickname, requested_region, status, created_player_id, created_at, reviewed_at, owner_profile:user_profiles!player_applications_user_profile_id_fkey(discord_username, display_name, avatar_url)")
      .order("created_at", { ascending: false })

    if (error && isMissingPlayerApplicationStorageError(error)) {
      return { applications: [], error: null }
    }

    if (error) {
      return {
        applications: [],
        error: getSafeAdminFetchError("player applications", error),
      }
    }

    return {
      applications: (Array.isArray(data) ? data : [])
        .map((row) => normalizePlayerApplication(row as Record<string, unknown>))
        .filter((row): row is AdminPlayerApplication => row !== null),
      error: null,
    }
  } catch (error) {
    return {
      applications: [],
      error: getSafeAdminFetchError("player applications", error),
    }
  }
}

function normalizePlayerApplication(
  row: Record<string, unknown>,
): AdminPlayerApplication | null {
  const id = readStringId(row.id)
  const userProfileId = readStringId(row.user_profile_id)
  const requestedNickname = readNullableString(row.requested_nickname)

  if (!id || !userProfileId || !requestedNickname) return null

  return {
    id,
    user_profile_id: userProfileId,
    requested_nickname: requestedNickname,
    requested_region: readNullableString(row.requested_region),
    status: readApplicationStatus(row.status),
    created_player_id: readStringId(row.created_player_id),
    created_at: readNullableString(row.created_at),
    reviewed_at: readNullableString(row.reviewed_at),
    owner_profile: normalizeOwnerProfile(row.owner_profile),
  }
}

function normalizeOwnerProfile(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null

  const record = row as Record<string, unknown>
  const discordUsername = readNullableString(record.discord_username)
  const displayName = readNullableString(record.display_name)

  if (!discordUsername || !displayName) return null

  return {
    discord_username: discordUsername,
    display_name: displayName,
    avatar_url: readNullableString(record.avatar_url),
  }
}

function readApplicationStatus(value: unknown) {
  return value === "approved" || value === "rejected" ? value : "pending"
}

function isMissingPlayerApplicationStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
