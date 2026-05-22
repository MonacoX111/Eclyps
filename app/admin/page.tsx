import { cookies } from "next/headers"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminLoginCard } from "@/components/admin/admin-login-card"
import { AdminShell } from "@/components/admin/admin-shell"
import {
  ADMIN_SESSION_COOKIE,
  getAdminAuthHealth,
  isValidAdminSession,
} from "@/lib/admin-auth"
import type { AdminSearchParams } from "@/lib/admin/types"

export const dynamic = "force-dynamic"

type AdminPageProps = {
  searchParams?: Promise<AdminSearchParams>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAuthenticated = await isValidAdminSession(sessionCookie)
  const health = isAuthenticated ? null : getAdminAuthHealth(sessionCookie)
  const resolvedSearchParams = await searchParams

  return (
    <AdminShell>
      {isAuthenticated ? (
        <AdminDashboard searchParams={resolvedSearchParams} />
      ) : (
        <AdminLoginCard
          error={resolvedSearchParams?.error}
          health={health}
          retryAfter={resolvedSearchParams?.retryAfter}
        />
      )}
    </AdminShell>
  )
}
