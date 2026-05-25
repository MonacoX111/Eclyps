"use server"

import { revalidatePath } from "next/cache"
import { logMutationError } from "@/lib/admin/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseRequiredIdFormData } from "./parsers"
import {
  redirectAdminError,
  redirectAdminSuccess,
  requireAdminSession,
  runSupabaseMutation,
} from "./shared"

/**
 * Safely removes a participant from a tournament.
 * 
 * BRACKET SAFETY:
 * Before deleting the participant, we check if they are already assigned to generated matches
 * (via participant_1_id or participant_2_id). If so, we block deletion to prevent orphan nodes,
 * broken final brackets, and next_match_id chain corruption.
 * 
 * GLOBAL PROFILE PROTECTION:
 * This deletes ONLY the row from the public.participants table. Due to ON DELETE SET NULL foreign keys,
 * the global player or team profiles remain fully intact.
 */
export async function deleteParticipant(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")

  if (!parsedId.ok) {
    redirectAdminError("participantError", "missing-id", "participants")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirectAdminError("participantError", "admin-client-unavailable", "participants")
  }

  const participantId = parsedId.data.id

  // 1. Bracket Safety Check: Check if participant is already used in matches
  const { data: matches, error: matchesCheckError } = await supabaseAdmin
    .from("matches")
    .select("id")
    .or(`participant_1_id.eq.${participantId},participant_2_id.eq.${participantId}`)
    .limit(1)

  if (matchesCheckError) {
    logMutationError("verify participant bracket usage", matchesCheckError)
    redirectAdminError("participantError", "mutation-failed", "participants")
  }

  if (matches && matches.length > 0) {
    // Participant is already in active/generated matches
    redirectAdminError("participantError", "participant-used-in-matches", "participants")
  }

  // 2. Perform safe participant removal (does not delete global player/team)
  const { error } = await runSupabaseMutation("delete participant", () =>
    supabaseAdmin.from("participants").delete().eq("id", participantId),
  )

  if (error) {
    logMutationError("delete participant row", error)
    redirectAdminError("participantError", "mutation-failed", "participants")
  }

  revalidatePath("/admin")
  redirectAdminSuccess("participantSuccess", "deleted", "participants")
}

/**
 * Manually registers an existing global player or team to a tournament.
 * 
 * BRACKET SAFETY:
 * Blocks registration if the tournament already has any generated bracket matches
 * to prevent breaking the seeding structure, match pairs, or round chains.
 * 
 * DUPLICATE PROTECTION:
 * Ensures the player/team is not already in the tournament, and confirms the chosen
 * seed (if provided) is positive and not already claimed by another participant.
 * 
 * GLOBAL PROFILE PROTECTION:
 * Inserts only a row in public.participants. Never deletes or modifies players, teams, or user profiles.
 */
export async function addParticipant(formData: FormData) {
  await requireAdminSession()

  const tournamentId = formData.get("tournament_id")?.toString()
  const participantType = formData.get("participant_type")?.toString()
  const participantId = formData.get("participant_id")?.toString()
  const seedRaw = formData.get("seed")?.toString()

  if (!tournamentId || !participantType || !participantId) {
    redirectAdminError("participantError", "invalid-participant-data", "participants")
  }

  if (participantType !== "player" && participantType !== "team") {
    redirectAdminError("participantError", "invalid-participant-data", "participants")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirectAdminError("participantError", "admin-client-unavailable", "participants")
  }

  // 1. Bracket Safety Check: Block additions after bracket matches exist
  const { count: matchesCount, error: matchesError } = await supabaseAdmin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .not("bracket_id", "is", null)

  if (matchesError) {
    logMutationError("verify matches count for add participant", matchesError)
    redirectAdminError("participantError", "mutation-failed", "participants")
  }

  if (matchesCount && matchesCount > 0) {
    redirectAdminError("participantError", "bracket-already-generated", "participants")
  }

  // 2. Parse and validate seed if provided
  let seed: number | null = null
  if (seedRaw && seedRaw.trim() !== "") {
    seed = parseInt(seedRaw, 10)
    if (isNaN(seed) || seed <= 0) {
      redirectAdminError("participantError", "invalid-seed", "participants")
    }

    // Check for duplicate seed in the same tournament
    const { data: duplicateSeed, error: seedError } = await supabaseAdmin
      .from("participants")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("seed", seed)
      .limit(1)

    if (seedError) {
      logMutationError("verify duplicate seed", seedError)
      redirectAdminError("participantError", "mutation-failed", "participants")
    }

    if (duplicateSeed && duplicateSeed.length > 0) {
      redirectAdminError("participantError", "seed-already-used", "participants")
    }
  }

  // 3. Confirm global record exists and fetch its details
  let displayName = ""
  let avatarUrl: string | null = null
  let logoUrl: string | null = null
  let region: string | null = null

  if (participantType === "player") {
    const { data: player, error: playerError } = await supabaseAdmin
      .from("players")
      .select("id, name, nickname, display_name, avatar_url, region")
      .eq("id", participantId)
      .maybeSingle()

    if (playerError) {
      logMutationError("fetch global player for add participant", playerError)
      redirectAdminError("participantError", "mutation-failed", "participants")
    }

    if (!player) {
      redirectAdminError("participantError", "player-not-found", "participants")
    }

    displayName = player.nickname || player.name || player.display_name || "Untitled player"
    avatarUrl = player.avatar_url
    region = player.region
  } else {
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("id, name, logo_url")
      .eq("id", participantId)
      .maybeSingle()

    if (teamError) {
      logMutationError("fetch global team for add participant", teamError)
      redirectAdminError("participantError", "mutation-failed", "participants")
    }

    if (!team) {
      redirectAdminError("participantError", "team-not-found", "participants")
    }

    displayName = team.name || "Untitled team"
    logoUrl = team.logo_url
  }

  // 4. Duplicate membership check: Check if player/team is already in this tournament
  const sourceColumn = participantType === "player" ? "source_player_id" : "source_team_id"
  const { data: existingParticipant, error: dupError } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq(sourceColumn, participantId)
    .limit(1)

  if (dupError) {
    logMutationError("check duplicate participant membership", dupError)
    redirectAdminError("participantError", "mutation-failed", "participants")
  }

  if (existingParticipant && existingParticipant.length > 0) {
    redirectAdminError("participantError", "participant-already-exists", "participants")
  }

  // 5. Insert new participant (does not modify global tables)
  const payload = {
    tournament_id: tournamentId,
    participant_type: participantType,
    display_name: displayName,
    seed: seed,
    avatar_url: avatarUrl,
    logo_url: logoUrl,
    region: region,
    source_player_id: participantType === "player" ? participantId : null,
    source_team_id: participantType === "team" ? participantId : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error: insertError } = await runSupabaseMutation("create manual participant", () =>
    supabaseAdmin.from("participants").insert(payload),
  )

  if (insertError) {
    logMutationError("create manual participant row", insertError)
    redirectAdminError("participantError", "mutation-failed", "participants")
  }

  revalidatePath("/admin")
  redirectAdminSuccess("participantSuccess", "created", "participants")
}
