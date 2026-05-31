"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"


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
  teams?: { logo_url: string | null } | { logo_url: string | null }[] | null
}

/**
 * Loads notifications for the currently logged-in user.
 * Queries using the admin client to bypass any relational RLS constraints on teams table,
 * while safely securing user access by filtering on userProfile.id.
 */
export async function getUserNotifications(): Promise<NotificationRow[]> {
  try {
    const userProfile = await getCurrentUserProfile()
    if (!userProfile) {
      return []
    }

    const supabaseAdmin = createSupabaseAdminClient()
    if (!supabaseAdmin) {
      console.error("getUserNotifications: Admin client unavailable")
      return []
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*, teams(logo_url)")
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
