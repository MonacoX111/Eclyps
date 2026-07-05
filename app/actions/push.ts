"use server"

import { headers } from "next/headers"
import { getCurrentUserProfileFast } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type PushActionResult = { ok: boolean; error?: string }

type SubscriptionInput = {
  endpoint: string
  p256dh: string
  auth: string
}

export async function savePushSubscription(
  sub: SubscriptionInput,
): Promise<PushActionResult> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, error: "auth" }

  const endpoint = (sub?.endpoint ?? "").trim()
  const p256dh = (sub?.p256dh ?? "").trim()
  const auth = (sub?.auth ?? "").trim()
  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return { ok: false, error: "invalid" }
  }

  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }

  const headerList = await headers()
  const userAgent = headerList.get("user-agent")?.slice(0, 500) ?? null

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_profile_id: me.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" },
  )
  if (error) return { ok: false, error: "insert" }
  return { ok: true }
}

export async function removePushSubscription(
  endpoint: string,
): Promise<PushActionResult> {
  const me = await getCurrentUserProfileFast()
  if (!me) return { ok: false, error: "auth" }

  const trimmed = (endpoint ?? "").trim()
  if (!trimmed) return { ok: false, error: "invalid" }

  const admin = createSupabaseAdminClient()
  if (!admin) return { ok: false, error: "server" }

  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", trimmed)
    .eq("user_profile_id", me.id)
  return { ok: true }
}
