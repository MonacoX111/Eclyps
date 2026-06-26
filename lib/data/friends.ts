import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type FriendUser = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export type FriendSummary = FriendUser & {
  friendshipId: string
  since: string | null
}

export type FriendRequestSummary = FriendUser & {
  friendshipId: string
  createdAt: string | null
}

export type DirectMessage = {
  id: string
  senderId: string
  recipientId: string
  body: string
  createdAt: string | null
  readAt: string | null
}

export type FriendshipStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "friends"

export type FriendOverview = {
  friends: FriendSummary[]
  incoming: FriendRequestSummary[]
  outgoing: FriendRequestSummary[]
  unreadByFriend: Record<string, number>
}

function toUser(row: any): FriendUser | null {
  if (!row || typeof row !== "object") return null
  const id = typeof row.id === "string" ? row.id : null
  if (!id) return null
  return {
    id,
    displayName:
      typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name.trim()
        : "Player",
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
  }
}

const USER_FIELDS = "id, display_name, avatar_url"

/** Resolve a user_profiles.id from an auth user id (the value players.user_id stores). */
export async function resolveUserProfileIdByAuthUserId(
  authUserId: string | null | undefined,
): Promise<string | null> {
  if (!authUserId) return null
  const admin = createSupabaseAdminClient()
  if (!admin) return null
  const { data } = await admin
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle()
  return data && typeof data.id === "string" ? data.id : null
}

export async function getFriendOverview(
  userProfileId: string,
): Promise<FriendOverview> {
  const empty: FriendOverview = {
    friends: [],
    incoming: [],
    outgoing: [],
    unreadByFriend: {},
  }
  const admin = createSupabaseAdminClient()
  if (!admin) return empty

  const { data: rows, error } = await admin
    .from("friendships")
    .select(
      `id, status, created_at, requester_id, addressee_id,
       requester:requester_id (${USER_FIELDS}),
       addressee:addressee_id (${USER_FIELDS})`,
    )
    .or(`requester_id.eq.${userProfileId},addressee_id.eq.${userProfileId}`)
    .in("status", ["pending", "accepted"])

  if (error || !rows) return empty

  const friends: FriendSummary[] = []
  const incoming: FriendRequestSummary[] = []
  const outgoing: FriendRequestSummary[] = []

  for (const row of rows as any[]) {
    const iAmRequester = row.requester_id === userProfileId
    const other = toUser(iAmRequester ? row.addressee : row.requester)
    if (!other) continue

    if (row.status === "accepted") {
      friends.push({ ...other, friendshipId: row.id, since: row.created_at ?? null })
    } else if (row.status === "pending") {
      if (iAmRequester) {
        outgoing.push({ ...other, friendshipId: row.id, createdAt: row.created_at ?? null })
      } else {
        incoming.push({ ...other, friendshipId: row.id, createdAt: row.created_at ?? null })
      }
    }
  }

  // Unread message counts grouped by the friend (sender)
  const unreadByFriend: Record<string, number> = {}
  const { data: unread } = await admin
    .from("direct_messages")
    .select("sender_id")
    .eq("recipient_id", userProfileId)
    .is("read_at", null)
  if (unread) {
    for (const m of unread as any[]) {
      const s = m.sender_id
      if (typeof s === "string") unreadByFriend[s] = (unreadByFriend[s] ?? 0) + 1
    }
  }

  friends.sort((a, b) => a.displayName.localeCompare(b.displayName))
  return { friends, incoming, outgoing, unreadByFriend }
}

export async function getFriendshipStatus(
  userProfileId: string,
  targetId: string,
): Promise<FriendshipStatus> {
  if (userProfileId === targetId) return "none"
  const admin = createSupabaseAdminClient()
  if (!admin) return "none"
  const { data } = await admin
    .from("friendships")
    .select("status, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${userProfileId},addressee_id.eq.${targetId}),` +
        `and(requester_id.eq.${targetId},addressee_id.eq.${userProfileId})`,
    )
    .maybeSingle()
  if (!data) return "none"
  if (data.status === "accepted") return "friends"
  if (data.status === "pending") {
    return data.requester_id === userProfileId ? "pending_outgoing" : "pending_incoming"
  }
  return "none"
}

export async function getConversation(
  userProfileId: string,
  otherId: string,
  limit = 200,
): Promise<{ messages: DirectMessage[]; other: FriendUser | null }> {
  const admin = createSupabaseAdminClient()
  if (!admin) return { messages: [], other: null }

  // Verify they are actually friends before exposing the conversation
  const status = await getFriendshipStatus(userProfileId, otherId)
  if (status !== "friends") return { messages: [], other: null }

  const key =
    userProfileId < otherId
      ? `${userProfileId}:${otherId}`
      : `${otherId}:${userProfileId}`

  const [{ data: msgs }, { data: otherRow }] = await Promise.all([
    admin
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .eq("conversation_key", key)
      .order("created_at", { ascending: true })
      .limit(limit),
    admin.from("user_profiles").select(USER_FIELDS).eq("id", otherId).maybeSingle(),
  ])

  const messages: DirectMessage[] = (msgs ?? []).map((m: any) => ({
    id: m.id,
    senderId: m.sender_id,
    recipientId: m.recipient_id,
    body: typeof m.body === "string" ? m.body : "",
    createdAt: m.created_at ?? null,
    readAt: m.read_at ?? null,
  }))

  return { messages, other: toUser(otherRow) }
}
