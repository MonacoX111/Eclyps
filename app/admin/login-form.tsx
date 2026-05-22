"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import type { AdminAuthHealth } from "@/lib/admin/types"

type AdminLoginFormProps = {
  action: (formData: FormData) => void | Promise<void>
  error?: string
  health: AdminAuthHealth | null
  retryAfter?: string
}

export function AdminLoginForm({
  action,
  error,
  health,
  retryAfter,
}: AdminLoginFormProps) {
  const [password, setPassword] = useState("")
  const retryAfterLabel = formatRetryAfter(retryAfter)

  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-white/80">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
        />
      </div>

      {error === "invalid" && (
        <p className="text-sm text-red-300">Incorrect password.</p>
      )}

      {error === "unavailable" && (
        <p className="text-sm text-amber-200">
          Admin access is not configured yet.
        </p>
      )}

      {error === "storage" && (
        <p className="text-sm text-amber-200">
          Admin auth storage is not ready. Apply the Supabase admin auth migration.
        </p>
      )}

      {error === "rate-limited" && (
        <p className="text-sm text-red-300">
          Too many attempts. Try again
          {retryAfterLabel ? ` in ${retryAfterLabel}` : " later"}.
        </p>
      )}

      {health && <AdminAuthHealthPanel health={health} />}

      <AdminLoginButton />
    </form>
  )
}

function AdminAuthHealthPanel({ health }: { health: AdminAuthHealth }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs leading-5 text-white/55">
      <p className="font-medium uppercase tracking-[0.2em] text-white/45">
        Auth health
      </p>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <dt>Env present</dt>
        <dd className="text-white/70">
          {yesNo(health.passwordHashPresent && health.sessionSecretPresent)}
        </dd>
        <dt>Hash format valid</dt>
        <dd className="text-white/70">{yesNo(health.passwordHashFormatValid)}</dd>
        <dt>Session secret valid</dt>
        <dd className="text-white/70">
          {yesNo(health.sessionSecretFormatValid)}
        </dd>
        <dt>Session cookie readable</dt>
        <dd className="text-white/70">{yesNo(health.sessionCookieReadable)}</dd>
        <dt>Escaped hash separators</dt>
        <dd className="text-white/70">
          {yesNo(health.passwordHashEscapedDollarSigns)}
        </dd>
      </dl>
    </div>
  )
}

function yesNo(value: boolean) {
  return value ? "yes" : "no"
}

function formatRetryAfter(value: string | undefined) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return null

  const roundedSeconds = Math.ceil(seconds)
  if (roundedSeconds < 60) {
    return `${roundedSeconds} second${roundedSeconds === 1 ? "" : "s"}`
  }

  const minutes = Math.ceil(roundedSeconds / 60)
  return `${minutes} minute${minutes === 1 ? "" : "s"}`
}

function AdminLoginButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-emerald-300 px-4 py-3 font-medium text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
    >
      {pending ? "Continuing..." : "Continue"}
    </button>
  )
}
