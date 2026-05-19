import "server-only"

import {
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import { getPublicEnv } from "@/lib/env/public"
import { getOptionalAdminEnv } from "@/lib/env/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const ADMIN_SESSION_COOKIE = "eclyps_admin_session"
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

const SESSION_VERSION = 1
const LOGIN_ATTEMPT_LIMIT = 5
const LOGIN_WINDOW_SECONDS = 15 * 60
const LOGIN_LOCK_SECONDS = 15 * 60

type SessionPayload = {
  v: number
  sid: string
  exp: number
}

type LoginRateLimitResult = {
  allowed: boolean
  retryAfterSeconds?: number
}

export type AdminAuthReadiness =
  | { ok: true }
  | {
      ok: false
      reason: "env" | "storage"
      message: string
    }

export function isAdminPasswordConfigured() {
  const adminEnv = getOptionalAdminEnv()

  return Boolean(adminEnv?.adminCredential && adminEnv.adminSessionSecret)
}

export function isAdminAuthStorageConfigured() {
  try {
    return Boolean(createSupabaseAdminClient())
  } catch (error) {
    console.error("Admin auth storage is not configured:", error)
    return false
  }
}

export async function getAdminAuthReadiness(): Promise<AdminAuthReadiness> {
  if (!isAdminPasswordConfigured()) {
    return {
      ok: false,
      reason: "env",
      message:
        "Admin password hash and session secret are required before admin login is available.",
    }
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return {
      ok: false,
      reason: "env",
      message:
        "Supabase service-role credentials are required before admin login is available.",
    }
  }

  const checks = await Promise.all([
    supabaseAdmin.from("admin_sessions").select("id").limit(1),
    supabaseAdmin
      .from("admin_login_attempts")
      .select("identifier")
      .limit(1),
  ])

  const failedCheck = checks.find((check) => check.error)?.error
  if (failedCheck) {
    console.error("Admin auth storage check failed:", failedCheck)
    return {
      ok: false,
      reason: "storage",
      message:
        "Admin auth tables are missing or unavailable to the service-role API. Apply the admin auth migration and grants.",
    }
  }

  return { ok: true }
}

export function getAdminSessionCookieOptions(maxAge = ADMIN_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: getPublicEnv().isProduction,
    path: "/admin",
    maxAge,
  }
}

export function getAdminSessionDeleteCookieOptions() {
  return {
    name: ADMIN_SESSION_COOKIE,
    path: "/admin",
  }
}

export function getAdminLoginIdentifier(headersList: Headers) {
  const forwardedFor = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = headersList.get("x-real-ip")?.trim()
  const ip = forwardedFor || realIp || "unknown"

  return hashValue(`admin-login:${ip}`)
}

export function getAdminUserAgent(headersList: Headers) {
  const userAgent = headersList.get("user-agent")

  return typeof userAgent === "string" && userAgent.length > 0
    ? userAgent.slice(0, 512)
    : null
}

export async function isValidAdminPassword(candidate: FormDataEntryValue | null) {
  const credential = getOptionalAdminEnv()?.adminCredential

  if (!credential || typeof candidate !== "string") {
    return false
  }

  if (credential.type === "hash") {
    return verifyPasswordHash(candidate, credential.value)
  }

  return safeCompare(candidate, credential.value)
}

export async function checkAdminLoginRateLimit(
  identifier: string,
): Promise<LoginRateLimitResult> {
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    return { allowed: false }
  }

  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const { data, error } = await supabaseAdmin
    .from("admin_login_attempts")
    .select("attempt_count, window_started_at, locked_until")
    .eq("identifier", identifier)
    .maybeSingle()

  if (error) {
    console.error("Failed to read admin login rate limit:", error)
    return { allowed: false }
  }

  const lockedUntil = readTime(data?.locked_until)
  if (lockedUntil && lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000),
    }
  }

  const windowStartedAt = readTime(data?.window_started_at)
  if (!data || !windowStartedAt || now - windowStartedAt > LOGIN_WINDOW_SECONDS * 1000) {
    const { error: upsertError } = await supabaseAdmin
      .from("admin_login_attempts")
      .upsert({
        identifier,
        attempt_count: 0,
        window_started_at: nowIso,
        locked_until: null,
        last_attempt_at: nowIso,
      })

    if (upsertError) {
      console.error("Failed to initialize admin login rate limit:", upsertError)
      return { allowed: false }
    }
  }

  return { allowed: true }
}

export async function recordFailedAdminLogin(identifier: string) {
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    return
  }

  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const { data, error } = await supabaseAdmin
    .from("admin_login_attempts")
    .select("attempt_count, window_started_at")
    .eq("identifier", identifier)
    .maybeSingle()

  if (error) {
    console.error("Failed to read failed admin login count:", error)
    return
  }

  const windowStartedAt = readTime(data?.window_started_at)
  const resetWindow =
    !data || !windowStartedAt || now - windowStartedAt > LOGIN_WINDOW_SECONDS * 1000
  const nextAttemptCount = resetWindow ? 1 : Number(data.attempt_count ?? 0) + 1
  const lockedUntil =
    nextAttemptCount >= LOGIN_ATTEMPT_LIMIT
      ? new Date(now + LOGIN_LOCK_SECONDS * 1000).toISOString()
      : null

  const { error: upsertError } = await supabaseAdmin
    .from("admin_login_attempts")
    .upsert({
      identifier,
      attempt_count: nextAttemptCount,
      window_started_at: resetWindow ? nowIso : data.window_started_at,
      locked_until: lockedUntil,
      last_attempt_at: nowIso,
    })

  if (upsertError) {
    console.error("Failed to record failed admin login:", upsertError)
  }
}

export async function clearAdminLoginRateLimit(identifier: string) {
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    return
  }

  const { error } = await supabaseAdmin
    .from("admin_login_attempts")
    .delete()
    .eq("identifier", identifier)

  if (error) {
    console.error("Failed to clear admin login rate limit:", error)
  }
}

export async function createAdminSession({
  identifier,
  userAgent,
}: {
  identifier: string
  userAgent: string | null
}) {
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin || !getSessionSecret()) {
    return null
  }

  const sessionId = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000)
  const token = signSessionPayload({
    v: SESSION_VERSION,
    sid: sessionId,
    exp: expiresAt.getTime(),
  })

  const { error } = await supabaseAdmin.from("admin_sessions").insert({
    session_hash: hashValue(sessionId),
    expires_at: expiresAt.toISOString(),
    ip_hash: identifier,
    user_agent: userAgent,
  })

  if (error) {
    console.error("Failed to create admin session:", error)
    return null
  }

  return {
    token,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  }
}

export async function isValidAdminSession(value: string | undefined) {
  const payload = parseSessionToken(value)

  if (!payload || payload.exp <= Date.now()) {
    return false
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return false

  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("expires_at, revoked_at")
    .eq("session_hash", hashValue(payload.sid))
    .maybeSingle()

  if (error) {
    console.error("Failed to validate admin session:", error)
    return false
  }

  if (!data || data.revoked_at) {
    return false
  }

  const expiresAt = readTime(data.expires_at)

  return Boolean(expiresAt && expiresAt > Date.now())
}

export async function revokeAdminSession(value: string | undefined) {
  const payload = parseSessionToken(value)
  const supabaseAdmin = createSupabaseAdminClient()

  if (!payload || !supabaseAdmin) {
    return
  }

  const { error } = await supabaseAdmin
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("session_hash", hashValue(payload.sid))
    .is("revoked_at", null)

  if (error) {
    console.error("Failed to revoke admin session:", error)
  }
}

function getSessionSecret() {
  return getOptionalAdminEnv()?.adminSessionSecret ?? null
}

function signSessionPayload(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createSignature(encodedPayload)

  return `${encodedPayload}.${signature}`
}

function parseSessionToken(value: string | undefined) {
  if (!value) return null

  const [encodedPayload, signature, extra] = value.split(".")
  if (!encodedPayload || !signature || extra) return null

  const expectedSignature = createSignature(encodedPayload)
  if (!safeCompare(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>

    if (
      payload.v !== SESSION_VERSION ||
      typeof payload.sid !== "string" ||
      payload.sid.length === 0 ||
      typeof payload.exp !== "number"
    ) {
      return null
    }

    return payload as SessionPayload
  } catch {
    return null
  }
}

function createSignature(value: string) {
  const secret = getSessionSecret()
  if (!secret) return ""

  return createHmac("sha256", secret).update(value).digest("base64url")
}

function verifyPasswordHash(password: string, encodedHash: string) {
  const [algorithm, iterationsValue, salt, storedHash] = encodedHash.split("$")
  const iterations = Number(iterationsValue)

  if (
    algorithm !== "pbkdf2_sha256" ||
    !Number.isInteger(iterations) ||
    iterations < 100000 ||
    !salt ||
    !storedHash
  ) {
    return false
  }

  const candidateHash = pbkdf2Sync(
    password,
    salt,
    iterations,
    32,
    "sha256",
  ).toString("base64url")

  return safeCompare(candidateHash, storedHash)
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function readTime(value: unknown) {
  if (typeof value !== "string") return null

  const timestamp = new Date(value).getTime()

  return Number.isFinite(timestamp) ? timestamp : null
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
