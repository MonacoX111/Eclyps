"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCurrentUserProfile, syncCurrentUserProfile } from "@/lib/auth/user-profile"
import { getPublicEnv } from "@/lib/env/public"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type ActionResponse = {
  ok: boolean
  error?: string
}

export async function loginWithDiscord() {
  const supabase = await createSupabaseServerClient()
  const origin = await getSiteOrigin()
  const callbackUrl = new URL("/auth/callback", origin)
  callbackUrl.searchParams.set("next", "/registration#registration")

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: "identify email",
    },
  })

  if (error || !data.url) {
    redirect("/registration?registrationError=discord-login-failed#registration")
  }

  redirect(data.url)
}

export async function logoutDiscord() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  revalidatePath("/")
  revalidatePath("/account")
  revalidatePath("/registration")

  redirect("/")
}

/**
 * Server Action to securely update the current logged-in player's profile.
 * Only allows editing of safe fields: nickname, display_name, real_name, and region.
 */
export async function updateOwnPlayerProfile(formData: FormData): Promise<ActionResponse> {
  try {
    // 1. Verify authenticated user
    const userProfile = await getCurrentUserProfile()
    if (!userProfile) {
      return { ok: false, error: "unauthorized" }
    }

    const nicknameInput = formData.get("nickname") as string | null
    const realNameInput = formData.get("real_name") as string | null
    const regionInput = formData.get("region") as string | null

    const trimmedNickname = nicknameInput?.trim() || null
    const trimmedRealName = realNameInput?.trim() || null
    const trimmedRegion = regionInput?.trim() || null

    const supabaseAdmin = createSupabaseAdminClient()
    if (!supabaseAdmin) {
      return { ok: false, error: "admin-client-unavailable" }
    }

    // 2. Resolve current user's global player profile to ensure strict ownership
    const { data: player, error: playerError } = await supabaseAdmin
      .from("players")
      .select("id, name")
      .eq("owner_user_id", userProfile.id)
      .maybeSingle()

    if (playerError || !player) {
      console.error("updateOwnPlayerProfile: Player profile not found for user profile:", userProfile.id, playerError)
      return { ok: false, error: "player-profile-not-found" }
    }

    // 3. Update ONLY the allowed safe fields in the players table
    // It is physically impossible to modify status, seed, rating, wins, losses, user_id, or owner_user_id.
    const { error: updateError } = await supabaseAdmin
      .from("players")
      .update({
        nickname: trimmedNickname,
        display_name: trimmedNickname || player.name, // Display name is public nickname or fallback
        real_name: trimmedRealName,
        region: trimmedRegion,
      })
      .eq("id", player.id)

    if (updateError) {
      console.error("updateOwnPlayerProfile: Failed to update players table:", updateError)
      return { ok: false, error: updateError.message }
    }

    // 4. Secure participant sync: Sync only safe display fields (display_name, region)
    // where source_player_id matches the resolved player ID.
    // Does not touch participant ID, tournament ID, seed, wins/losses, or bracket fields.
    const { error: participantSyncError } = await supabaseAdmin
      .from("participants")
      .update({
        display_name: trimmedNickname || player.name,
        region: trimmedRegion,
      })
      .eq("source_player_id", player.id)

    if (participantSyncError) {
      console.error("updateOwnPlayerProfile: Warning - Failed to sync participants:", participantSyncError)
      // Do not block player profile update if participant mirroring fails
    }

    revalidatePath("/account")
    revalidatePath("/")

    return { ok: true }
  } catch (err) {
    console.error("updateOwnPlayerProfile: Unexpected exception:", err)
    return { ok: false, error: "unexpected-error" }
  }
}

export async function refreshDiscordProfile() {
  const result = await syncCurrentUserProfile()

  if (!result.profile) {
    redirect("/account?discordRefresh=error")
  }

  revalidatePath("/account")
  revalidatePath("/")

  redirect(result.refreshedFromDiscord ? "/account?discordRefresh=updated" : "/account?discordRefresh=stale")
}

async function getSiteOrigin() {
  const publicEnv = getPublicEnv()
  if (publicEnv.siteUrl) return publicEnv.siteUrl

  const headerStore = await headers()
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const protocol = headerStore.get("x-forwarded-proto") ?? "http"

  return host ? `${protocol}://${host}` : "http://localhost:3000"
}
