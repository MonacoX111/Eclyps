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

export type AdminEnvDiagnostics = {
  passwordHashPresent: boolean
  sessionSecretPresent: boolean
  passwordHashFormatValid: boolean
  passwordHashEscapedDollarSigns: boolean
  sessionSecretFormatValid: boolean
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

  if (
    adminPasswordHash &&
    !isValidAdminPasswordHashFormat(normalizeAdminPasswordHash(adminPasswordHash))
  ) {
    throw new EnvValidationError(
      "ADMIN_PASSWORD_HASH must use pbkdf2_sha256$iterations$salt$base64url-hash format.",
    )
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

export function getAdminEnvDiagnostics(): AdminEnvDiagnostics {
  const adminPasswordHash = readOptionalEnv(process.env.ADMIN_PASSWORD_HASH)
  const adminSessionSecret = readOptionalEnv(process.env.ADMIN_SESSION_SECRET)
  const normalizedHash = adminPasswordHash
    ? normalizeAdminPasswordHash(adminPasswordHash)
    : null

  return {
    passwordHashPresent: Boolean(adminPasswordHash),
    sessionSecretPresent: Boolean(adminSessionSecret),
    passwordHashFormatValid: Boolean(
      normalizedHash && isValidAdminPasswordHashFormat(normalizedHash),
    ),
    passwordHashEscapedDollarSigns: Boolean(
      adminPasswordHash && adminPasswordHash.includes("\\$"),
    ),
    sessionSecretFormatValid: Boolean(
      adminSessionSecret && adminSessionSecret.length >= 32,
    ),
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
    return { type: "hash", value: normalizeAdminPasswordHash(adminPasswordHash) }
  }

  if (!isProduction && adminPassword) {
    return { type: "plain-dev-only", value: adminPassword }
  }

  return null
}

function normalizeAdminPasswordHash(value: string) {
  return stripMatchingQuotes(value).replace(/\\\$/g, "$")
}

function stripMatchingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim()
  }

  return value
}

function isValidAdminPasswordHashFormat(value: string) {
  const [algorithm, iterationsValue, salt, storedHash, extra] = value.split("$")
  const iterations = Number(iterationsValue)

  return (
    algorithm === "pbkdf2_sha256" &&
    Number.isInteger(iterations) &&
    iterations >= 100000 &&
    Boolean(salt) &&
    /^[A-Za-z0-9_-]+$/.test(storedHash ?? "") &&
    !extra
  )
}
