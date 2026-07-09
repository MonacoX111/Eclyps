import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isPushConfigured } from "@/lib/push/send"

export type AdminPushSubscriber = {
  userProfileId: string
  displayName: string
  discordUsername: string | null
  subscriptionCount: number
  latestSubscriptionAt: string | null
}

export type AdminNotificationDiagnostics = {
  pushConfigured: boolean
  hasPublicVapidKey: boolean
  hasPrivateVapidKey: boolean
  vapidSubject: string | null
  subscriptionCount: number
  subscribedUserCount: number
  notificationCount: number
  unreadNotificationCount: number
  subscribers: AdminPushSubscriber[]
  error: string | null
}

export async function getAdminNotificationDiagnostics(): Promise<AdminNotificationDiagnostics> {
  noStore()

  const base = {
    pushConfigured: isPushConfigured(),
    hasPublicVapidKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    hasPrivateVapidKey: Boolean(process.env.VAPID_PRIVATE_KEY),
    vapidSubject: process.env.VAPID_SUBJECT?.trim() || null,
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    return {
      ...base,
      subscriptionCount: 0,
      subscribedUserCount: 0,
      notificationCount: 0,
      unreadNotificationCount: 0,
      subscribers: [],
      error: "Supabase admin client is not configured.",
    }
  }

  try {
    const [subscriptionsResult, notificationCountResult, unreadNotificationCountResult] =
      await Promise.all([
        admin
          .from("push_subscriptions")
          .select("id, user_profile_id, created_at")
          .order("created_at", { ascending: false }),
        admin
          .from("notifications")
          .select("id", { count: "exact", head: true }),
        admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null),
      ])

    if (subscriptionsResult.error) {
      return {
        ...base,
        subscriptionCount: 0,
        subscribedUserCount: 0,
        notificationCount: notificationCountResult.count ?? 0,
        unreadNotificationCount: unreadNotificationCountResult.count ?? 0,
        subscribers: [],
        error: subscriptionsResult.error.message,
      }
    }

    const subscriptions = (subscriptionsResult.data ?? []) as {
      id: string
      user_profile_id: string
      created_at: string | null
    }[]
    const userIds = Array.from(new Set(subscriptions.map((subscription) => subscription.user_profile_id)))
    const profilesById = new Map<string, { display_name: string | null; discord_username: string | null }>()

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from("user_profiles")
        .select("id, display_name, discord_username")
        .in("id", userIds)

      if (profilesError) {
        return {
          ...base,
          subscriptionCount: subscriptions.length,
          subscribedUserCount: userIds.length,
          notificationCount: notificationCountResult.count ?? 0,
          unreadNotificationCount: unreadNotificationCountResult.count ?? 0,
          subscribers: [],
          error: profilesError.message,
        }
      }

      for (const profile of profiles ?? []) {
        profilesById.set(profile.id, {
          display_name: profile.display_name ?? null,
          discord_username: profile.discord_username ?? null,
        })
      }
    }

    const subscriberMap = new Map<string, AdminPushSubscriber>()
    for (const subscription of subscriptions) {
      const profile = profilesById.get(subscription.user_profile_id)
      const existing = subscriberMap.get(subscription.user_profile_id)

      subscriberMap.set(subscription.user_profile_id, {
        userProfileId: subscription.user_profile_id,
        displayName:
          existing?.displayName ??
          profile?.display_name ??
          profile?.discord_username ??
          "Unknown user",
        discordUsername: existing?.discordUsername ?? profile?.discord_username ?? null,
        subscriptionCount: (existing?.subscriptionCount ?? 0) + 1,
        latestSubscriptionAt: existing?.latestSubscriptionAt ?? subscription.created_at,
      })
    }

    return {
      ...base,
      subscriptionCount: subscriptions.length,
      subscribedUserCount: subscriberMap.size,
      notificationCount: notificationCountResult.count ?? 0,
      unreadNotificationCount: unreadNotificationCountResult.count ?? 0,
      subscribers: Array.from(subscriberMap.values()).sort(
        (left, right) =>
          getTime(right.latestSubscriptionAt) - getTime(left.latestSubscriptionAt),
      ),
      error: notificationCountResult.error?.message ?? unreadNotificationCountResult.error?.message ?? null,
    }
  } catch (error) {
    return {
      ...base,
      subscriptionCount: 0,
      subscribedUserCount: 0,
      notificationCount: 0,
      unreadNotificationCount: 0,
      subscribers: [],
      error: error instanceof Error ? error.message : "Unexpected notification diagnostics error.",
    }
  }
}

function getTime(value: string | null) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}
