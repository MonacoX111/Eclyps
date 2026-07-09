"use client"

import type React from "react"
import { Bell, CheckCircle2, Send, Smartphone, UserRound, XCircle } from "lucide-react"
import { sendTestPushNotification } from "@/app/admin/actions"
import type { AdminNotificationDiagnostics } from "@/lib/admin/notifications"
import type { AdminFeedback } from "@/lib/admin/types"
import { AdminEmptyState } from "@/components/admin/admin-section"
import { SubmitButton } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"

type NotificationDiagnosticsPanelProps = {
  diagnostics: AdminNotificationDiagnostics
  feedback: AdminFeedback | null
}

export function NotificationDiagnosticsPanel({
  diagnostics,
  feedback,
}: NotificationDiagnosticsPanelProps) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"

  return (
    <section className="glass-card rounded-2xl border border-white/5 p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Bell className="h-5 w-5 text-emerald-400" />
            {isUk ? "Діагностика сповіщень" : "Notification diagnostics"}
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">
            {isUk
              ? "Перевірка push-конфігурації, підписок пристроїв і тестова відправка на телефон."
              : "Push configuration, device subscriptions, and test delivery to a phone."}
          </p>
        </div>
        <StatusBadge ok={diagnostics.pushConfigured}>
          {diagnostics.pushConfigured
            ? isUk ? "Push налаштовано" : "Push configured"
            : isUk ? "Push не готовий" : "Push not ready"}
        </StatusBadge>
      </div>

      {feedback ? (
        <div
          role={feedback.tone === "success" ? "status" : "alert"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              : "border-red-300/20 bg-red-300/10 text-red-100"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {diagnostics.error ? (
        <div role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
          {isUk ? "Діагностика частково недоступна:" : "Diagnostics are partially unavailable:"} {diagnostics.error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <DiagnosticMetric
          label={isUk ? "Public VAPID" : "Public VAPID"}
          value={diagnostics.hasPublicVapidKey ? "OK" : "Missing"}
          ok={diagnostics.hasPublicVapidKey}
        />
        <DiagnosticMetric
          label={isUk ? "Private VAPID" : "Private VAPID"}
          value={diagnostics.hasPrivateVapidKey ? "OK" : "Missing"}
          ok={diagnostics.hasPrivateVapidKey}
        />
        <DiagnosticMetric
          label={isUk ? "Пристрої" : "Devices"}
          value={String(diagnostics.subscriptionCount)}
          icon={Smartphone}
        />
        <DiagnosticMetric
          label={isUk ? "Користувачі" : "Users"}
          value={String(diagnostics.subscribedUserCount)}
          icon={UserRound}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <article className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-white">
              {isUk ? "Push-підписки" : "Push subscribers"}
            </h4>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/50">
              {diagnostics.vapidSubject ?? "mailto fallback"}
            </span>
          </div>

          {diagnostics.subscribers.length === 0 ? (
            <AdminEmptyState>
              {isUk
                ? "Ще немає користувачів із активними push-підписками. Користувач має увімкнути сповіщення на сторінці друзів."
                : "No users have active push subscriptions yet. A user must enable notifications on the friends page."}
            </AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-2">
              {diagnostics.subscribers.slice(0, 8).map((subscriber) => (
                <div
                  key={subscriber.userProfileId}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{subscriber.displayName}</p>
                    <p className="mt-1 truncate text-xs text-white/45">
                      {subscriber.discordUsername ? `Discord: ${subscriber.discordUsername}` : subscriber.userProfileId}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">
                    {subscriber.subscriptionCount} {isUk ? "пристр." : "device(s)"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Send className="h-4 w-4 text-emerald-300" />
            {isUk ? "Тестове сповіщення" : "Test notification"}
          </h4>
          <p className="mt-2 text-xs leading-5 text-white/50">
            {isUk
              ? "Надішли тест на конкретний профіль із push-підпискою. Так перевіряємо телефон без реального повідомлення другу."
              : "Send a test to a profile with a push subscription. This verifies phone delivery without a real friend message."}
          </p>

          <form action={sendTestPushNotification} className="mt-4 space-y-3">
            <select
              name="user_profile_id"
              required
              disabled={diagnostics.subscribers.length === 0 || !diagnostics.pushConfigured}
              className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-300/45 disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue=""
            >
              <option value="" disabled>
                {isUk ? "Оберіть отримувача" : "Select recipient"}
              </option>
              {diagnostics.subscribers.map((subscriber) => (
                <option key={subscriber.userProfileId} value={subscriber.userProfileId}>
                  {subscriber.displayName} ({subscriber.subscriptionCount})
                </option>
              ))}
            </select>
            <SubmitButton
              label={isUk ? "Надіслати тест" : "Send test"}
              disabled={diagnostics.subscribers.length === 0 || !diagnostics.pushConfigured}
            />
          </form>
        </article>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DiagnosticMetric
          label={isUk ? "In-app notifications" : "In-app notifications"}
          value={String(diagnostics.notificationCount)}
        />
        <DiagnosticMetric
          label={isUk ? "Непрочитані" : "Unread"}
          value={String(diagnostics.unreadNotificationCount)}
        />
      </div>
    </section>
  )
}

function DiagnosticMetric({
  label,
  value,
  ok,
  icon: Icon,
}: {
  label: string
  value: string
  ok?: boolean
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</p>
        {typeof ok === "boolean" ? (
          ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-red-300" />
        ) : Icon ? (
          <Icon className="h-4 w-4 text-emerald-300" />
        ) : null}
      </div>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  )
}

function StatusBadge({
  ok,
  children,
}: {
  ok: boolean
  children: React.ReactNode
}) {
  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
      ok
        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
        : "border-red-300/25 bg-red-300/10 text-red-100"
    }`}>
      {children}
    </span>
  )
}
