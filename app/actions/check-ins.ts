"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getCheckInWindowStateUtc } from "@/lib/check-ins/time"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function checkInTournament(formData: FormData) {
  const tournamentId = readFormString(formData.get("tournament_id"))

  if (!tournamentId) {
    redirect("/?checkInError=invalid-tournament#registration")
  }

  const userProfile = await getCurrentUserProfile()

  if (!userProfile) {
    redirect("/?checkInError=discord-login-required#registration")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/?checkInError=service-unavailable#registration")
  }

  const { data: registration, error: registrationError } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id, tournament_id, participant_type, user_profile_id, status, check_in_status, participant_id, source_team_id, source_player_id")
    .eq("tournament_id", tournamentId)
    .eq("user_profile_id", userProfile.id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (registrationError) {
    console.error("Failed to resolve registration for check-in:", registrationError)
    redirect("/?checkInError=service-unavailable#registration")
  }

  if (!registration) {
    redirect("/?checkInError=registration-required#registration")
  }

  if (registration.status !== "approved" || !registration.participant_id) {
    redirect("/?checkInError=registration-pending#registration")
  }

  if (registration.check_in_status === "checked_in") {
    redirect("/?checkInSuccess=already-checked-in#registration")
  }

  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("tournaments")
    .select("id, status, participant_type, check_in_opens_at, check_in_closes_at")
    .eq("id", tournamentId)
    .maybeSingle()

  if (tournamentError || !tournament) {
    redirect("/?checkInError=invalid-tournament#registration")
  }

  if (tournament.status !== "upcoming") {
    redirect("/?checkInError=check-in-closed#registration")
  }

  if (tournament.participant_type !== registration.participant_type) {
    redirect("/?checkInError=ownership-required#registration")
  }

  const windowState = getCheckInWindowStateUtc({
    opensAt: tournament.check_in_opens_at,
    closesAt: tournament.check_in_closes_at,
  })

  if (windowState !== "open") {
    redirect(
      windowState === "soon"
        ? "/?checkInError=check-in-not-open#registration"
        : "/?checkInError=check-in-closed#registration",
    )
  }

  const ownsRegistration = await verifyOwnership({
    supabaseAdmin,
    userProfileId: userProfile.id,
    participantType: registration.participant_type,
    sourcePlayerId: registration.source_player_id,
    sourceTeamId: registration.source_team_id,
  })

  if (!ownsRegistration) {
    redirect("/?checkInError=ownership-required#registration")
  }

  const nowIso = new Date().toISOString()
  const { data: checkedInRegistration, error: updateError } = await supabaseAdmin
    .from("tournament_registrations")
    .update({
      check_in_status: "checked_in",
      checked_in_at: nowIso,
      checked_in_by_user_profile_id: userProfile.id,
      updated_at: nowIso,
    })
    .eq("id", registration.id)
    .eq("status", "approved")
    .neq("check_in_status", "checked_in")
    .select("id")
    .maybeSingle()

  if (updateError) {
    console.error("Failed to check in registration:", updateError)
    redirect("/?checkInError=service-unavailable#registration")
  }

  if (!checkedInRegistration) {
    redirect("/?checkInSuccess=already-checked-in#registration")
  }

  revalidatePath("/")
  revalidatePath("/admin")
  redirect("/?checkInSuccess=checked-in#registration")
}

async function verifyOwnership({
  supabaseAdmin,
  userProfileId,
  participantType,
  sourcePlayerId,
  sourceTeamId,
}: {
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  userProfileId: string
  participantType: "team" | "player"
  sourcePlayerId: string | null
  sourceTeamId: string | null
}) {
  if (participantType === "player") {
    if (!sourcePlayerId) return false

    const { data, error } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("id", sourcePlayerId)
      .eq("owner_user_id", userProfileId)
      .maybeSingle()

    if (error) {
      console.error("Failed to verify player check-in ownership:", error)
      return false
    }

    return Boolean(data)
  }

  if (!sourceTeamId) return false

  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("id", sourceTeamId)
    .or(`owner_user_id.eq.${userProfileId},captain_user_id.eq.${userProfileId}`)
    .maybeSingle()

  if (error) {
    console.error("Failed to verify team check-in ownership:", error)
    return false
  }

  return Boolean(data)
}

function readFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}
