import { readOptionalUrlEnv, readUrlEnv } from "@/lib/env/shared"

export type PublicEnv = {
  nodeEnv: "development" | "production" | "test"
  isProduction: boolean
  supabaseUrl: string
  supabaseAnonKey: string
  instagramUrl: string
  siteUrl: string | null
}

let cachedPublicEnv: PublicEnv | null = null

export function getPublicEnv() {
  if (cachedPublicEnv) return cachedPublicEnv

  const nodeEnv = readNodeEnv(process.env.NODE_ENV)

  cachedPublicEnv = {
    nodeEnv,
    isProduction: nodeEnv === "production",
    supabaseUrl: readUrlEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabaseAnonKey: readPublicKeyEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    instagramUrl:
      readOptionalUrlEnv(
        "NEXT_PUBLIC_INSTAGRAM_URL",
        process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      ) ?? "https://www.instagram.com/eclyps.hub/",
    siteUrl: readOptionalUrlEnv(
      "NEXT_PUBLIC_SITE_URL",
      process.env.NEXT_PUBLIC_SITE_URL,
    ),
  }

  return cachedPublicEnv
}

function readPublicKeyEnv(name: string, value: string | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`)
  }

  return value.trim()
}

function readNodeEnv(value: string | undefined): PublicEnv["nodeEnv"] {
  return value === "production" || value === "test" ? value : "development"
}
