import "server-only"

import webpush from "web-push"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null

  // Apple (web.push.apple.com) rejects the JWT with 403 BadJwtToken when the
  // VAPID subject has an invalid/non-existent domain (e.g. "eclyps.hub").
  // Only trust VAPID_SUBJECT when set to a real value; otherwise fall back
  // to a known-good mailto address.
  const raw = (process.env.VAPID_SUBJECT ?? "").trim()
  const isBadSubject = !raw || raw.includes("eclyps.hub") || raw.includes("example")
  const subject = isBadSubject ? "mailto:eclypshub@gmail.com" : raw

  return { publicKey, privateKey, subject }
}

export function isPushConfigured(): boolean {
  return getVapidConfig() !== null
}

/**
 * Send a Web Push notification to every registered device of a user.
 * Silently no-ops when VAPID keys are missing. Expired/invalid
 * subscriptions (404/410) are deleted automatically.
 */
export async function sendPushToUser(
  userProfileId: string,
  payload: PushPayload,
): Promise<void> {
  const vapid = getVapidConfig()
  if (!vapid) {
    console.warn("sendPushToUser: VAPID keys are not configured.")
    return
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    console.warn("sendPushToUser: Supabase admin client is unavailable.")
    return
  }

  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_profile_id", userProfileId)

  if (subsError) {
    console.error("sendPushToUser: failed to load push subscriptions", subsError)
    return
  }

  if (!subs || subs.length === 0) return

  webpush.setVapidDetails(
    vapid.subject,
    vapid.publicKey,
    vapid.privateKey,
  )

  const body = JSON.stringify(payload)
  const staleIds: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 },
        )
      } catch (error: unknown) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? (error as { statusCode: number }).statusCode
            : 0
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id)
        } else {
          console.error("sendPushToUser: provider rejected notification", {
            statusCode,
            endpointOrigin: getEndpointOrigin(sub.endpoint),
          })
        }
      }
    }),
  )

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds)
  }
}

function getEndpointOrigin(endpoint: string) {
  try {
    return new URL(endpoint).origin
  } catch {
    return "invalid-endpoint"
  }
}
