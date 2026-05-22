import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type PublicMatchDisputeSummary = {
  match_id: string
  status: "open" | "under_review" | "resolved" | "rejected"
  dispute_type: string
  title: string
  created_at: string | null
}

export async function getUserMatchDisputes({
  userProfileId,
  tournamentId,
}: {
  userProfileId: string | null
  tournamentId: string | null
}) {
  if (!userProfileId || !tournamentId) return []

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from("match_disputes")
    .select("match_id, status, dispute_type, title, created_at")
    .eq("reporter_user_profile_id", userProfileId)
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false })

  if (error) {
    if (isMissingDisputeStorageError(error)) return []

    console.error("Failed to fetch user match disputes:", error)
    return []
  }

  return (Array.isArray(data) ? data : [])
    .map(normalizePublicDispute)
    .filter((dispute): dispute is PublicMatchDisputeSummary => dispute !== null)
}

function normalizePublicDispute(row: Record<string, unknown>) {
  const matchId = readString(row.match_id)
  const status = readStatus(row.status)
  const disputeType = readString(row.dispute_type)
  const title = readString(row.title)

  if (!matchId || !status || !disputeType || !title) return null

  return {
    match_id: matchId,
    status,
    dispute_type: disputeType,
    title,
    created_at: readString(row.created_at),
  }
}

function readStatus(value: unknown): PublicMatchDisputeSummary["status"] | null {
  return value === "open" ||
    value === "under_review" ||
    value === "resolved" ||
    value === "rejected"
    ? value
    : null
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

export function isMissingDisputeStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
