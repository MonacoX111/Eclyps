"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { parseMatchDisputeFormData } from "@/lib/admin/validation"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function submitMatchDispute(formData: FormData) {
  const parsed = parseMatchDisputeFormData(formData)

  if (!parsed.ok) {
    redirect(`/schedule?disputeError=${parsed.error}#schedule`)
  }

  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    redirect("/schedule?disputeError=discord-login-required#schedule")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/schedule?disputeError=service-unavailable#schedule")
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, participant_type, participant_1_id, participant_2_id")
    .eq("id", parsed.data.match_id)
    .maybeSingle()

  if (matchError || !match?.id || !match.tournament_id) {
    redirect("/schedule?disputeError=invalid-match#schedule")
  }

  const participantIds = [match.participant_1_id, match.participant_2_id].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  )

  if (participantIds.length === 0) {
    redirect("/schedule?disputeError=match-not-ready#schedule")
  }

  const { data: registration, error: registrationError } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id, participant_type, participant_id, source_player_id, source_team_id, status")
    .eq("tournament_id", match.tournament_id)
    .eq("user_profile_id", userProfile.id)
    .eq("status", "approved")
    .in("participant_id", participantIds)
    .limit(1)
    .maybeSingle()

  if (registrationError) {
    console.error("Failed to resolve dispute reporter registration:", registrationError)
    redirect("/schedule?disputeError=service-unavailable#schedule")
  }

  if (!registration?.participant_id) {
    redirect("/schedule?disputeError=not-match-participant#schedule")
  }

  const participantType = match.participant_type === "player" ? "player" : "team"
  const ownsParticipant = await verifyReporterOwnership({
    userProfileId: userProfile.id,
    participantType,
    sourcePlayerId:
      typeof registration.source_player_id === "string"
        ? registration.source_player_id
        : null,
    sourceTeamId:
      typeof registration.source_team_id === "string"
        ? registration.source_team_id
        : null,
  })

  if (!ownsParticipant) {
    redirect("/schedule?disputeError=ownership-required#schedule")
  }

  const { data: existingDispute, error: existingError } = await supabaseAdmin
    .from("match_disputes")
    .select("id")
    .eq("match_id", match.id)
    .eq("reporter_user_profile_id", userProfile.id)
    .in("status", ["open", "under_review"])
    .limit(1)
    .maybeSingle()

  if (existingError) {
    console.error("Failed to check duplicate dispute:", existingError)
    redirect("/schedule?disputeError=service-unavailable#schedule")
  }

  if (existingDispute) {
    redirect("/schedule?disputeError=duplicate-open#schedule")
  }

  const { error } = await supabaseAdmin.from("match_disputes").insert({
    tournament_id: match.tournament_id,
    match_id: match.id,
    reporter_user_profile_id: userProfile.id,
    reporter_participant_id: registration.participant_id,
    reporter_player_id:
      participantType === "player" ? registration.source_player_id : null,
    reporter_team_id:
      participantType === "team" ? registration.source_team_id : null,
    participant_type: participantType,
    dispute_type: parsed.data.dispute_type,
    title: parsed.data.title,
    description: parsed.data.description,
    evidence_url: parsed.data.evidence_url,
    status: "open",
  })

  if (error) {
    if (error.code === "23505") {
      redirect("/schedule?disputeError=duplicate-open#schedule")
    }

    console.error("Failed to submit match dispute:", error)
    redirect("/schedule?disputeError=service-unavailable#schedule")
  }

  revalidatePath("/")
  revalidatePath("/schedule")
  revalidatePath("/admin")
  redirect("/schedule?disputeSuccess=submitted#schedule")
}

async function verifyReporterOwnership({
  userProfileId,
  participantType,
  sourcePlayerId,
  sourceTeamId,
}: {
  userProfileId: string
  participantType: "team" | "player"
  sourcePlayerId: string | null
  sourceTeamId: string | null
}) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return false

  if (participantType === "player") {
    if (!sourcePlayerId) return false
    const { data, error } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("id", sourcePlayerId)
      .eq("owner_user_id", userProfileId)
      .maybeSingle()

    if (error) {
      console.error("Failed to verify dispute player ownership:", error)
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
    console.error("Failed to verify dispute team ownership:", error)
    return false
  }

  return Boolean(data)
}
