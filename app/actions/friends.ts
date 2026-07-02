"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUserProfile, getCurrentUserProfileFast } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getFriendshipStatus, getConversationMessages, getFriendOverview } from "@/lib/data/friends"
import { searchUsers, type UserSearchResult } from "@/lib/data/user-search"
import type { DirectMessage, FriendOverview, FriendshipStatus } from "@/lib/data/friends"

const MAX_BODY = 2000

export type FriendActionResult = { ok: boolean; error?: string }

function conversationKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

export async function sendFriendRequest(targetUserProfileId: string): Promise<FriendActionResult> {
  const me = await getCurrentUserProfile()
  if (!me) return { ok: false, error: "auth" }
  if (!targetUserProfileId || targetUserProfileId === me.id) {
    return { ok: false, error: "invalid_target" }
  }
  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }

  // Ensure target exists
  const { data: target } = await admin
    .from("user_profiles")
    .select("id")
    .eq("id", targetUserProfileId)
    .maybeSingle()
  if (!target) return { ok: false, error: "not_found" }

  // Existing relation?
  const { data: existing } = await admin
    .from("friendships")
    .select("id, status, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${me.id},addressee_id.eq.${targetUserProfileId}),` +
        `and(requester_id.eq.${targetUserProfileId},addressee_id.eq.${me.id})`,
    )
    .maybeSingle()

  if (existing) {
    if (existing.status === "accepted") return { ok: true }
    if (existing.status === "pending") {
      // If the other side already requested me, accept it
      if (existing.addressee_id === me.id) {
        await admin
          .from("friendships")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", existing.id)
        revalidatePath("/friends")
        return { ok: true }
      }
      return { ok: true }
    }
    // declined -> re-open as a fresh request from me
    await admin
      .from("friendships")
      .update({
        requester_id: me.id,
        addressee_id: targetUserProfileId,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    revalidatePath("/friends")
    return { ok: true }
  }

  const { error } = await admin.from("friendships").insert({
    requester_id: me.id,
    addressee_id: targetUserProfileId,
    status: "pending",
  })
  if (error) return { ok: false, error: "insert" }
  revalidatePath("/friends")
  return { ok: true }
}

export async function respondFriendRequest(
  friendshipId: string,
  accept: boolean,
): Promise<FriendActionResult> {
  const me = await getCurrentUserProfile()
  if (!me) return { ok: false, error: "auth" }
  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }

  const { data: row } = await admin
    .from("friendships")
    .select("id, addressee_id, status")
    .eq("id", friendshipId)
    .maybeSingle()
  if (!row || row.addressee_id !== me.id || row.status !== "pending") {
    return { ok: false, error: "invalid" }
  }

  await admin
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", friendshipId)
  revalidatePath("/friends")
  return { ok: true }
}

export async function removeFriend(friendshipId: string): Promise<FriendActionResult> {
  const me = await getCurrentUserProfile()
  if (!me) return { ok: false, error: "auth" }
  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }

  const { data: row } = await admin
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("id", friendshipId)
    .maybeSingle()
  if (!row || (row.requester_id !== me.id && row.addressee_id !== me.id)) {
    return { ok: false, error: "invalid" }
  }
  await admin.from("friendships").delete().eq("id", friendshipId)
  revalidatePath("/friends")
  return { ok: true }
}

export async function sendDirectMessage(
  otherId: string,
  body: string,
): Promise<FriendActionResult> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, error: "auth" }
  const text = (body ?? "").trim()
  if (!text) return { ok: false, error: "empty" }
  if (text.length > MAX_BODY) return { ok: false, error: "too_long" }

  // Must be friends to message
  const status = await getFriendshipStatus(me.id, otherId)
  if (status !== "friends") return { ok: false, error: "not_friends" }

  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }

  const { error } = await admin.from("direct_messages").insert({
    conversation_key: conversationKey(me.id, otherId),
    sender_id: me.id,
    recipient_id: otherId,
    body: text,
  })
  if (error) return { ok: false, error: "insert" }
  return { ok: true }
}

export async function markConversationRead(otherId: string): Promise<FriendActionResult> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, error: "auth" }
  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }

  await admin
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", me.id)
    .eq("sender_id", otherId)
    .is("read_at", null)
  return { ok: true }
}
export async function loadConversation(
  otherId: string,
): Promise<{ ok: boolean; messages: DirectMessage[]; error?: string }> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, messages: [], error: "auth" }
  const admin = createSupabaseAdminClient()

  // Load history and mark incoming as read IN PARALLEL (was sequential before).
  const [messages] = await Promise.all([
    getConversationMessages(me.id, otherId),
    admin
      ? admin
          .from("direct_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("recipient_id", me.id)
          .eq("sender_id", otherId)
          .is("read_at", null)
      : Promise.resolve(null),
  ])

  return { ok: true, messages }
}
export async function loadFriendOverview(): Promise<{ ok: boolean; overview: FriendOverview | null }> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, overview: null }
  const overview = await getFriendOverview(me.id)
  return { ok: true, overview }
}

export type UserSearchItem = UserSearchResult & {
  friendshipStatus: FriendshipStatus
  friendshipId: string | null
}

/**
 * Search users (excluding self) and annotate each with the current friendship status
 * so the UI can show correct action buttons (Add / Pending / Accept / Friends).
 */
export async function searchUsersForFriends(
  query: string,
): Promise<{ ok: boolean; results: UserSearchItem[] }> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, results: [] }
  const trimmed = (query ?? "").trim()
  if (trimmed.length < 2) return { ok: true, results: [] }

  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, results: [] }

  const rawResults = await searchUsers(trimmed, 20)
  const candidates = rawResults.filter((u) => u.id !== me.id)
  if (candidates.length === 0) return { ok: true, results: [] }

  // Batch-fetch friendships involving me + any of these candidates
  const ids = candidates.map((u) => u.id)
  const { data: relations } = await admin
    .from("friendships")
    .select("id, status, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${me.id},addressee_id.in.(${ids.join(",")})),` +
        `and(addressee_id.eq.${me.id},requester_id.in.(${ids.join(",")}))`,
    )

  const byOther = new Map<
    string,
    { id: string; status: string; requesterId: string; addresseeId: string }
  >()
  for (const r of (relations ?? []) as any[]) {
    const otherId = r.requester_id === me.id ? r.addressee_id : r.requester_id
    byOther.set(otherId, {
      id: r.id,
      status: r.status,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
    })
  }

  const results: UserSearchItem[] = candidates.map((u) => {
    const rel = byOther.get(u.id)
    let status: FriendshipStatus = "none"
    let friendshipId: string | null = null
    if (rel) {
      friendshipId = rel.id
      if (rel.status === "accepted") status = "friends"
      else if (rel.status === "pending") {
        status = rel.requesterId === me.id ? "pending_outgoing" : "pending_incoming"
      }
    }
    return { ...u, friendshipStatus: status, friendshipId }
  })

  return { ok: true, results }
}

/**
 * Update the current user's last_seen timestamp. Called from the client as a
 * lightweight heartbeat every ~60s while the app is open.
 */
export async function updateMyLastSeen(): Promise<FriendActionResult> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, error: "auth" }
  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }
  await admin
    .from("user_profiles")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", me.id)
  return { ok: true }
}
