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
import { canRegisterTeamForTournament } from "@/lib/teams/eligibility"
import { createNotification } from "@/lib/notifications/create-notification"

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
    .select("id, tournament_id, participant_type, user_profile_id, display_name, contact_email, contact_handle, region, status, source_player_id, source_team_id, registration_type, player_id, team_id, participant_id")
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
    
    if (registration.user_profile_id) {
      // Get tournament name first
      const { data: tournament } = await supabaseAdmin
        .from("tournaments")
        .select("name")
        .eq("id", registration.tournament_id)
        .maybeSingle()

      const tName = tournament?.name || "Tournament"
      try {
        await createNotification({
          userProfileId: registration.user_profile_id,
          playerId: registration.player_id || registration.source_player_id,
          teamId: registration.team_id || registration.source_team_id,
          tournamentId: registration.tournament_id,
          type: "registration_rejected",
          title: "Registration Rejected",
          message: `Your registration for "${tName}" was rejected.`,
        })
      } catch (err) {
        console.error("Failed to create registration rejection notification:", err)
      }
    }

    revalidateRegistrationPaths()
    redirect("/admin?registrationSuccess=rejected#registrations")
  }

  // Call the new transactional stored procedure to approve the registration atomically
  const { data: participantId, error: rpcError } = await supabaseAdmin.rpc(
    "approve_tournament_registration",
    {
      registration_uuid: parsed.data.id,
    },
  )

  if (rpcError || !participantId) {
    console.error("RPC approve_tournament_registration failed:", rpcError)
    
    // Map Postgres exception messages to clear admin panel error parameters
    const errMsg = rpcError?.message || ""
    let errorParam = "mutation-failed"
    
    if (errMsg.includes("full")) {
      errorParam = "registration-full"
    } else if (errMsg.includes("captain")) {
      errorParam = "team-ineligible"
    } else if (errMsg.includes("closed")) {
      errorParam = "registration-closed"
    } else if (errMsg.includes("mismatch")) {
      errorParam = "wrong-participant-type"
    }

    redirect(`/admin?registrationError=${errorParam}#registrations`)
  }

  if (registration.user_profile_id) {
    // Get tournament name first
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("name")
      .eq("id", registration.tournament_id)
      .maybeSingle()

    const tName = tournament?.name || "Tournament"
    try {
      await createNotification({
        userProfileId: registration.user_profile_id,
        playerId: registration.player_id || registration.source_player_id,
        teamId: registration.team_id || registration.source_team_id,
        tournamentId: registration.tournament_id,
        type: "registration_approved",
        title: "Registration Approved",
        message: `Your registration for "${tName}" has been approved!`,
      })
    } catch (err) {
      console.error("Failed to create registration approval notification:", err)
    }
  }

  revalidateRegistrationPaths()
  redirect("/admin?registrationSuccess=approved#registrations")
}

async function findApprovedParticipantBySource(
  supabaseAdmin: SupabaseClient,
  {
    tournamentId,
    participantType,
    sourceId,
  }: {
    tournamentId: string
    participantType: "team" | "player"
    sourceId: string
  },
): Promise<string | null> {
  const sourceColumn =
    participantType === "team" ? "source_team_id" : "source_player_id"
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)
    .eq(sourceColumn, sourceId)
    .limit(1)
    .maybeSingle()

  if (error) {
    logMutationError("find approved participant by source", error)
    return null
  }

  return data?.id ?? null
}

async function approveTeamRegistration(
  supabaseAdmin: SupabaseClient,
  registration: {
    tournament_id: string
    display_name: string
    user_profile_id: string | null
    source_team_id?: string | null
  },
  seed: number,
) {
  const existingTeam =
    registration.source_team_id
      ? { id: registration.source_team_id }
      : await findExistingTeamProfile(supabaseAdmin, {
          displayName: registration.display_name,
          ownerUserId: registration.user_profile_id,
        })
  const sourceId =
    existingTeam?.id ??
    (await createTeamProfile(supabaseAdmin, {
      tournamentId: registration.tournament_id,
      displayName: registration.display_name,
      seed,
      ownerUserId: registration.user_profile_id,
    }))

  if (!sourceId) return null

  if (
    await hasApprovedParticipantSource(supabaseAdmin, {
      tournamentId: registration.tournament_id,
      participantType: "team",
      sourceId,
    })
  ) {
    return { duplicate: true as const }
  }

  const participantId = await upsertTeamParticipant(supabaseAdmin, {
    id: sourceId,
    tournament_id: registration.tournament_id,
    name: registration.display_name,
    seed,
  })

  return participantId ? { sourceId, participantId } : null
}

async function approvePlayerRegistration(
  supabaseAdmin: SupabaseClient,
  registration: {
    tournament_id: string
    display_name: string
    region: string | null
    user_profile_id: string | null
    source_player_id?: string | null
  },
  seed: number,
) {
  const existingPlayer =
    registration.source_player_id
      ? await findExistingPlayerProfileById(supabaseAdmin, registration.source_player_id)
      : null
  const sourceId = existingPlayer?.id ?? null

  if (!sourceId) return null

  if (
    await hasApprovedParticipantSource(supabaseAdmin, {
      tournamentId: registration.tournament_id,
      participantType: "player",
      sourceId,
    })
  ) {
    return { duplicate: true as const }
  }

  if (existingPlayer && registration.region && !existingPlayer.region) {
    await updateExistingPlayerRegion(supabaseAdmin, sourceId, registration.region)
  }

  const participantId = await upsertPlayerParticipant(supabaseAdmin, {
    id: sourceId,
    tournament_id: registration.tournament_id,
    name: registration.display_name,
    nickname: existingPlayer?.nickname ?? null,
    region: registration.region ?? existingPlayer?.region ?? null,
    seed,
  })

  return participantId ? { sourceId, participantId } : null
}

async function approveTeamRegistrationRoster(
  supabaseAdmin: SupabaseClient,
  {
    registrationId,
    tournamentId,
    teamParticipantId,
  }: {
    registrationId: string
    tournamentId: string
    teamParticipantId: string | null
  },
) {
  if (!teamParticipantId) return false

  const { data, error } = await supabaseAdmin
    .from("tournament_registration_roster_entries")
    .select("id, nickname, roster_order")
    .eq("registration_id", registrationId)
    .order("roster_order", { ascending: true })

  if (error) {
    logMutationError("fetch team registration roster", error)
    return false
  }

  const rosterEntries = Array.isArray(data)
    ? (data as { id: string; nickname: string; roster_order: number }[])
    : []

  if (rosterEntries.length < 5 || rosterEntries.length > 7) return false

  for (const entry of rosterEntries) {
    const playerId =
      (await findExistingPlayerProfile(supabaseAdmin, {
        displayName: entry.nickname,
        ownerUserId: null,
      }))?.id ??
      (await createPlayerProfile(supabaseAdmin, {
        tournamentId,
        displayName: entry.nickname,
        region: null,
        seed: null,
        ownerUserId: null,
      }))

    if (!playerId) return false

    const { error: updateError } = await supabaseAdmin
      .from("tournament_registration_roster_entries")
      .update({
        source_player_id: playerId,
        team_participant_id: teamParticipantId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.id)

    if (updateError) {
      logMutationError("link team registration roster player", updateError)
      return false
    }
  }

  return true
}

async function createTeamProfile(
  supabaseAdmin: SupabaseClient,
  {
    tournamentId,
    displayName,
    seed,
    ownerUserId,
  }: {
    tournamentId: string
    displayName: string
    seed: number
    ownerUserId: string | null
  },
) {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .insert({
      tournament_id: tournamentId,
      name: displayName,
      seed,
      wins: 0,
      losses: 0,
      owner_user_id: ownerUserId,
      captain_user_id: ownerUserId,
    })
    .select("id")
    .maybeSingle()

  if (error || typeof data?.id !== "string") {
    logMutationError("create team profile for registration", error)
    return null
  }

  return data.id
}

async function createPlayerProfile(
  supabaseAdmin: SupabaseClient,
  {
    tournamentId,
    displayName,
    region,
    seed,
    ownerUserId,
  }: {
    tournamentId: string
    displayName: string
    region: string | null
    seed: number | null
    ownerUserId: string | null
  },
) {
  const insertPayload = {
    tournament_id: tournamentId,
    name: displayName,
    nickname: null,
    region,
    seed,
    wins: 0,
    losses: 0,
    owner_user_id: ownerUserId,
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
      logMutationError("create player profile for registration", fallbackResult.error)
      return null
    }

    return fallbackResult.data.id
  }

  if (result.error || typeof result.data?.id !== "string") {
    logMutationError("create player profile for registration", result.error)
    return null
  }

  return result.data.id
}

async function findExistingTeamProfile(
  supabaseAdmin: SupabaseClient,
  {
    displayName,
    ownerUserId,
  }: {
    displayName: string
    ownerUserId: string | null
  },
) {
  let query = supabaseAdmin
    .from("teams")
    .select("id")
    .ilike("name", displayName)
    .order("created_at", { ascending: true })
    .limit(1)

  if (ownerUserId) {
    query = query.eq("owner_user_id", ownerUserId)
  }

  const { data, error } = await query
    .maybeSingle()

  if (error) {
    logMutationError("find existing team profile for registration", error)
    return null
  }

  return typeof data?.id === "string" ? { id: data.id } : null
}

async function findExistingPlayerProfile(
  supabaseAdmin: SupabaseClient,
  {
    displayName,
    ownerUserId,
  }: {
    displayName: string
    ownerUserId: string | null
  },
) {
  return (
    (await findExistingPlayerProfileByColumn(
      supabaseAdmin,
      "name",
      displayName,
      ownerUserId,
    )) ??
    (await findExistingPlayerProfileByColumn(
      supabaseAdmin,
      "nickname",
      displayName,
      ownerUserId,
    ))
  )
}

async function findExistingPlayerProfileById(
  supabaseAdmin: SupabaseClient,
  id: string,
) {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("id, nickname, region")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    logMutationError("find source player profile for registration", error)
    return null
  }

  return typeof data?.id === "string"
    ? {
        id: data.id,
        nickname: typeof data.nickname === "string" ? data.nickname : null,
        region: typeof data.region === "string" ? data.region : null,
      }
    : null
}

async function findExistingPlayerProfileByColumn(
  supabaseAdmin: SupabaseClient,
  column: "name" | "nickname",
  displayName: string,
  ownerUserId: string | null,
) {
  let query = supabaseAdmin
    .from("players")
    .select("id, nickname, region")
    .ilike(column, displayName)
    .order("created_at", { ascending: true })
    .limit(1)

  if (ownerUserId) {
    query = query.eq("owner_user_id", ownerUserId)
  }

  const { data, error } = await query
    .maybeSingle()

  if (error && isMissingColumnError(error)) {
    const fallbackResult = await supabaseAdmin
      .from("players")
      .select("id, nickname")
      .ilike(column, displayName)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fallbackResult.error) {
      logMutationError("find existing player profile for registration", fallbackResult.error)
      return null
    }

    return typeof fallbackResult.data?.id === "string"
      ? {
          id: fallbackResult.data.id,
          nickname:
            typeof fallbackResult.data.nickname === "string"
              ? fallbackResult.data.nickname
              : null,
          region: null,
        }
      : null
  }

  if (error) {
    logMutationError("find existing player profile for registration", error)
    return null
  }

  return typeof data?.id === "string"
    ? {
        id: data.id,
        nickname: typeof data.nickname === "string" ? data.nickname : null,
        region: typeof data.region === "string" ? data.region : null,
      }
    : null
}

async function updateExistingPlayerRegion(
  supabaseAdmin: SupabaseClient,
  id: string,
  region: string,
) {
  const { error } = await supabaseAdmin
    .from("players")
    .update({ region })
    .eq("id", id)

  if (error && !isMissingColumnError(error)) {
    logMutationError("update reused player region", error)
  }
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

async function hasApprovedParticipantSource(
  supabaseAdmin: SupabaseClient,
  {
    tournamentId,
    participantType,
    sourceId,
  }: {
    tournamentId: string
    participantType: "team" | "player"
    sourceId: string
  },
) {
  const sourceColumn =
    participantType === "team" ? "source_team_id" : "source_player_id"
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)
    .eq(sourceColumn, sourceId)
    .limit(1)
    .maybeSingle()

  if (error) {
    logMutationError("check duplicate approved participant source", error)
    return false
  }

  return Boolean(data)
}

function revalidateRegistrationPaths() {
  revalidatePath("/")
  revalidatePath("/admin")
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204"
}
