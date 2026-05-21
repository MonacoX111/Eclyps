import "server-only"

import type { User } from "@supabase/supabase-js"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type UserProfile = {
  id: string
  auth_user_id: string
  discord_id: string
  discord_username: string
  display_name: string
  avatar_url: string | null
  created_at: string | null
  updated_at: string | null
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return null

  return upsertUserProfileFromAuthUser(data.user)
}

export async function upsertUserProfileFromAuthUser(user: User) {
  const profileInput = readDiscordProfile(user)
  if (!profileInput) return null

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        auth_user_id: user.id,
        discord_id: profileInput.discordId,
        discord_username: profileInput.discordUsername,
        display_name: profileInput.displayName,
        avatar_url: profileInput.avatarUrl,
        updated_at: now,
      },
      { onConflict: "auth_user_id" },
    )
    .select("id, auth_user_id, discord_id, discord_username, display_name, avatar_url, created_at, updated_at")
    .maybeSingle()

  if (error) {
    console.error("Failed to sync Discord user profile:", error)
    return null
  }

  return normalizeUserProfile(data)
}

function readDiscordProfile(user: User) {
  const metadata = user.user_metadata
  const identityData =
    user.identities?.find((identity) => identity.provider === "discord")
      ?.identity_data ?? {}

  const discordId =
    readString(identityData.provider_id) ??
    readString(identityData.sub) ??
    readString(metadata.provider_id) ??
    readString(metadata.sub)
  const username =
    readString(identityData.user_name) ??
    readString(identityData.preferred_username) ??
    readString(identityData.name) ??
    readString(metadata.user_name) ??
    readString(metadata.preferred_username) ??
    readString(metadata.name)

  if (!discordId || !username) return null

  const displayName =
    readString(identityData.full_name) ??
    readString(identityData.global_name) ??
    readString(metadata.full_name) ??
    readString(metadata.global_name) ??
    username

  return {
    discordId,
    discordUsername: username,
    displayName,
    avatarUrl:
      readString(identityData.avatar_url) ??
      readString(identityData.picture) ??
      readString(metadata.avatar_url) ??
      readString(metadata.picture),
  }
}

function normalizeUserProfile(row: unknown): UserProfile | null {
  if (!row || typeof row !== "object") return null

  const record = row as Record<string, unknown>
  const id = readString(record.id)
  const authUserId = readString(record.auth_user_id)
  const discordId = readString(record.discord_id)
  const discordUsername = readString(record.discord_username)
  const displayName = readString(record.display_name)

  if (!id || !authUserId || !discordId || !discordUsername || !displayName) {
    return null
  }

  return {
    id,
    auth_user_id: authUserId,
    discord_id: discordId,
    discord_username: discordUsername,
    display_name: displayName,
    avatar_url: readString(record.avatar_url),
    created_at: readString(record.created_at),
    updated_at: readString(record.updated_at),
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}
