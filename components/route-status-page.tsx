"use client"

import Link from "next/link"
import { AlertTriangle, Newspaper, RefreshCw, SearchX, Swords, Trophy } from "lucide-react"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { useLanguage } from "@/components/language-provider"

type RouteStatusKind = "not-found" | "error"
type RouteStatusSubject = "page" | "match" | "news" | "tournament"

type RouteStatusPageProps = {
  kind: RouteStatusKind
  subject?: RouteStatusSubject
  reset?: () => void
}

const homeLinkClassName =
  "rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-primary/90"

const secondaryLinkClassName =
  "rounded-full border border-primary/25 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/10"

export function RouteStatusPage({ kind, subject = "page", reset }: RouteStatusPageProps) {
  const { lang } = useLanguage()
  const copy = getCopy(lang, kind, subject)

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Navbar />

        <section className="relative z-10 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-primary/25 bg-primary/10 shadow-[0_0_50px_oklch(0.78_0.18_165_/_0.14)]">
              <StatusIcon kind={kind} subject={subject} />
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
              {copy.eyebrow}
            </p>
            <h1 className="glow-text mt-4 text-4xl font-black tracking-tight text-foreground md:text-6xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
              {copy.body}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/" className={homeLinkClassName}>
                {copy.home}
              </Link>
              <Link href={copy.secondaryHref} className={secondaryLinkClassName}>
                {copy.secondary}
              </Link>
              {kind === "error" && reset ? (
                <button
                  type="button"
                  onClick={() => reset()}
                  className={secondaryLinkClassName}
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {copy.retry}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </MotionProvider>
      <Footer />
    </main>
  )
}

function StatusIcon({ kind, subject }: { kind: RouteStatusKind; subject: RouteStatusSubject }) {
  if (kind === "error") {
    return <AlertTriangle className="h-9 w-9 text-primary" />
  }

  switch (subject) {
    case "match":
      return <Swords className="h-9 w-9 text-primary" />
    case "news":
      return <Newspaper className="h-9 w-9 text-primary" />
    case "tournament":
      return <Trophy className="h-9 w-9 text-primary" />
    default:
      return <SearchX className="h-9 w-9 text-primary" />
  }
}

function getCopy(lang: "uk" | "en", kind: RouteStatusKind, subject: RouteStatusSubject) {
  const isUk = lang === "uk"
  const fallback = {
    secondaryHref: "/tournament",
    secondary: isUk ? "Активний турнір" : "Active tournament",
  }

  const subjectCopy = {
    page: {
      eyebrow: isUk ? "Сторінка недоступна" : "Page unavailable",
      notFoundTitle: isUk ? "Сторінку не знайдено" : "Page not found",
      notFoundBody: isUk
        ? "Можливо, посилання змінилося або сторінку було видалено. Перейди на головну або відкрий активний турнір."
        : "The link may have changed or the page may have been removed. Go home or open the active tournament.",
      errorTitle: isUk ? "Сторінка тимчасово недоступна" : "Page temporarily unavailable",
      errorBody: isUk
        ? "Не вдалося завантажити цю сторінку. Спробуй ще раз або повернись на головну."
        : "We could not load this page. Try again or return home.",
      ...fallback,
    },
    match: {
      eyebrow: isUk ? "Матч недоступний" : "Match unavailable",
      notFoundTitle: isUk ? "Матч не знайдено" : "Match not found",
      notFoundBody: isUk
        ? "Цей матч міг бути видалений, перенесений або ще не опублікований. Перевір список матчів."
        : "This match may have been removed, moved, or not published yet. Check the match list.",
      errorTitle: isUk ? "Матч не завантажився" : "Match failed to load",
      errorBody: isUk
        ? "Виникла помилка під час завантаження деталей матчу. Спробуй оновити сторінку."
        : "Something went wrong while loading match details. Try refreshing the page.",
      secondaryHref: "/matches",
      secondary: isUk ? "До матчів" : "View matches",
    },
    news: {
      eyebrow: isUk ? "Новина недоступна" : "Article unavailable",
      notFoundTitle: isUk ? "Новину не знайдено" : "Article not found",
      notFoundBody: isUk
        ? "Цю новину могли зняти з публікації або змінити її посилання. Перевір сторінку новин."
        : "This article may have been unpublished or its link may have changed. Check the news page.",
      errorTitle: isUk ? "Новина не завантажилась" : "Article failed to load",
      errorBody: isUk
        ? "Виникла помилка під час завантаження новини. Спробуй ще раз або повернись до списку новин."
        : "Something went wrong while loading the article. Try again or return to the news list.",
      secondaryHref: "/news",
      secondary: isUk ? "До новин" : "View news",
    },
    tournament: {
      eyebrow: isUk ? "Турнір недоступний" : "Tournament unavailable",
      notFoundTitle: isUk ? "Турнір не знайдено" : "Tournament not found",
      notFoundBody: isUk
        ? "Турнір міг бути видалений, ще не опублікований або його посилання змінилося. Перевір архів турнірів."
        : "The tournament may have been removed, not published yet, or its link may have changed. Check the tournament archive.",
      errorTitle: isUk ? "Турнір не завантажився" : "Tournament failed to load",
      errorBody: isUk
        ? "Виникла помилка під час завантаження турніру. Спробуй ще раз або відкрий архів."
        : "Something went wrong while loading the tournament. Try again or open the archive.",
      secondaryHref: "/tournaments",
      secondary: isUk ? "До архіву" : "View archive",
    },
  }[subject]

  return {
    eyebrow: subjectCopy.eyebrow,
    title: kind === "not-found" ? subjectCopy.notFoundTitle : subjectCopy.errorTitle,
    body: kind === "not-found" ? subjectCopy.notFoundBody : subjectCopy.errorBody,
    home: isUk ? "На головну" : "Go home",
    retry: isUk ? "Спробувати ще раз" : "Try again",
    secondaryHref: subjectCopy.secondaryHref,
    secondary: subjectCopy.secondary,
  }
}
