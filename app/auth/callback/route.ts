import { NextResponse, type NextRequest } from "next/server"
import { upsertUserProfileFromAuthUser } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/#registration"
  const hasPlayerApplicationIntent =
    request.cookies.get("eclyps_player_application_intent")?.value === "1"

  if (!code) {
    return NextResponse.redirect(new URL("/?registrationError=discord-login-failed#registration", requestUrl.origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/?registrationError=discord-login-failed#registration", requestUrl.origin))
  }

  const { data } = await supabase.auth.getUser()
  if (data.user) {
    const userProfile = await upsertUserProfileFromAuthUser(data.user)
    if (userProfile && hasPlayerApplicationIntent) {
      await createPlayerApplicationFromIntent(userProfile)
    }
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin))
  response.cookies.delete("eclyps_player_application_intent")

  return response
}

async function createPlayerApplicationFromIntent(userProfile: {
  id: string
  display_name: string
}) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return

  const { data: approvedPlayer, error: approvedPlayerError } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("owner_user_id", userProfile.id)
    .limit(1)
    .maybeSingle()

  if (approvedPlayerError && !isMissingStorageError(approvedPlayerError)) {
    console.error("Failed to check existing player during Discord callback:", approvedPlayerError)
    return
  }

  if (approvedPlayer) return

  const { data: pendingApplication, error: pendingError } = await supabaseAdmin
    .from("player_applications")
    .select("id")
    .eq("user_profile_id", userProfile.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle()

  if (pendingError && !isMissingStorageError(pendingError)) {
    console.error("Failed to check player application during Discord callback:", pendingError)
    return
  }

  if (pendingApplication) return

  const { error } = await supabaseAdmin
    .from("player_applications")
    .insert({
      user_profile_id: userProfile.id,
      requested_nickname: userProfile.display_name,
      requested_region: null,
      status: "pending",
    })

  if (error && error.code !== "23505") {
    console.error("Failed to create player application during Discord callback:", error)
  }
}

function isMissingStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
