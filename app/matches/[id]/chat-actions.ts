"use server"

import { cookies } from "next/headers"
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getCurrentUserProfileFast } from "@/lib/auth/user-profile"
import { getPublicMatchDetail, isUserMatchParticipant } from "@/lib/data/match-detail"
import type { MatchChatChannel } from "@/lib/data/match-chat"

const MAX_BODY = 1000

export type ChatActionResult = { ok: true } | { ok: false; error: string }

function normalizeChannel(value: unknown): MatchChatChannel {
  return value === "participants" ? "participants" : "all"
}

async function isCurrentRequestAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
    return await isValidAdminSession(sessionCookie)
  } catch {
    return false
  }
}

/** Send a chat message. Enforces auth + participant rules server-side. */
export async function sendMatchMessage(input: {
  matchId: string
  channel: MatchChatChannel
  body: string
}): Promise<ChatActionResult> {
  const matchId = typeof input?.matchId === "string" ? input.matchId : ""
  const channel = normalizeChannel(input?.channel)
  const body = typeof input?.body === "string" ? input.body.trim() : ""

  if (!matchId) return { ok: false, error: "invalid_match" }
  if (!body) return { ok: false, error: "empty" }
  if (body.length > MAX_BODY) return { ok: false, error: "too_long" }

  const profile = await getCurrentUserProfileFast()
  if (!profile) return { ok: false, error: "not_authenticated" }

  // Participants channel: only match participants may post.
  if (channel === "participants") {
    const match = await getPublicMatchDetail(matchId)
    if (!match) return { ok: false, error: "invalid_match" }
    const allowed = await isUserMatchParticipant(match, profile.id)
    if (!allowed) return { ok: false, error: "not_participant" }
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return { ok: false, error: "server_error" }

  const { error } = await supabaseAdmin.from("match_messages").insert({
    match_id: matchId,
    author_profile_id: profile.id,
    channel,
    kind: "user",
    body,
  })

  if (error) {
    console.error("sendMatchMessage failed:", error)
    return { ok: false, error: "server_error" }
  }

  // No revalidatePath here: message delivery is handled by Supabase Realtime,
  // and rebuilding the whole match page on every message made sending slow.
  return { ok: true }
}

/** Delete a message. Only the admin (valid admin session cookie) may do this. */
export async function deleteMatchMessage(input: {
  matchId: string
  messageId: string
}): Promise<ChatActionResult> {
  const matchId = typeof input?.matchId === "string" ? input.matchId : ""
  const messageId = typeof input?.messageId === "string" ? input.messageId : ""

  if (!matchId || !messageId) return { ok: false, error: "invalid" }

  if (!(await isCurrentRequestAdmin())) {
    return { ok: false, error: "forbidden" }
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return { ok: false, error: "server_error" }

  const { error } = await supabaseAdmin
    .from("match_messages")
    .delete()
    .eq("id", messageId)
    .eq("match_id", matchId)

  if (error) {
    console.error("deleteMatchMessage failed:", error)
    return { ok: false, error: "server_error" }
  }

  // Deletion is propagated to clients via the Realtime DELETE event.
  return { ok: true }
}


export type ChatAuthor = { name: string | null; avatarUrl: string | null }

/** Resolve an author's display name + avatar for a realtime message. */
export async function getChatMessageAuthor(profileId: string): Promise<ChatAuthor> {
  if (typeof profileId !== "string" || !profileId) return { name: null, avatarUrl: null }
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return { name: null, avatarUrl: null }
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("id", profileId)
    .maybeSingle()
  if (error || !data) return { name: null, avatarUrl: null }
  return {
    name: typeof data.display_name === "string" ? data.display_name : null,
    avatarUrl: typeof data.avatar_url === "string" ? data.avatar_url : null,
  }
}
