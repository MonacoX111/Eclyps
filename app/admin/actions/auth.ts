"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  ADMIN_SESSION_COOKIE,
  checkAdminLoginRateLimit,
  clearAdminLoginRateLimit,
  createAdminSession,
  getAdminAuthReadiness,
  getAdminLoginIdentifier,
  getAdminSessionCookieOptions,
  getAdminSessionDeleteCookieOptions,
  getAdminUserAgent,
  isValidAdminPassword,
  recordFailedAdminLogin,
  revokeAdminSession,
} from "@/lib/admin-auth"
import { parseLoginFormData } from "@/lib/admin/validation"

export async function loginAdmin(formData: FormData) {
  const readiness = await getAdminAuthReadiness()
  if (!readiness.ok) {
    redirect(
      readiness.reason === "storage"
        ? "/admin?error=storage"
        : "/admin?error=unavailable",
    )
  }

  const headersList = await headers()
  const identifier = getAdminLoginIdentifier(headersList)
  const rateLimit = await checkAdminLoginRateLimit(identifier)

  if (!rateLimit.allowed) {
    redirect(
      rateLimit.retryAfterSeconds
        ? "/admin?error=rate-limited"
        : "/admin?error=unavailable",
    )
  }

  const parsed = parseLoginFormData(formData)

  if (!parsed.ok || !(await isValidAdminPassword(parsed.data.password))) {
    await recordFailedAdminLogin(identifier)
    redirect("/admin?error=invalid")
  }

  await clearAdminLoginRateLimit(identifier)

  const session = await createAdminSession({
    identifier,
    userAgent: getAdminUserAgent(headersList),
  })

  if (!session) {
    redirect("/admin?error=unavailable")
  }

  const cookieStore = await cookies()

  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    session.token,
    getAdminSessionCookieOptions(session.maxAge),
  )

  redirect("/admin")
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  await revokeAdminSession(sessionCookie)

  cookieStore.delete(getAdminSessionDeleteCookieOptions())

  redirect("/admin")
}
