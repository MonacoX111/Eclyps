import { createBrowserClient } from "@supabase/ssr"
import { getPublicEnv } from "@/lib/env/public"

const publicEnv = getPublicEnv()

function createSupabaseClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
}

export const supabase = createSupabaseClient()
