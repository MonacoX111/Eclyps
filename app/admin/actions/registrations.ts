"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import {
  upsertPlayerParticipant,
  upsertTeamParticipant,
} from "@/lib/admin/participants"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseRegistrationDecisionFormData } from "./parsers"
import { requireAdminSession } from "./shared"

export async function reviewRegistration(formData: FormData) {
  await requireAdminSession()

  const parsed = parseRegistrationDecisionFormData(formData)

  if (!parsed.ok) {
    redirect(`/admin?registrationError=${parsed.error}#registrations`)
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?registrationError=admin-client-unavailable#registrations")
  }

  const { data: registration, error: registrationError } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id, tournament_id, participant_type, display_name, contact_email, contact_handle, region, status")
    .eq("id", parsed.data.id)
    .maybeSingle()

  if (registrationError || !registration) {
    redirect("/admin?registrationError=missing-id#registrations")
  }

  if (registration.status !== "pending") {
    redirect("/admin?registrationError=already-reviewed#registrations")
  }

  if (parsed.data.status === "rejected") {
    await updateRegistrationStatus(supabaseAdmin, parsed.data.id, "rejected")
    revalidateRegistrationPaths()
    redirect("/admin?registrationSuccess=rejected#registrations")
  }

  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("tournaments")
    .select("id, team_count, status")
    .eq("id", registration.tournament_id)
    .maybeSingle()

  if (tournamentError || !tournament) {
    redirect("/admin?registrationError=invalid-tournament-id#registrations")
  }

  if (tournament.status !== "upcoming") {
    redirect("/admin?registrationError=registration-closed#registrations")
  }

  const approvedCount = await countApprovedParticipants(
    supabaseAdmin,
    registration.tournament_id,
    registration.participant_type,
  )

  if (typeof tournament.team_count === "number" && approvedCount >= tournament.team_count) {
    redirect("/admin?registrationError=registration-full#registrations")
  }

  if (
    await hasApprovedParticipantName(
      supabaseAdmin,
      registration.tournament_id,
      registration.participant_type,
      registration.display_name,
    )
  ) {
    redirect("/admin?registrationError=duplicate-registration#registrations")
  }

  const seed = await getNextParticipantSeed(
    supabaseAdmin,
    registration.tournament_id,
    registration.participant_type,
  )
  const source =
    registration.participant_type === "player"
      ? await approvePlayerRegistration(supabaseAdmin, registration, seed)
      : await approveTeamRegistration(supabaseAdmin, registration, seed)

  if (!source) {
    redirect("/admin?registrationError=mutation-failed#registrations")
  }

  const participantId = await findApprovedParticipantId(
    supabaseAdmin,
    registration.participant_type,
    source.id,
  )

  const { error } = await supabaseAdmin
    .from("tournament_registrations")
    .update({
      status: "approved",
      participant_id: participantId,
      source_team_id: registration.participant_type === "team" ? source.id : null,
      source_player_id: registration.participant_type === "player" ? source.id : null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)

  if (error) {
    logMutationError("approve registration", error)
    redirect("/admin?registrationError=mutation-failed#registrations")
  }

  revalidateRegistrationPaths()
  redirect("/admin?registrationSuccess=approved#registrations")
}

async function approveTeamRegistration(
  supabaseAdmin: SupabaseClient,
  registration: {
    tournament_id: string
    display_name: string
  },
  seed: number,
) {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .insert({
      tournament_id: registration.tournament_id,
      name: registration.display_name,
      seed,
      wins: 0,
      losses: 0,
    })
    .select("id")
    .maybeSingle()

  if (error || typeof data?.id !== "string") {
    logMutationError("approve team registration", error)
    return null
  }

  await upsertTeamParticipant(supabaseAdmin, {
    id: data.id,
    tournament_id: registration.tournament_id,
    name: registration.display_name,
    seed,
  })

  return { id: data.id }
}

async function approvePlayerRegistration(
  supabaseAdmin: SupabaseClient,
  registration: {
    tournament_id: string
    display_name: string
    region: string | null
  },
  seed: number,
) {
  const insertPayload = {
    tournament_id: registration.tournament_id,
    name: registration.display_name,
    nickname: null,
    region: registration.region,
    seed,
    wins: 0,
    losses: 0,
  }
  const result = await supabaseAdmin
    .from("players")
    .insert(insertPayload)
    .select("id")
    .maybeSingle()

  if (result.error && isMissingColumnError(result.error)) {
    const { region: _region, ...payloadWithoutRegion } = insertPayload
    const fallbackResult = await supabaseAdmin
      .from("players")
      .insert(payloadWithoutRegion)
      .select("id")
      .maybeSingle()

    if (fallbackResult.error || typeof fallbackResult.data?.id !== "string") {
      logMutationError("approve player registration", fallbackResult.error)
      return null
    }

    await upsertPlayerParticipant(supabaseAdmin, {
      id: fallbackResult.data.id,
      tournament_id: registration.tournament_id,
      name: registration.display_name,
      nickname: null,
      region: registration.region,
      seed,
    })

    return { id: fallbackResult.data.id }
  }

  if (result.error || typeof result.data?.id !== "string") {
    logMutationError("approve player registration", result.error)
    return null
  }

  await upsertPlayerParticipant(supabaseAdmin, {
    id: result.data.id,
    tournament_id: registration.tournament_id,
    name: registration.display_name,
    nickname: null,
    region: registration.region,
    seed,
  })

  return { id: result.data.id }
}

async function updateRegistrationStatus(
  supabaseAdmin: SupabaseClient,
  id: string,
  status: "rejected",
) {
  const { error } = await supabaseAdmin
    .from("tournament_registrations")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    logMutationError("reject registration", error)
    redirect("/admin?registrationError=mutation-failed#registrations")
  }
}

async function countApprovedParticipants(
  supabaseAdmin: SupabaseClient,
  tournamentId: string,
  participantType: "team" | "player",
) {
  const { count, error } = await supabaseAdmin
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)

  if (error) {
    logMutationError("count approved participants", error)
    return 0
  }

  return count ?? 0
}

async function getNextParticipantSeed(
  supabaseAdmin: SupabaseClient,
  tournamentId: string,
  participantType: "team" | "player",
) {
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("seed")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)

  if (error) {
    logMutationError("resolve registration seed", error)
    return 1
  }

  return (
    (data ?? []).reduce((maxSeed, row) => {
      return typeof row.seed === "number" && row.seed > maxSeed ? row.seed : maxSeed
    }, 0) + 1
  )
}

async function hasApprovedParticipantName(
  supabaseAdmin: SupabaseClient,
  tournamentId: string,
  participantType: "team" | "player",
  displayName: string,
) {
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)
    .ilike("display_name", displayName)
    .limit(1)
    .maybeSingle()

  if (error) {
    logMutationError("check duplicate approved participant", error)
    return false
  }

  return Boolean(data)
}

async function findApprovedParticipantId(
  supabaseAdmin: SupabaseClient,
  participantType: "team" | "player",
  sourceId: string,
) {
  const sourceColumn =
    participantType === "team" ? "source_team_id" : "source_player_id"
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq(sourceColumn, sourceId)
    .maybeSingle()

  if (error) {
    logMutationError("resolve approved participant", error)
    return null
  }

  return typeof data?.id === "string" ? data.id : null
}

function revalidateRegistrationPaths() {
  revalidatePath("/")
  revalidatePath("/admin")
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204"
}
