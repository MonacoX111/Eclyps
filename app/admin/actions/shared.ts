import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth"
import { logMutationError } from "@/lib/admin/errors"

export async function requireAdminSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!(await isValidAdminSession(sessionCookie))) {
    redirect("/admin")
  }
}

export async function runSupabaseMutation<T extends { error: unknown }>(
  context: string,
  mutation: () => PromiseLike<T>,
) {
  try {
    return await mutation()
  } catch (error) {
    logMutationError(context, error)
    return { error } as T
  }
}

export function redirectAdminError(
  param: string,
  value: string,
  hash: string,
): never {
  redirect(`/admin?${param}=${value}#${hash}`)
}

export function redirectAdminSuccess(
  param: string,
  value: string,
  hash: string,
): never {
  redirect(`/admin?${param}=${value}#${hash}`)
}
