"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type NotificationRow = {
  id: string
  user_profile_id: string
  player_id: string | null
  team_id: string | null
  tournament_id: string | null
  match_id: string | null
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
}

/**
 * Loads notifications for the currently logged-in user.
 * Relies on Supabase RLS and cookies.
 */
export async function getUserNotifications(): Promise<NotificationRow[]> {
  try {
    const userProfile = await getCurrentUserProfile()
    if (!userProfile) {
      return []
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_profile_id", userProfile.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("getUserNotifications: Error loading notifications from Supabase:", error)
      return []
    }

    return (data as NotificationRow[]) ?? []
  } catch (err) {
    console.error("getUserNotifications: Unexpected exception:", err)
    return []
  }
}

/**
 * Marks a notification as read.
 * Safe update policy restricts modifications to the current user profile's records only.
 */
export async function markNotificationAsRead(id: string) {
  try {
    const userProfile = await getCurrentUserProfile()
    if (!userProfile) {
      return { ok: false, error: "unauthorized" }
    }

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_profile_id", userProfile.id) // Dual guard: filter by matching owner profile ID

    if (error) {
      console.error("markNotificationAsRead: Database update failure:", error)
      return { ok: false, error: error.message }
    }

    revalidatePath("/")
    return { ok: true }
  } catch (err) {
    console.error("markNotificationAsRead: Unexpected exception:", err)
    return { ok: false, error: err instanceof Error ? err.message : "unexpected-error" }
  }
}
