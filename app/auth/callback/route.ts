import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { upsertUserProfileFromAuthUser } from "@/lib/auth/user-profile"
import { getPublicEnv } from "@/lib/env/public"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/registration#registration"
  const hasPlayerApplicationIntent =
    request.cookies.get("eclyps_player_application_intent")?.value === "1"

  if (!code) {
    return NextResponse.redirect(new URL("/registration?registrationError=discord-login-failed#registration", requestUrl.origin))
  }

  const { supabase, cookiesToSet } = createCallbackSupabaseClient(request)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/registration?registrationError=discord-login-failed#registration", requestUrl.origin))
  }

  const { data } = await supabase.auth.getUser()
  if (data.user) {
    const { data: sessionData } = await supabase.auth.getSession()
    const { profile: userProfile } = await upsertUserProfileFromAuthUser(data.user, sessionData.session?.provider_token)
    if (userProfile && hasPlayerApplicationIntent) {
      await createPlayerApplicationFromIntent(userProfile)
    }
  }

  const response = NextResponse.redirect(getSafeRedirectUrl(next, requestUrl.origin))
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  response.cookies.delete("eclyps_player_application_intent")

  return response
}

function createCallbackSupabaseClient(request: NextRequest) {
  const publicEnv = getPublicEnv()
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(newCookies) {
        cookiesToSet.push(...newCookies)
      },
    },
  })

  return { supabase, cookiesToSet }
}

function getSafeRedirectUrl(next: string, origin: string) {
  if (!next.startsWith("/") || next.startsWith("//")) {
    return new URL("/registration#registration", origin)
  }

  return new URL(next, origin)
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
