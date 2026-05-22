import "server-only"

import type { UserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type PlayerApplicationStatus = "pending" | "approved" | "rejected"

export type PlayerApplication = {
  id: string
  user_profile_id: string
  requested_nickname: string
  requested_region: string | null
  status: PlayerApplicationStatus
  created_player_id: string | null
  created_at: string | null
  reviewed_at: string | null
}

export type ApprovedPlayerProfile = {
  id: string
  name: string
  nickname: string | null
  region: string | null
}

export type CurrentTournamentRegistration = {
  id: string
  display_name: string
  participant_type: "team" | "player"
  status: "pending" | "approved" | "rejected" | "cancelled"
  check_in_status: "not_checked_in" | "checked_in"
  checked_in_at: string | null
  participant_id: string | null
  source_team_id: string | null
  source_player_id: string | null
}

export type PlatformUserState = {
  userProfile: UserProfile | null
  playerApplication: PlayerApplication | null
  approvedPlayer: ApprovedPlayerProfile | null
  tournamentRegistration: CurrentTournamentRegistration | null
}

export async function getPlatformUserState({
  userProfile,
  tournamentId,
}: {
  userProfile: UserProfile | null
  tournamentId: string | null
}): Promise<PlatformUserState> {
  if (!userProfile) {
    return {
      userProfile: null,
      playerApplication: null,
      approvedPlayer: null,
      tournamentRegistration: null,
    }
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return {
      userProfile,
      playerApplication: null,
      approvedPlayer: null,
      tournamentRegistration: null,
    }
  }

  const [application, approvedPlayer, registration] = await Promise.all([
    fetchLatestPlayerApplication(userProfile.id),
    fetchApprovedPlayer(userProfile.id),
    tournamentId
      ? fetchTournamentRegistration({
          userProfileId: userProfile.id,
          tournamentId,
        })
      : Promise.resolve(null),
  ])

  return {
    userProfile,
    playerApplication: application,
    approvedPlayer,
    tournamentRegistration: registration,
  }
}

async function fetchLatestPlayerApplication(userProfileId: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from("player_applications")
    .select("id, user_profile_id, requested_nickname, requested_region, status, created_player_id, created_at, reviewed_at")
    .eq("user_profile_id", userProfileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && !isMissingApplicationStorageError(error)) {
    console.error("Failed to fetch player application:", error)
  }

  return normalizePlayerApplication(data)
}

async function fetchApprovedPlayer(userProfileId: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from("players")
    .select("id, name, nickname, region")
    .eq("owner_user_id", userProfileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error && !isMissingApplicationStorageError(error)) {
    console.error("Failed to fetch approved player profile:", error)
  }

  if (!data || typeof data.id !== "string" || typeof data.name !== "string") {
    return null
  }

  return {
    id: data.id,
    name: data.name,
    nickname: typeof data.nickname === "string" ? data.nickname : null,
    region: typeof data.region === "string" ? data.region : null,
  }
}

async function fetchTournamentRegistration({
  userProfileId,
  tournamentId,
}: {
  userProfileId: string
  tournamentId: string
}) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from("tournament_registrations")
    .select("id, display_name, participant_type, status, check_in_status, checked_in_at, participant_id, source_team_id, source_player_id")
    .eq("user_profile_id", userProfileId)
    .eq("tournament_id", tournamentId)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && !isMissingApplicationStorageError(error)) {
    console.error("Failed to fetch current tournament registration:", error)
  }

  const id = readString(data?.id)
  const displayName = readString(data?.display_name)
  const participantType = readParticipantType(data?.participant_type)
  const status = readRegistrationStatus(data?.status)

  const checkInStatus = readCheckInStatus(data?.check_in_status)

  return id && displayName && participantType && status
    ? {
        id,
        display_name: displayName,
        participant_type: participantType,
        status,
        check_in_status: checkInStatus,
        checked_in_at: readString(data?.checked_in_at),
        participant_id: readString(data?.participant_id),
        source_team_id: readString(data?.source_team_id),
        source_player_id: readString(data?.source_player_id),
      }
    : null
}

function normalizePlayerApplication(row: unknown): PlayerApplication | null {
  if (!row || typeof row !== "object") return null

  const record = row as Record<string, unknown>
  const id = readString(record.id)
  const userProfileId = readString(record.user_profile_id)
  const requestedNickname = readString(record.requested_nickname)
  const status = readApplicationStatus(record.status)

  if (!id || !userProfileId || !requestedNickname || !status) return null

  return {
    id,
    user_profile_id: userProfileId,
    requested_nickname: requestedNickname,
    requested_region: readString(record.requested_region),
    status,
    created_player_id: readString(record.created_player_id),
    created_at: readString(record.created_at),
    reviewed_at: readString(record.reviewed_at),
  }
}

function readApplicationStatus(value: unknown): PlayerApplicationStatus | null {
  return value === "pending" || value === "approved" || value === "rejected"
    ? value
    : null
}

function readRegistrationStatus(
  value: unknown,
): CurrentTournamentRegistration["status"] | null {
  return value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "cancelled"
    ? value
    : null
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function readParticipantType(value: unknown): "team" | "player" | null {
  return value === "team" || value === "player" ? value : null
}

function readCheckInStatus(value: unknown): "not_checked_in" | "checked_in" {
  return value === "checked_in" ? "checked_in" : "not_checked_in"
}

function isMissingApplicationStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
