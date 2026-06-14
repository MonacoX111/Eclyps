"use client"

import { Home, Loader2, Newspaper, Swords, Trophy } from "lucide-react"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { useLanguage } from "@/components/language-provider"

type RouteLoadingSubject = "page" | "match" | "news" | "tournament"

type RouteLoadingPageProps = {
  subject: RouteLoadingSubject
}

export function RouteLoadingPage({ subject }: RouteLoadingPageProps) {
  const { lang } = useLanguage()
  const copy = getLoadingCopy(lang, subject)
  const Icon = getLoadingIcon(subject)

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20" aria-busy="true">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Navbar />

        <section className="relative z-10 px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="glass-card overflow-hidden rounded-3xl border border-primary/15 p-6 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_42px_oklch(0.78_0.18_165_/_0.14)]">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {copy.eyebrow}
                  </div>
                  <h1 className="mt-3 text-3xl font-black text-foreground md:text-5xl">
                    {copy.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
                    {copy.body}
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
                <div className="space-y-3">
                  <SkeletonLine className="h-5 w-2/3" />
                  <SkeletonLine className="h-4 w-full" />
                  <SkeletonLine className="h-4 w-5/6" />
                  <SkeletonLine className="h-4 w-3/4" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <SkeletonLine className="h-4 w-1/2" />
                  <SkeletonLine className="mt-4 h-8 w-full" />
                  <SkeletonLine className="mt-3 h-8 w-3/4" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </MotionProvider>
      <Footer />
    </main>
  )
}

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-gradient-to-r from-white/[0.08] via-white/[0.14] to-white/[0.08] ${className}`}
    />
  )
}

function getLoadingIcon(subject: RouteLoadingSubject) {
  switch (subject) {
    case "page":
      return Home
    case "match":
      return Swords
    case "news":
      return Newspaper
    case "tournament":
      return Trophy
  }
}

function getLoadingCopy(lang: "uk" | "en", subject: RouteLoadingSubject) {
  const isUk = lang === "uk"

  switch (subject) {
    case "page":
      return {
        eyebrow: isUk ? "Завантаження Eclyps" : "Loading Eclyps",
        title: isUk ? "Готуємо сторінку" : "Preparing the page",
        body: isUk
          ? "Підтягуємо актуальні турніри, матчі, команди та інтерфейс платформи."
          : "Loading current tournaments, matches, teams, and the platform interface.",
      }
    case "match":
      return {
        eyebrow: isUk ? "Завантаження матчу" : "Loading match",
        title: isUk ? "Готуємо match room" : "Preparing the match room",
        body: isUk
          ? "Підтягуємо статус, учасників, розклад і dispute-інформацію. Це займе мить."
          : "Loading status, competitors, schedule, and dispute information. This will only take a moment.",
      }
    case "news":
      return {
        eyebrow: isUk ? "Завантаження новини" : "Loading article",
        title: isUk ? "Відкриваємо публікацію" : "Opening the article",
        body: isUk
          ? "Підтягуємо заголовок, контент, cover image і metadata публікації."
          : "Loading the title, content, cover image, and article metadata.",
      }
    case "tournament":
      return {
        eyebrow: isUk ? "Завантаження турніру" : "Loading tournament",
        title: isUk ? "Збираємо архів турніру" : "Assembling the tournament archive",
        body: isUk
          ? "Підтягуємо результати, учасників, матчі та фінальну сітку турніру."
          : "Loading results, participants, matches, and the final bracket.",
      }
  }
}
