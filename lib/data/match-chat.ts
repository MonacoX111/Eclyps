import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type MatchChatChannel = "participants" | "all"
export type MatchChatKind = "user" | "system"

export type MatchChatMessage = {
  id: string
  matchId: string
  channel: MatchChatChannel
  kind: MatchChatKind
  body: string
  createdAt: string
  authorId: string | null
  authorName: string | null
  authorAvatarUrl: string | null
}

const MAX_MESSAGES = 200

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function normalizeChannel(value: unknown): MatchChatChannel {
  return value === "participants" ? "participants" : "all"
}

function normalizeKind(value: unknown): MatchChatKind {
  return value === "system" ? "system" : "user"
}

function normalizeMessage(row: unknown): MatchChatMessage | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  const id = readString(record.id)
  const matchId = readString(record.match_id)
  const body = readString(record.body)
  const createdAt = readString(record.created_at)
  if (!id || !matchId || !body || !createdAt) return null

  const author = (record.author as Record<string, unknown> | null) ?? null

  return {
    id,
    matchId,
    channel: normalizeChannel(record.channel),
    kind: normalizeKind(record.kind),
    body,
    createdAt,
    authorId: readString(record.author_profile_id),
    authorName: author ? readString(author.display_name) : null,
    authorAvatarUrl: author ? readString(author.avatar_url) : null,
  }
}

/** Load the recent chat history for a match across both channels. */
export async function getMatchMessages(matchId: string): Promise<MatchChatMessage[]> {
  noStore()

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from("match_messages")
    .select(
      "id, match_id, author_profile_id, channel, kind, body, created_at, author:user_profiles!match_messages_author_profile_id_fkey(display_name, avatar_url)",
    )
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES)

  if (error) {
    console.error("Failed to load match messages:", error)
    return []
  }

  return (data ?? [])
    .map(normalizeMessage)
    .filter((msg): msg is MatchChatMessage => msg !== null)
}

/**
 * Insert a system message (e.g. "Match started"). Safe to call from lifecycle
 * code — failures are logged but never thrown, so they can't break a mutation.
 */
export async function postSystemMatchMessage(
  matchId: string,
  body: string,
  channel: MatchChatChannel = "participants",
): Promise<void> {
  try {
    const supabaseAdmin = createSupabaseAdminClient()
    if (!supabaseAdmin) return

    const trimmed = body.trim().slice(0, 1000)
    if (!trimmed) return

    const { error } = await supabaseAdmin.from("match_messages").insert({
      match_id: matchId,
      author_profile_id: null,
      channel,
      kind: "system",
      body: trimmed,
    })

    if (error) {
      console.error("Failed to post system match message:", error)
    }
  } catch (err) {
    console.error("Unexpected error posting system match message:", err)
  }
}
