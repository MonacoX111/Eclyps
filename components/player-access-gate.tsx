"use client"

import Link from "next/link"
import { Clock3, ShieldCheck, UserPlus } from "lucide-react"
import { DiscordLoginOnboarding } from "@/components/discord-login-onboarding"
import { useLanguage } from "@/components/language-provider"
import type { PlayerPageAccess } from "@/lib/auth/player-access"

type PlayerAccessGateProps = {
  reason: Exclude<PlayerPageAccess, { allowed: true }>["reason"]
}

export function PlayerAccessGate({ reason }: PlayerAccessGateProps) {
  const { lang } = useLanguage()
  const copy = getAccessCopy(reason, lang)

  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="glass-card relative overflow-hidden rounded-2xl p-6 text-center md:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165_/_0.10),transparent_42%)]" />
          <div className="relative z-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
              <AccessIcon reason={reason} />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 text-2xl font-black text-white md:text-4xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/60">
              {copy.message}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {reason === "login_required" ? (
                <DiscordLoginOnboarding
                  label={copy.primaryAction}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary/90 sm:w-auto"
                />
              ) : (
                <Link
                  href="/registration"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary/90 sm:w-auto"
                >
                  {copy.primaryAction}
                </Link>
              )}
              <Link
                href="/"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-white/25 hover:text-white sm:w-auto"
              >
                {copy.secondaryAction}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AccessIcon({ reason }: PlayerAccessGateProps) {
  if (reason === "login_required") {
    return <UserPlus className="h-7 w-7 text-primary" aria-hidden="true" />
  }

  if (reason === "approval_rejected") {
    return <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
  }

  return <Clock3 className="h-7 w-7 text-primary" aria-hidden="true" />
}

function getAccessCopy(reason: PlayerAccessGateProps["reason"], lang: string) {
  const isUk = lang === "uk"

  if (reason === "login_required") {
    return {
      eyebrow: isUk ? "Потрібна авторизація" : "Authorization required",
      title: isUk ? "Авторизуйтеся через Discord" : "Sign in with Discord",
      message: isUk
        ? "Щоб переглядати цю сторінку, спочатку увійдіть через Discord. Після входу сайт створить ваш профіль гравця для перевірки."
        : "To view this page, sign in with Discord first. After login, the site will create your player profile for review.",
      primaryAction: isUk ? "Увійти через Discord" : "Sign in with Discord",
      secondaryAction: isUk ? "На головну" : "Back to home",
    }
  }

  if (reason === "approval_rejected") {
    return {
      eyebrow: isUk ? "Профіль не підтверджено" : "Profile not approved",
      title: isUk ? "Потрібна перевірка профілю" : "Profile review required",
      message: isUk
        ? "Ваш профіль гравця ще не підтверджений адміністратором або був відхилений. Перейдіть на сторінку реєстрації й оновіть заявку."
        : "Your player profile is not approved yet or was rejected. Open the registration page and update your application.",
      primaryAction: isUk ? "Відкрити реєстрацію" : "Open registration",
      secondaryAction: isUk ? "На головну" : "Back to home",
    }
  }

  return {
    eyebrow: isUk ? "Очікується підтвердження" : "Approval pending",
    title: isUk ? "Дочекайтеся підтвердження профілю" : "Wait for admin approval",
    message: isUk
      ? "Ваш профіль гравця вже створений, але ще очікує підтвердження адміністратором. Після підтвердження ці сторінки відкриються автоматично."
      : "Your player profile has been created, but it is still waiting for admin approval. These pages will unlock automatically after approval.",
    primaryAction: isUk ? "Перейти до реєстрації" : "Go to registration",
    secondaryAction: isUk ? "На головну" : "Back to home",
  }
}
