"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Eye, EyeOff } from "lucide-react"
import type { AdminAuthHealth } from "@/lib/admin/types"
import { useLanguage } from "@/components/language-provider"

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
  const { t, lang } = useLanguage()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const retryAfterLabel = formatRetryAfter(retryAfter, lang)

  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-white/80">
          {lang === "uk" ? "Пароль" : "Password"}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={lang === "uk" ? "Введіть пароль..." : "Enter password..."}
            className="w-full rounded-xl border border-white/10 bg-black/30 pl-4 pr-12 py-3 text-white outline-none transition focus:border-emerald-300/60"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition focus:outline-none cursor-pointer p-1 rounded-lg hover:bg-white/5"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>

      {error === "invalid" && (
        <p className="text-sm text-red-300">
          {lang === "uk" ? "Неправильний пароль." : "Incorrect password."}
        </p>
      )}

      {error === "unavailable" && (
        <p className="text-sm text-amber-200">
          {lang === "uk" ? "Доступ адміністратора ще не налаштовано." : "Admin access is not configured yet."}
        </p>
      )}

      {error === "storage" && (
        <p className="text-sm text-amber-200">
          {lang === "uk"
            ? "Сховище авторизації адміністратора не готове. Застосуйте міграцію Supabase."
            : "Admin auth storage is not ready. Apply the Supabase admin auth migration."}
        </p>
      )}

      {error === "rate-limited" && (
        <p className="text-sm text-red-300">
          {lang === "uk"
            ? `Забагато спроб. Спробуйте знову ${retryAfterLabel ? ` через ${retryAfterLabel}` : " пізніше"}.`
            : `Too many attempts. Try again ${retryAfterLabel ? ` in ${retryAfterLabel}` : " later"}.`}
        </p>
      )}

      {health && <AdminAuthHealthPanel health={health} lang={lang} />}

      <AdminLoginButton lang={lang} />
    </form>
  )
}

function AdminAuthHealthPanel({ health, lang }: { health: AdminAuthHealth; lang: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs leading-5 text-white/55">
      <p className="font-medium uppercase tracking-[0.2em] text-white/45">
        {lang === "uk" ? "Стан авторизації" : "Auth health"}
      </p>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <dt>{lang === "uk" ? "Конфігурація присутня" : "Env present"}</dt>
        <dd className="text-white/70">
          {yesNo(health.passwordHashPresent && health.sessionSecretPresent, lang)}
        </dd>
        <dt>{lang === "uk" ? "Формат хешу валідний" : "Hash format valid"}</dt>
        <dd className="text-white/70">{yesNo(health.passwordHashFormatValid, lang)}</dd>
        <dt>{lang === "uk" ? "Секрет сесії валідний" : "Session secret valid"}</dt>
        <dd className="text-white/70">
          {yesNo(health.sessionSecretFormatValid, lang)}
        </dd>
        <dt>{lang === "uk" ? "Кукі сесії зчитується" : "Session cookie readable"}</dt>
        <dd className="text-white/70">{yesNo(health.sessionCookieReadable, lang)}</dd>
        <dt>{lang === "uk" ? "Екрановані роздільники хешу" : "Escaped hash separators"}</dt>
        <dd className="text-white/70">
          {yesNo(health.passwordHashEscapedDollarSigns, lang)}
        </dd>
      </dl>
    </div>
  )
}

function yesNo(value: boolean, lang: string) {
  return value
    ? (lang === "uk" ? "так" : "yes")
    : (lang === "uk" ? "ні" : "no")
}

function formatRetryAfter(value: string | undefined, lang: string) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return null

  const roundedSeconds = Math.ceil(seconds)
  if (roundedSeconds < 60) {
    if (lang === "uk") {
      return `${roundedSeconds} сек.`
    }
    return `${roundedSeconds} second${roundedSeconds === 1 ? "" : "s"}`
  }

  const minutes = Math.ceil(roundedSeconds / 60)
  if (lang === "uk") {
    return `${minutes} хв.`
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`
}

type ButtonProps = {
  lang: string
}

function AdminLoginButton({ lang }: ButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-emerald-300 px-4 py-3 font-medium text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
    >
      {pending
        ? (lang === "uk" ? "Вхід..." : "Continuing...")
        : (lang === "uk" ? "Увійти" : "Continue")}
    </button>
  )
}
