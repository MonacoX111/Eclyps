"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import {
  countApprovedParticipants,
  findActiveRegistrationByName,
  findApprovedParticipantByName,
} from "@/lib/data/registrations"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parsePublicRegistrationFormData } from "@/lib/admin/validation"
import { canManageTeam } from "@/lib/auth/permissions"
import { canRegisterTeamForTournament } from "@/lib/teams/eligibility"

export async function submitTournamentRegistration(formData: FormData) {
  const parsed = parsePublicRegistrationFormData(formData)

  if (!parsed.ok) {
    redirect(`/?registrationError=${parsed.error}#registration`)
  }
  const registrationTypeQuery = `registrationType=${parsed.data.participant_type}`
  const userProfile = await getCurrentUserProfile()

  if (!userProfile) {
    redirect(`/?registrationError=discord-login-required&${registrationTypeQuery}#registration`)
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect(`/?registrationError=admin-client-unavailable&${registrationTypeQuery}#registration`)
  }

  const approvedPlayer = await findApprovedOwnedPlayer(userProfile.id)

  if (!approvedPlayer) {
    const pendingApplication = await findPendingPlayerApplication(userProfile.id)
    redirect(
      `/?registrationError=${
        pendingApplication ? "player-application-pending" : "player-approval-required"
      }&${registrationTypeQuery}#registration`,
    )
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

  let finalPlayerId: string | null = null
  let finalTeamId: string | null = null
  let finalDisplayName = parsed.data.display_name

  if (parsed.data.participant_type === "player") {
    finalPlayerId = approvedPlayer.id
    finalDisplayName = approvedPlayer.nickname ?? approvedPlayer.name

    // Duplicate player check: Check if player_id OR user_profile_id is already registered
    const { data: existingReg, error: existingRegErr } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", parsed.data.tournament_id)
      .or(`player_id.eq.${approvedPlayer.id},user_profile_id.eq.${userProfile.id},source_player_id.eq.${approvedPlayer.id}`)
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle()

    if (existingRegErr) {
      redirect(`/?registrationError=mutation-failed&${registrationTypeQuery}#registration`)
    }

    if (existingReg) {
      redirect(`/?registrationError=already-registered&${registrationTypeQuery}#registration`)
    }
  } else {
    // Team registration
    const teamId = formData.get("team_id") as string | null
    if (!teamId || teamId.trim().length === 0) {
      redirect(`/?registrationError=invalid-team-id&${registrationTypeQuery}#registration`)
    }

    finalTeamId = teamId.trim()

    // 1. Server-side validation: Check that team exists and get its name
    const { data: teamData, error: teamFetchError } = await supabaseAdmin
      .from("teams")
      .select("id, name")
      .eq("id", finalTeamId)
      .maybeSingle()

    if (teamFetchError || !teamData) {
      redirect(`/?registrationError=invalid-team-id&${registrationTypeQuery}#registration`)
    }

    // Do NOT trust client-selected names, resolve from verified DB record!
    finalDisplayName = teamData.name

    // 2. Validate captain role/ownership via canManageTeam helper
    const isManager = await canManageTeam(finalTeamId, approvedPlayer.id)
    if (!isManager) {
      redirect(`/?registrationError=permission-denied&${registrationTypeQuery}#registration`)
    }

    // 3. Validate eligibility using canRegisterTeamForTournament helper
    const eligibility = await canRegisterTeamForTournament(finalTeamId)
    if (!eligibility.allowed) {
      redirect(`/?registrationError=team-ineligible&${registrationTypeQuery}#registration`)
    }

    // 4. Duplicate team check: check both new team_id and legacy source_team_id
    const { data: existingReg, error: existingRegErr } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", parsed.data.tournament_id)
      .or(`team_id.eq.${finalTeamId},source_team_id.eq.${finalTeamId}`)
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle()

    if (existingRegErr) {
      redirect(`/?registrationError=mutation-failed&${registrationTypeQuery}#registration`)
    }

    if (existingReg) {
      redirect(`/?registrationError=already-registered&${registrationTypeQuery}#registration`)
    }
  }

  const { roster, ...registrationPayload } = parsed.data

  const { data: createdRegistration, error } = await supabaseAdmin.from("tournament_registrations").insert({
    ...registrationPayload,
    display_name: finalDisplayName,
    user_profile_id: userProfile.id,
    registration_type: parsed.data.participant_type,
    player_id: finalPlayerId,
    team_id: finalTeamId,
    // Legacy support:
    source_player_id: finalPlayerId,
    source_team_id: finalTeamId,
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

async function findApprovedOwnedPlayer(userProfileId: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from("players")
    .select("id, name, nickname, status")
    .eq("owner_user_id", userProfileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error && !isMissingApplicationStorageError(error)) {
    console.error("Failed to resolve approved player for registration:", error)
    return null
  }

  if (!data || data.status !== "approved") {
    return null
  }

  return {
    id: data.id,
    name: data.name,
    nickname: typeof data.nickname === "string" ? data.nickname : null,
  }
}

async function findPendingPlayerApplication(userProfileId: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return false

  const { data, error } = await supabaseAdmin
    .from("player_applications")
    .select("id")
    .eq("user_profile_id", userProfileId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle()

  if (error && !isMissingApplicationStorageError(error)) {
    console.error("Failed to resolve pending player application:", error)
    return false
  }

  return Boolean(data)
}

function isMissingApplicationStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
