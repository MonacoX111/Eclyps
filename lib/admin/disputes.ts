import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { getSafeAdminFetchError } from "@/lib/admin/errors"
import { readNullableString, readParticipantType, readStringId } from "@/lib/data/normalize"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type AdminDispute = {
  id: string
  tournament_id: string | null
  match_id: string
  reporter_user_profile_id: string
  reporter_participant_id: string | null
  reporter_player_id: string | null
  reporter_team_id: string | null
  participant_type: "team" | "player"
  dispute_type: string
  title: string
  description: string
  evidence_url: string | null
  status: "open" | "under_review" | "resolved" | "rejected"
  admin_note: string | null
  resolved_at: string | null
  created_at: string | null
  reporter_profile: {
    discord_username: string
    display_name: string
    avatar_url: string | null
  } | null
  reporter_participant: {
    display_name: string
  } | null
  match: {
    team1: string | null
    team2: string | null
    round: string | null
  } | null
  tournament: {
    name: string | null
  } | null
}

export type AdminDisputeQueryResult = {
  disputes: AdminDispute[]
  error: string | null
}

const DISPUTE_SELECT =
  "id, tournament_id, match_id, reporter_user_profile_id, reporter_participant_id, reporter_player_id, reporter_team_id, participant_type, dispute_type, title, description, evidence_url, status, admin_note, resolved_at, created_at, reporter_profile:user_profiles!match_disputes_reporter_user_profile_id_fkey(discord_username, display_name, avatar_url), reporter_participant:participants!match_disputes_reporter_participant_id_fkey(display_name), match:matches!match_disputes_match_id_fkey(team1, team2, round), tournament:tournaments!match_disputes_tournament_id_fkey(name)"

export async function getAdminDisputes(): Promise<AdminDisputeQueryResult> {
  noStore()

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return {
      disputes: [],
      error: "Server-only Supabase admin client is not configured.",
    }
  }

  const { data, error } = await supabaseAdmin
    .from("match_disputes")
    .select(DISPUTE_SELECT)
    .order("created_at", { ascending: false })

  if (error) {
    if (isMissingDisputeStorageError(error)) return { disputes: [], error: null }

    return {
      disputes: [],
      error: getSafeAdminFetchError("disputes", error),
    }
  }

  return {
    disputes: (Array.isArray(data) ? data : [])
      .map((row) => normalizeDispute(row as Record<string, unknown>))
      .filter((dispute): dispute is AdminDispute => dispute !== null),
    error: null,
  }
}

function normalizeDispute(row: Record<string, unknown>): AdminDispute | null {
  const id = readStringId(row.id)
  const matchId = readStringId(row.match_id)
  const reporterUserProfileId = readStringId(row.reporter_user_profile_id)
  const title = readNullableString(row.title)
  const description = readNullableString(row.description)
  const status = readDisputeStatus(row.status)

  if (!id || !matchId || !reporterUserProfileId || !title || !description || !status) {
    return null
  }

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    match_id: matchId,
    reporter_user_profile_id: reporterUserProfileId,
    reporter_participant_id: readStringId(row.reporter_participant_id),
    reporter_player_id: readStringId(row.reporter_player_id),
    reporter_team_id: readStringId(row.reporter_team_id),
    participant_type: readParticipantType(row.participant_type),
    dispute_type: readNullableString(row.dispute_type) ?? "other",
    title,
    description,
    evidence_url: readNullableString(row.evidence_url),
    status,
    admin_note: readNullableString(row.admin_note),
    resolved_at: readNullableString(row.resolved_at),
    created_at: readNullableString(row.created_at),
    reporter_profile: normalizeProfile(row.reporter_profile),
    reporter_participant: normalizeParticipant(row.reporter_participant),
    match: normalizeMatch(row.match),
    tournament: normalizeTournament(row.tournament),
  }
}

function normalizeProfile(value: unknown): AdminDispute["reporter_profile"] {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  const discordUsername = readNullableString(record.discord_username)
  const displayName = readNullableString(record.display_name)
  if (!discordUsername || !displayName) return null
  return {
    discord_username: discordUsername,
    display_name: displayName,
    avatar_url: readNullableString(record.avatar_url),
  }
}

function normalizeParticipant(value: unknown): AdminDispute["reporter_participant"] {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null
  const displayName = readNullableString((row as Record<string, unknown>).display_name)
  return displayName ? { display_name: displayName } : null
}

function normalizeMatch(value: unknown): AdminDispute["match"] {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  return {
    team1: readNullableString(record.team1),
    team2: readNullableString(record.team2),
    round: readNullableString(record.round),
  }
}

function normalizeTournament(value: unknown): AdminDispute["tournament"] {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null
  return { name: readNullableString((row as Record<string, unknown>).name) }
}

function readDisputeStatus(value: unknown): AdminDispute["status"] | null {
  return value === "open" ||
    value === "under_review" ||
    value === "resolved" ||
    value === "rejected"
    ? value
    : null
}

export function isMissingDisputeStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
