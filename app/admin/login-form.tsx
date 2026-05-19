"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"

type AdminLoginFormProps = {
  action: (formData: FormData) => void | Promise<void>
  error?: string
}

export function AdminLoginForm({ action, error }: AdminLoginFormProps) {
  const [password, setPassword] = useState("")

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
          Too many attempts. Try again later.
        </p>
      )}

      <AdminLoginButton />
    </form>
  )
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
