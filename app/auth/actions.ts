"use server"

import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPublicEnv } from "@/lib/env/public"

export async function loginWithDiscord() {
  const supabase = await createSupabaseServerClient()
  const origin = await getSiteOrigin()
  const cookieStore = await cookies()

  cookieStore.set("eclyps_player_application_intent", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 60 * 10,
  })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: new URL("/auth/callback", origin).toString(),
      scopes: "identify email",
    },
  })

  if (error || !data.url) {
    redirect("/?registrationError=discord-login-failed#registration")
  }

  redirect(data.url)
}

export async function logoutDiscord() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/")
}

async function getSiteOrigin() {
  const publicEnv = getPublicEnv()
  if (publicEnv.siteUrl) return publicEnv.siteUrl

  const headerStore = await headers()
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const protocol = headerStore.get("x-forwarded-proto") ?? "http"

  return host ? `${protocol}://${host}` : "http://localhost:3000"
}
