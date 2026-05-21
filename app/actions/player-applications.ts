"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function submitPlayerApplication(formData: FormData) {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    redirect("/?registrationError=discord-login-required#registration")
  }

  const requestedNickname = readRequiredFormString(formData, "requested_nickname")
  const requestedRegion = readOptionalFormString(formData, "requested_region")

  if (!requestedNickname) {
    redirect("/?registrationError=invalid-player-application#registration")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/?registrationError=admin-client-unavailable#registration")
  }

  await markOnboardingSeen(userProfile.id)

  const { data: approvedPlayer, error: approvedPlayerError } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("owner_user_id", userProfile.id)
    .limit(1)
    .maybeSingle()

  if (approvedPlayerError && !isMissingApplicationStorageError(approvedPlayerError)) {
    redirect("/?registrationError=mutation-failed#registration")
  }

  if (approvedPlayer) {
    redirect("/?registrationSuccess=player-approved#registration")
  }

  const { data: pendingApplication, error: pendingError } = await supabaseAdmin
    .from("player_applications")
    .select("id")
    .eq("user_profile_id", userProfile.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle()

  if (pendingError && !isMissingApplicationStorageError(pendingError)) {
    redirect("/?registrationError=mutation-failed#registration")
  }

  if (pendingApplication) {
    redirect("/?registrationSuccess=player-application-pending#registration")
  }

  const { error } = await supabaseAdmin
    .from("player_applications")
    .insert({
      user_profile_id: userProfile.id,
      requested_nickname: requestedNickname,
      requested_region: requestedRegion,
      status: "pending",
    })

  if (error) {
    redirect("/?registrationError=mutation-failed#registration")
  }

  revalidatePath("/")
  redirect("/?registrationSuccess=player-application-submitted#registration")
}

export async function dismissPlayerOnboarding() {
  const userProfile = await getCurrentUserProfile()
  if (userProfile) {
    await markOnboardingSeen(userProfile.id)
  }

  revalidatePath("/")
}

async function markOnboardingSeen(userProfileId: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      onboarding_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userProfileId)

  if (error && !isMissingApplicationStorageError(error)) {
    console.error("Failed to mark player onboarding as seen:", error)
  }
}

function readRequiredFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function readOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function isMissingApplicationStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
