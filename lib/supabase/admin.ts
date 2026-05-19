import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getOptionalServerEnv } from "@/lib/env/server"

export function createSupabaseAdminClient() {
  const serverEnv = getOptionalServerEnv()

  if (!serverEnv) {
    return null
  }

  return createClient(
    serverEnv.public.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
