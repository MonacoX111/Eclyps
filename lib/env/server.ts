import "server-only"

import {
  EnvValidationError,
  readMinimumLengthEnv,
  readOptionalEnv,
  readRequiredEnv,
} from "@/lib/env/shared"
import { getPublicEnv } from "@/lib/env/public"

export type AdminCredential =
  | { type: "hash"; value: string }
  | { type: "plain-dev-only"; value: string }

export type ServerEnv = {
  public: ReturnType<typeof getPublicEnv>
  supabaseServiceRoleKey: string
}

export type AdminEnv = {
  adminCredential: AdminCredential | null
  adminSessionSecret: string
}

let cachedServerEnv: ServerEnv | null = null
let cachedAdminEnv: AdminEnv | null = null

export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv

  const publicEnv = getPublicEnv()
  cachedServerEnv = {
    public: publicEnv,
    supabaseServiceRoleKey: readRequiredEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  }

  return cachedServerEnv
}

export function getAdminEnv() {
  if (cachedAdminEnv) return cachedAdminEnv

  const publicEnv = getPublicEnv()
  const adminPasswordHash = readOptionalEnv(process.env.ADMIN_PASSWORD_HASH)
  const adminPassword = readOptionalEnv(process.env.ADMIN_PASSWORD)
  const adminSessionSecret = readOptionalEnv(process.env.ADMIN_SESSION_SECRET)

  if (publicEnv.isProduction && !adminPasswordHash) {
    throw new EnvValidationError("ADMIN_PASSWORD_HASH is required in production.")
  }

  if (publicEnv.isProduction && adminPassword) {
    throw new EnvValidationError(
      "ADMIN_PASSWORD must not be used in production. Use ADMIN_PASSWORD_HASH instead.",
    )
  }

  if (adminSessionSecret && adminSessionSecret.length < 32) {
    throw new EnvValidationError(
      "ADMIN_SESSION_SECRET must be at least 32 characters long.",
    )
  }

  if (publicEnv.isProduction && !adminSessionSecret) {
    throw new EnvValidationError("ADMIN_SESSION_SECRET is required in production.")
  }

  cachedAdminEnv = {
    adminCredential: readAdminCredential({
      adminPasswordHash,
      adminPassword,
      isProduction: publicEnv.isProduction,
    }),
    adminSessionSecret: readMinimumLengthEnv(
      "ADMIN_SESSION_SECRET",
      adminSessionSecret ?? undefined,
      32,
    ),
  }

  return cachedAdminEnv
}

export function getOptionalServerEnv() {
  try {
    return getServerEnv()
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`Server environment is not configured: ${error.message}`)
      return null
    }

    throw error
  }
}

export function getOptionalAdminEnv() {
  try {
    return getAdminEnv()
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`Admin environment is not configured: ${error.message}`)
      return null
    }

    throw error
  }
}

function readAdminCredential({
  adminPasswordHash,
  adminPassword,
  isProduction,
}: {
  adminPasswordHash: string | null
  adminPassword: string | null
  isProduction: boolean
}): AdminCredential | null {
  if (adminPasswordHash) {
    return { type: "hash", value: adminPasswordHash }
  }

  if (!isProduction && adminPassword) {
    return { type: "plain-dev-only", value: adminPassword }
  }

  return null
}
