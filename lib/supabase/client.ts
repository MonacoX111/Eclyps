import { createClient } from "@supabase/supabase-js"
import { getPublicEnv } from "@/lib/env/public"

const publicEnv = getPublicEnv()

function createSupabaseClient() {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
}

export const supabase = createSupabaseClient()
