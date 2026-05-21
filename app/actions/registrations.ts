"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  countApprovedParticipants,
  findActiveRegistrationByName,
  findApprovedParticipantByName,
} from "@/lib/data/registrations"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parsePublicRegistrationFormData } from "@/lib/admin/validation"

export async function submitTournamentRegistration(formData: FormData) {
  const parsed = parsePublicRegistrationFormData(formData)

  if (!parsed.ok) {
    redirect(`/?registrationError=${parsed.error}#registration`)
  }
  const registrationTypeQuery = `registrationType=${parsed.data.participant_type}`

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect(`/?registrationError=admin-client-unavailable&${registrationTypeQuery}#registration`)
  }

  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("tournaments")
    .select("id, team_count, status, participant_type")
    .eq("id", parsed.data.tournament_id)
    .maybeSingle()

  if (tournamentError || !tournament) {
    redirect(`/?registrationError=invalid-tournament-id&${registrationTypeQuery}#registration`)
  }

  if (tournament.status !== "upcoming") {
    redirect(`/?registrationError=registration-closed&${registrationTypeQuery}#registration`)
  }

  if (
    tournament.participant_type !== "team" &&
    tournament.participant_type !== "player"
  ) {
    redirect(`/?registrationError=invalid-participant-type&${registrationTypeQuery}#registration`)
  }

  if (parsed.data.participant_type !== tournament.participant_type) {
    redirect(`/?registrationError=wrong-participant-type&registrationType=${tournament.participant_type}#registration`)
  }

  const approvedCount = await countApprovedParticipants(
    parsed.data.tournament_id,
    parsed.data.participant_type,
  )
  const { count: pendingCount, error: pendingCountError } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", parsed.data.tournament_id)
    .eq("participant_type", parsed.data.participant_type)
    .eq("status", "pending")

  if (pendingCountError) {
    redirect(`/?registrationError=mutation-failed&${registrationTypeQuery}#registration`)
  }

  const capacity = typeof tournament.team_count === "number" ? tournament.team_count : null

  if (capacity !== null && approvedCount + (pendingCount ?? 0) >= capacity) {
    redirect(`/?registrationError=registration-full&${registrationTypeQuery}#registration`)
  }

  const duplicateResult = await findActiveRegistrationByName(supabaseAdmin, {
    tournamentId: parsed.data.tournament_id,
    participantType: parsed.data.participant_type,
    displayName: parsed.data.display_name,
  })

  if (duplicateResult.error) {
    redirect(`/?registrationError=mutation-failed&${registrationTypeQuery}#registration`)
  }

  if (duplicateResult.registration) {
    redirect(`/?registrationError=duplicate-registration&${registrationTypeQuery}#registration`)
  }

  const approvedDuplicateResult = await findApprovedParticipantByName(supabaseAdmin, {
    tournamentId: parsed.data.tournament_id,
    participantType: parsed.data.participant_type,
    displayName: parsed.data.display_name,
  })

  if (approvedDuplicateResult.error) {
    redirect(`/?registrationError=mutation-failed&${registrationTypeQuery}#registration`)
  }

  if (approvedDuplicateResult.participant) {
    redirect(`/?registrationError=duplicate-registration&${registrationTypeQuery}#registration`)
  }

  const { roster, ...registrationPayload } = parsed.data
  const { data: createdRegistration, error } = await supabaseAdmin.from("tournament_registrations").insert({
    ...registrationPayload,
    status: "pending",
  }).select("id").maybeSingle()

  if (error) {
    if (error.code === "23505") {
      redirect(`/?registrationError=duplicate-registration&${registrationTypeQuery}#registration`)
    }

    redirect(`/?registrationError=mutation-failed&${registrationTypeQuery}#registration`)
  }

  if (parsed.data.participant_type === "team") {
    if (!roster || typeof createdRegistration?.id !== "string") {
      redirect(`/?registrationError=invalid-roster&${registrationTypeQuery}#registration`)
    }

    const rosterRows = [
      ...roster.main_players.map((nickname, index) => ({
        nickname,
        roster_role: "main",
        roster_order: index + 1,
        is_captain:
          normalizeRosterNickname(nickname) ===
          normalizeRosterNickname(roster.captain_nickname),
      })),
      ...roster.substitutes
        .filter((nickname): nickname is string => Boolean(nickname))
        .map((nickname, index) => ({
        nickname,
        roster_role: "substitute",
        roster_order: roster.main_players.length + index + 1,
        is_captain:
          normalizeRosterNickname(nickname) ===
          normalizeRosterNickname(roster.captain_nickname),
      })),
    ]

    const { error: rosterError } = await supabaseAdmin
      .from("tournament_registration_roster_entries")
      .insert(
        rosterRows.map((row) => ({
          registration_id: createdRegistration.id,
          tournament_id: parsed.data.tournament_id,
          ...row,
        })),
      )

    if (rosterError) {
      await supabaseAdmin
        .from("tournament_registrations")
        .delete()
        .eq("id", createdRegistration.id)

      redirect(`/?registrationError=mutation-failed&${registrationTypeQuery}#registration`)
    }
  }

  revalidatePath("/")
  redirect(`/?registrationSuccess=submitted&${registrationTypeQuery}#registration`)
}

function normalizeRosterNickname(value: string) {
  return value.trim().toLowerCase()
}
