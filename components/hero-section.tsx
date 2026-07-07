"use client"

import { m } from "framer-motion"
import { UserPlus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { InstagramCta } from "@/components/instagram-cta"
import { useLanguage } from "@/components/language-provider"
import type { TranslationSchema } from "@/lib/i18n/translations"

export type HeroFeaturedMatchParticipant = {
  name: string
  imageUrl: string | null
  kind: "team" | "player"
}

export type HeroFeaturedMatch = {
  href: string
  round: string
  time: string
  status: "upcoming" | "live" | "finished"
  participantA: HeroFeaturedMatchParticipant
  participantB: HeroFeaturedMatchParticipant
}

type HeroSectionProps = {
  tournamentName?: string
  tournamentDate?: string
  registrationStatus?: string
  bannerUrl?: string | null
  nextMatch?: HeroFeaturedMatch | null
}

const statusTranslations: Record<string, { uk: string; en: string }> = {
  "Registration Open": { uk: "Реєстрація відкрита", en: "Registration Open" },
  "Check In Open": { uk: "Чек-ін відкритий", en: "Check-in Open" },
  "Ongoing": { uk: "Турнір триває", en: "Ongoing" },
  "Finished": { uk: "Завершено", en: "Finished" },
  "Registration Closed": { uk: "Реєстрацію закрито", en: "Registration Closed" },
}

export function HeroSection({
  tournamentName = "Summer Private Cup",
  tournamentDate = "June 21, 2026",
  registrationStatus = "Registration Open",
  bannerUrl = null,
  nextMatch = null,
}: HeroSectionProps) {
  const { lang, t } = useLanguage()

  // Translate status if possible
  const translatedStatus = registrationStatus
    ? statusTranslations[registrationStatus]?.[lang] || registrationStatus
    : ""

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-3 py-14 sm:px-4 sm:py-20">
      {bannerUrl ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: `url("${bannerUrl}")` }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,12,0.68),rgba(5,8,12,0.9)_55%,rgba(5,8,12,0.96))]" />
        </div>
      ) : null}

      {/* Radial background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 40%, oklch(0.78 0.18 165 / 0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Logo with glow */}
      <m.div
        className="animate-float relative z-10 mb-5 sm:mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Outer glow ring — pulsing via cheap opacity animation */}
        <div
          className="animate-pulse-glow logo-glow-outer absolute -inset-12 rounded-full opacity-40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="animate-pulse-glow logo-glow-inner absolute -inset-6 rounded-full opacity-60 blur-xl"
          aria-hidden="true"
        />
        <Image
          src="/images/logo.png"
          alt="Eclyps logo"
          width={320}
          height={320}
          priority
          sizes="(min-width: 1024px) 320px, (min-width: 768px) 288px, (min-width: 640px) 192px, 144px"
          className="relative z-10 h-36 w-36 object-contain sm:h-48 sm:w-48 md:h-72 md:w-72 lg:h-80 lg:w-80"
          style={{
            filter: "drop-shadow(0 0 24px oklch(0.78 0.18 165 / 0.4)) drop-shadow(0 0 56px oklch(0.78 0.18 165 / 0.15))",
          }}
        />
      </m.div>

      {/* Title */}
      <m.h1
        className="glow-text relative z-10 mb-5 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:mb-8 md:text-6xl lg:text-7xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <span className="text-balance">Eclyps Hub</span>
      </m.h1>

      {/* Event label */}
      <m.p
        className="relative z-10 mb-4 text-center text-xs font-semibold tracking-widest uppercase text-primary/80 sm:text-sm md:mb-8 md:text-base"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55 }}
      >
        {t.hero.nextEvent}
      </m.p>

      {/* Subtitle */}
      <m.p
        className="relative z-10 mb-4 max-w-full break-words text-center text-base font-medium tracking-widest uppercase text-primary sm:text-lg md:mb-8 md:text-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        {tournamentName}
      </m.p>

      {/* Date & Status */}
      <m.div
        className="relative z-10 mb-5 flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-xs text-muted-foreground sm:text-sm md:mb-8 md:text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <span className="max-w-full break-words font-mono">{tournamentDate}</span>
        {translatedStatus && (
          <span className="flex max-w-full items-center gap-1.5 break-words">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            {translatedStatus}
          </span>
        )}
      </m.div>

      {nextMatch ? (
        <m.div
          className="relative z-10 mb-6 w-full max-w-3xl sm:mb-8 sm:px-1"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.9 }}
        >
          <Link
            href={nextMatch.href}
            className="group block overflow-hidden rounded-2xl border border-primary/15 bg-black/30 px-3 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl transition duration-300 hover:border-primary/45 hover:bg-black/40 sm:px-6 sm:py-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:mb-4 sm:gap-x-4 sm:text-[10px] sm:tracking-[0.22em]">
              <span className="text-primary/80">{t.matchPage.nextMatch}</span>
              <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
              <span>{nextMatch.round}</span>
              <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
              <span>{nextMatch.time}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] sm:gap-5">
              <HeroMatchParticipantCard participant={nextMatch.participantA} />

              <div className="flex flex-col items-center justify-center gap-2">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-black text-primary shadow-[0_0_28px_rgba(52,211,153,0.16)] transition duration-300 group-hover:scale-105 group-hover:border-primary/45 sm:h-16 sm:w-16 sm:text-base">
                  {t.schedule.vs}
                </span>
                <span className="max-w-16 truncate rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white/45 sm:max-w-none sm:text-[9px] sm:tracking-[0.18em]">
                  {formatHeroMatchStatus(nextMatch.status, t)}
                </span>
              </div>

              <HeroMatchParticipantCard participant={nextMatch.participantB} />
            </div>
          </Link>
        </m.div>
      ) : null}

      {/* CTA Button */}
      <m.div
        className="relative z-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        <InstagramCta className="px-6 py-3 text-sm sm:px-8 sm:py-4 sm:text-base" />
        <Link
          href="/registration"
          className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-lg border border-primary/35 bg-black/35 px-6 py-3 text-sm font-semibold text-primary transition-all duration-300 hover:border-primary/70 hover:bg-primary/10 hover:text-primary-foreground sm:px-8 sm:py-4 sm:text-base"
        >
          <UserPlus className="h-5 w-5" aria-hidden="true" />
          {lang === "uk" ? "Зареєструватися" : "Register now"}
        </Link>
      </m.div>

    </section>
  )
}

function HeroMatchParticipantCard({
  participant,
}: {
  participant: HeroFeaturedMatchParticipant
}) {
  const { t } = useLanguage()

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:gap-3">
      <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-20 sm:w-20">
        {participant.imageUrl ? (
          <Image
            src={participant.imageUrl}
            alt={`${participant.name} ${participant.kind === "team" ? "logo" : "avatar"}`}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <span className="text-lg font-black uppercase text-primary sm:text-2xl">
            {getParticipantInitials(participant.name)}
          </span>
        )}
      </div>
      <div className="min-w-0 max-w-full">
        <p className="max-w-[7rem] truncate text-xs font-black uppercase text-white sm:max-w-[11rem] sm:text-base">
          {participant.name}
        </p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35 sm:text-[10px] sm:tracking-[0.2em]">
          {participant.kind === "team" ? t.profile.meta.team : t.profile.meta.player}
        </p>
      </div>
    </div>
  )
}

function getParticipantInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return "?"

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
}

function formatHeroMatchStatus(status: HeroFeaturedMatch["status"], t: TranslationSchema) {
  return status === "finished" ? t.schedule.finished : status === "live" ? t.schedule.live : t.schedule.upcoming
}
