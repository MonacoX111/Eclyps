import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getServerEnv } from "@/lib/env/server"

export function createSupabaseAdminClient() {
  const serverEnv = getServerEnv()

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
