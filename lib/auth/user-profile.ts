import "server-only"

import type { User } from "@supabase/supabase-js"
import { buildDiscordAvatarUrl, isSafeAvatarUrl } from "@/lib/avatar"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type UserProfile = {
  id: string
  auth_user_id: string
  discord_id: string
  discord_username: string
  display_name: string
  avatar_url: string | null
  onboarding_seen_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type UserProfileSyncResult = {
  profile: UserProfile | null
  refreshedFromDiscord: boolean
}

export async function getCurrentUserProfile() {
  const result = await syncCurrentUserProfile()
  return result.profile
}

export async function syncCurrentUserProfile(): Promise<UserProfileSyncResult> {
  const supabase = await createSupabaseServerClient()
  const [{ data, error }, sessionResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])

  if (error || !data.user) {
    return { profile: null, refreshedFromDiscord: false }
  }

  return upsertUserProfileFromAuthUser(data.user, sessionResult.data.session?.provider_token)
}

export async function upsertUserProfileFromAuthUser(user: User, providerToken?: string | null): Promise<UserProfileSyncResult> {
  const profileInput = await readDiscordProfile(user, providerToken)
  if (!profileInput) return { profile: null, refreshedFromDiscord: false }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return { profile: null, refreshedFromDiscord: false }

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
    .select("id, auth_user_id, discord_id, discord_username, display_name, avatar_url, onboarding_seen_at, created_at, updated_at")
    .maybeSingle()

  if (error || !data) {
    logSupabaseError("Failed to sync Discord user profile:", error)
    return { profile: null, refreshedFromDiscord: profileInput.refreshedFromDiscord }
  }

  // Synchronize a global player profile for the user
  try {
    const userProfileId = data.id
    // Query for existing player record using user_id or owner_user_id
    const { data: existingPlayer, error: playerFetchError } = await supabaseAdmin
      .from("players")
      .select("id, status, user_id, owner_user_id")
      .or(`user_id.eq.${user.id},owner_user_id.eq.${userProfileId}`)
      .limit(1)
      .maybeSingle()

    if (playerFetchError) {
      logSupabaseError("Failed to query existing player profile during auth sync:", playerFetchError)
    } else if (existingPlayer) {
      // Update existing player record without overwriting user-authored display fields.
      const { error: playerUpdateError } = await supabaseAdmin
        .from("players")
        .update({
          avatar_url: profileInput.avatarUrl,
          user_id: user.id,
          owner_user_id: userProfileId,
        })
        .eq("id", existingPlayer.id)

      if (playerUpdateError) {
        logSupabaseError("Failed to update existing player profile during auth sync:", playerUpdateError)
      }
    } else {
      // Create new pending player profile
      const { error: playerInsertError } = await supabaseAdmin
        .from("players")
        .insert({
          user_id: user.id,
          owner_user_id: userProfileId,
          name: profileInput.displayName,
          nickname: profileInput.displayName,
          display_name: profileInput.displayName,
          avatar_url: profileInput.avatarUrl,
          status: "pending",
          tournament_id: null,
          wins: 0,
          losses: 0,
        })

      if (playerInsertError) {
        logSupabaseError("Failed to insert pending player profile during auth sync:", playerInsertError)
      }
    }
  } catch (err) {
    console.error("Unexpected error syncing global player profile:", err)
  }

  return {
    profile: normalizeUserProfile(data),
    refreshedFromDiscord: profileInput.refreshedFromDiscord,
  }
}

async function readDiscordProfile(user: User, providerToken?: string | null) {
  const metadata = user.user_metadata
  const identityData =
    user.identities?.find((identity) => identity.provider === "discord")
      ?.identity_data ?? {}
  const discordUser = await fetchDiscordCurrentUser(providerToken)

  const discordId =
    readString(discordUser?.id) ??
    readString(identityData.provider_id) ??
    readString(identityData.sub) ??
    readString(metadata.provider_id) ??
    readString(metadata.sub)
  const username =
    formatDiscordUsername(discordUser) ??
    readString(identityData.user_name) ??
    readString(identityData.preferred_username) ??
    readString(identityData.name) ??
    readString(metadata.user_name) ??
    readString(metadata.preferred_username) ??
    readString(metadata.name)

  if (!discordId || !username) return null

  const displayName =
    readString(discordUser?.global_name) ??
    readString(identityData.full_name) ??
    readString(identityData.global_name) ??
    readString(metadata.full_name) ??
    readString(metadata.global_name) ??
    username

  const avatarUrl =
    buildDiscordAvatarUrl(discordId, readString(discordUser?.avatar)) ??
    readAvatarUrl(identityData.avatar_url) ??
    readAvatarUrl(identityData.picture) ??
    readAvatarUrl(metadata.avatar_url) ??
    readAvatarUrl(metadata.picture) ??
    buildDiscordAvatarUrl(
      discordId,
      readString(identityData.avatar) ?? readString(metadata.avatar),
    )

  return {
    discordId,
    discordUsername: username,
    displayName,
    avatarUrl,
    refreshedFromDiscord: Boolean(discordUser),
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
    onboarding_seen_at: readString(record.onboarding_seen_at),
    created_at: readString(record.created_at),
    updated_at: readString(record.updated_at),
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function readAvatarUrl(value: unknown) {
  const avatarUrl = readString(value)
  return isSafeAvatarUrl(avatarUrl) ? avatarUrl : null
}

type DiscordCurrentUser = {
  id?: unknown
  username?: unknown
  discriminator?: unknown
  global_name?: unknown
  avatar?: unknown
}

async function fetchDiscordCurrentUser(providerToken: string | null | undefined): Promise<DiscordCurrentUser | null> {
  const token = readString(providerToken)
  if (!token) return null

  try {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.warn("Discord profile refresh skipped:", {
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const data = await response.json()
    return data && typeof data === "object" ? data as DiscordCurrentUser : null
  } catch (error) {
    console.warn("Discord profile refresh failed:", error)
    return null
  }
}

function formatDiscordUsername(discordUser: DiscordCurrentUser | null) {
  if (!discordUser) return null

  const username = readString(discordUser.username)
  if (!username) return null

  const discriminator = readString(discordUser.discriminator)
  return discriminator ? `${username}#${discriminator}` : username
}

function logSupabaseError(context: string, error: unknown) {
  if (error && typeof error === "object") {
    const err = error as { message?: string; details?: string; hint?: string; code?: string }
    console.error(context, {
      message: err.message ?? "No message",
      details: err.details ?? "No details",
      hint: err.hint ?? "No hint",
      code: err.code ?? "No code",
      raw: JSON.stringify(error),
    })
    return
  }
  console.error(context, error)
}
