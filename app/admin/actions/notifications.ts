"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { sendPushToUser } from "@/lib/push/send"
import { requireAdminSession } from "./shared"

export async function sendTestPushNotification(formData: FormData) {
  await requireAdminSession()

  const userProfileId = readRequiredString(formData, "user_profile_id")

  if (!userProfileId) {
    redirect("/admin?toolError=missing-user&tab=settings#settings")
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    redirect("/admin?toolError=admin-client-unavailable&tab=settings#settings")
  }

  const { count, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_profile_id", userProfileId)

  if (subscriptionError) {
    redirect("/admin?toolError=notification-test-failed&tab=settings#settings")
  }

  if (!count) {
    redirect("/admin?toolError=no-push-subscription&tab=settings#settings")
  }

  const title = "Eclyps test notification"
  const message = "Push notifications are working for this device."

  await admin.from("notifications").insert({
    user_profile_id: userProfileId,
    type: "admin_test_push",
    title,
    message,
  })

  try {
    await sendPushToUser(userProfileId, {
      title,
      body: message,
      url: "/account?tab=notifications",
      tag: "admin-test-push",
    })
  } catch {
    redirect("/admin?toolError=notification-test-failed&tab=settings#settings")
  }

  revalidatePath("/admin")
  redirect("/admin?toolSuccess=notification-test-sent&tab=settings#settings")
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}
