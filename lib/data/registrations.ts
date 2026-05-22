import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  readNullableString,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { supabase } from "@/lib/supabase/client"

export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled"

export type RegistrationParticipantType = "team" | "player"

export type TournamentRegistrationSummary = {
  tournamentId: string
  participantType: RegistrationParticipantType
  capacity: number | null
  checkInOpensAt: string | null
  checkInClosesAt: string | null
  approvedCount: number
  pendingCount: number
  slotsLeft: number | null
  isClosed: boolean
  isFull: boolean
  statusLabel: string
}

export type TournamentRegistrationRecord = {
  id: string
  tournament_id: string
  participant_type: RegistrationParticipantType
  user_profile_id: string | null
  display_name: string
  contact_email: string | null
  contact_handle: string | null
  region: string | null
  status: RegistrationStatus
  check_in_status: "not_checked_in" | "checked_in"
  checked_in_at: string | null
  checked_in_by_user_profile_id: string | null
  participant_id: string | null
  source_team_id: string | null
  source_player_id: string | null
  reviewed_at: string | null
  created_at: string | null
  roster: TournamentRegistrationRosterEntry[]
  owner_profile: TournamentRegistrationOwnerProfile | null
}

export type TournamentRegistrationOwnerProfile = {
  id: string
  discord_username: string
  display_name: string
  avatar_url: string | null
}

export type TournamentRegistrationRosterEntry = {
  id: string
  registration_id: string
  tournament_id: string
  team_participant_id: string | null
  source_player_id: string | null
  nickname: string
  roster_role: "main" | "substitute"
  roster_order: number
  is_captain: boolean
  created_at: string | null
}

const REGISTRATION_SELECT =
  "id, tournament_id, participant_type, user_profile_id, display_name, contact_email, contact_handle, region, status, check_in_status, checked_in_at, checked_in_by_user_profile_id, participant_id, source_team_id, source_player_id, reviewed_at, created_at, owner_profile:user_profiles!tournament_registrations_user_profile_id_fkey(id, discord_username, display_name, avatar_url)"

export async function getTournamentRegistrationSummary({
  tournamentId,
  participantType,
  capacity,
  checkInOpensAt,
  checkInClosesAt,
  tournamentStatus,
}: {
  tournamentId: string
  participantType: RegistrationParticipantType
  capacity: number | null
  checkInOpensAt?: string | null
  checkInClosesAt?: string | null
  tournamentStatus: string | null
}): Promise<TournamentRegistrationSummary> {
  const [approvedCount, pendingCount] = await Promise.all([
    countApprovedParticipants(tournamentId, participantType),
    countPendingRegistrations(tournamentId, participantType),
  ])
  const slotsLeft =
    typeof capacity === "number"
      ? Math.max(capacity - approvedCount - pendingCount, 0)
      : null
  const isClosed = tournamentStatus !== "upcoming"
  const isFull = slotsLeft !== null && slotsLeft <= 0

  return {
    tournamentId,
    participantType,
    capacity,
    checkInOpensAt: checkInOpensAt ?? null,
    checkInClosesAt: checkInClosesAt ?? null,
    approvedCount,
    pendingCount,
    slotsLeft,
    isClosed,
    isFull,
    statusLabel: isClosed ? "Registration Closed" : isFull ? "Registration Full" : "Registration Open",
  }
}

export async function findActiveRegistrationByName(
  client: SupabaseClient,
  {
    tournamentId,
    participantType,
    displayName,
  }: {
    tournamentId: string
    participantType: RegistrationParticipantType
    displayName: string
  },
) {
  const { data, error } = await client
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)
    .ilike("display_name", displayName)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle()

  if (error) return { registration: null, error }

  return { registration: data ?? null, error: null }
}

export async function findApprovedParticipantByName(
  client: SupabaseClient,
  {
    tournamentId,
    participantType,
    displayName,
  }: {
    tournamentId: string
    participantType: RegistrationParticipantType
    displayName: string
  },
) {
  const { data, error } = await client
    .from("participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("participant_type", participantType)
    .ilike("display_name", displayName)
    .limit(1)
    .maybeSingle()

  if (error) return { participant: null, error }

  return { participant: data ?? null, error: null }
}

export async function countApprovedParticipants(
  tournamentId: string,
  participantType: RegistrationParticipantType,
) {
  const client = createRegistrationReadClient()
  if (!client) return 0

  try {
    const { count, error } = await client
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("participant_type", participantType)

    if (error) {
      console.error("Failed to count approved participants:", error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error("Unexpected error while counting approved participants:", error)
    return 0
  }
}

async function countPendingRegistrations(
  tournamentId: string,
  participantType: RegistrationParticipantType,
) {
  const client = createRegistrationReadClient()
  if (!client) return 0

  try {
    const { count, error } = await client
      .from("tournament_registrations")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("participant_type", participantType)
      .eq("status", "pending")

    if (error && isMissingRegistrationTableError(error)) return 0

    if (error) {
      console.error("Failed to count pending registrations:", error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error("Unexpected error while counting pending registrations:", error)
    return 0
  }
}

function createRegistrationReadClient() {
  return createSupabaseAdminClient() ?? supabase
}

export function normalizeRegistration(
  row: Record<string, unknown>,
): TournamentRegistrationRecord | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const displayName = readNullableString(row.display_name)

  if (!id || !tournamentId || !displayName) return null

  return {
    id,
    tournament_id: tournamentId,
    participant_type: readParticipantType(row.participant_type),
    user_profile_id: readStringId(row.user_profile_id),
    display_name: displayName,
    contact_email: readNullableString(row.contact_email),
    contact_handle: readNullableString(row.contact_handle),
    region: readNullableString(row.region),
    status: readRegistrationStatus(row.status),
    check_in_status: readCheckInStatus(row.check_in_status),
    checked_in_at: readNullableString(row.checked_in_at),
    checked_in_by_user_profile_id: readStringId(row.checked_in_by_user_profile_id),
    participant_id: readStringId(row.participant_id),
    source_team_id: readStringId(row.source_team_id),
    source_player_id: readStringId(row.source_player_id),
    reviewed_at: readNullableString(row.reviewed_at),
    created_at: readNullableString(row.created_at),
    roster: [],
    owner_profile: normalizeRegistrationOwnerProfile(row.owner_profile),
  }
}

export function getRegistrationSelect() {
  return REGISTRATION_SELECT
}

function normalizeRegistrationOwnerProfile(
  value: unknown,
): TournamentRegistrationOwnerProfile | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null

  const record = row as Record<string, unknown>
  const id = readStringId(record.id)
  const discordUsername = readNullableString(record.discord_username)
  const displayName = readNullableString(record.display_name)

  if (!id || !discordUsername || !displayName) return null

  return {
    id,
    discord_username: discordUsername,
    display_name: displayName,
    avatar_url: readNullableString(record.avatar_url),
  }
}

export function isMissingRegistrationTableError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200"
}

function readRegistrationStatus(value: unknown): RegistrationStatus {
  if (
    value === "approved" ||
    value === "rejected" ||
    value === "cancelled"
  ) {
    return value
  }

  return "pending"
}

function readCheckInStatus(value: unknown): "not_checked_in" | "checked_in" {
  return value === "checked_in" ? "checked_in" : "not_checked_in"
}

export function normalizeRegistrationRosterEntry(
  row: Record<string, unknown>,
): TournamentRegistrationRosterEntry | null {
  const id = readStringId(row.id)
  const registrationId = readStringId(row.registration_id)
  const tournamentId = readStringId(row.tournament_id)
  const nickname = readNullableString(row.nickname)
  const rosterOrder =
    typeof row.roster_order === "number" && Number.isInteger(row.roster_order)
      ? row.roster_order
      : null

  if (!id || !registrationId || !tournamentId || !nickname || rosterOrder === null) {
    return null
  }

  return {
    id,
    registration_id: registrationId,
    tournament_id: tournamentId,
    team_participant_id: readStringId(row.team_participant_id),
    source_player_id: readStringId(row.source_player_id),
    nickname,
    roster_role: row.roster_role === "substitute" ? "substitute" : "main",
    roster_order: rosterOrder,
    is_captain: row.is_captain === true,
    created_at: readNullableString(row.created_at),
  }
}
