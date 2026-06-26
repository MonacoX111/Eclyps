"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getFriendshipStatus, getConversation, getFriendOverview } from "@/lib/data/friends"
import type { DirectMessage, FriendOverview } from "@/lib/data/friends"

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
  const me = await getCurrentUserProfile()
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
  const me = await getCurrentUserProfile()
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
  const me = await getCurrentUserProfile()
  if (!me) return { ok: false, messages: [], error: "auth" }
  const { messages } = await getConversation(me.id, otherId)
  // Mark incoming as read whenever the conversation is opened/polled
  const admin = createSupabaseAdminClient()
  if (admin) {
    await admin
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", me.id)
      .eq("sender_id", otherId)
      .is("read_at", null)
  }
  return { ok: true, messages }
}
export async function loadFriendOverview(): Promise<{ ok: boolean; overview: FriendOverview | null }> {
  const me = await getCurrentUserProfile()
  if (!me) return { ok: false, overview: null }
  const overview = await getFriendOverview(me.id)
  return { ok: true, overview }
}
