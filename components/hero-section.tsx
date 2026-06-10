"use client"

import { m } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Radio, Swords } from "lucide-react"
import { InstagramCta } from "@/components/instagram-cta"
import { useLanguage } from "@/components/language-provider"
import { withAvatarCacheBust } from "@/lib/avatar"
import type { TranslationSchema } from "@/lib/i18n/translations"

export type HeroMatchParticipant = {
  name: string
  imageUrl: string | null
  kind: "player" | "team"
  score: number | null
}

export type HeroFeaturedMatch = {
  id: string
  label: string
  status: "upcoming" | "live" | "finished"
  participants: [HeroMatchParticipant, HeroMatchParticipant]
}

type HeroSectionProps = {
  tournamentName?: string
  tournamentDate?: string
  registrationStatus?: string
  featuredMatch?: HeroFeaturedMatch | null
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
  featuredMatch = null,
}: HeroSectionProps) {
  const { lang, t } = useLanguage()

  // Translate status if possible
  const translatedStatus = registrationStatus
    ? statusTranslations[registrationStatus]?.[lang] || registrationStatus
    : ""

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20">
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
        className="animate-float relative z-10 mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Outer glow ring */}
        <div
          className="logo-glow-outer absolute -inset-12 rounded-full opacity-40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="logo-glow-inner absolute -inset-6 rounded-full opacity-60 blur-xl"
          aria-hidden="true"
        />
        <Image
          src="/images/logo.png"
          alt="Eclyps logo"
          width={320}
          height={320}
          priority
          sizes="(min-width: 1024px) 320px, (min-width: 768px) 288px, 224px"
          className="animate-pulse-glow relative z-10 h-56 w-56 object-contain md:h-72 md:w-72 lg:h-80 lg:w-80"
        />
      </m.div>

      {/* Title */}
      <m.h1
        className="glow-text relative z-10 mb-8 text-center text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <span className="text-balance">Eclyps Hub</span>
      </m.h1>

      {/* Event label */}
      <m.p
        className="relative z-10 mb-8 text-center text-sm font-semibold tracking-widest uppercase text-primary/80 md:text-base"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55 }}
      >
        {t.hero.nextEvent}
      </m.p>

      {/* Subtitle */}
      <m.p
        className="relative z-10 mb-5 max-w-full break-words text-center text-lg font-medium tracking-widest uppercase text-primary md:mb-6 md:text-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        {tournamentName}
      </m.p>

      {/* Date & Status */}
      <m.div
        className="relative z-10 mb-12 flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm text-muted-foreground md:mb-14 md:text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.68 }}
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

      {featuredMatch ? (
        <m.div
          className="relative z-10 mb-12 w-full max-w-4xl px-1 md:mb-14"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.78 }}
        >
          <FeaturedMatchCard match={featuredMatch} />
        </m.div>
      ) : null}

      {/* CTA Button */}
      <m.div
        className="relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        <InstagramCta />
      </m.div>

    </section>
  )
}

function FeaturedMatchCard({ match }: { match: HeroFeaturedMatch }) {
  const { t } = useLanguage()
  const isLive = match.status === "live"

  return (
    <Link
      href={`/matches/${match.id}`}
      className={[
        "group relative block overflow-hidden rounded-2xl border bg-black/35 px-5 py-6 backdrop-blur-md transition duration-300 md:px-8 md:py-7",
        isLive
          ? "border-primary/45 shadow-[0_0_44px_oklch(0.78_0.18_165_/_0.16)]"
          : "border-primary/20 hover:border-primary/45 hover:bg-black/45",
      ].join(" ")}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165_/_0.10),transparent_42%)] opacity-80" />

      <div className="relative z-10 mb-6 flex items-center justify-center text-center">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.28em] text-primary uppercase">
          {isLive ? <Radio className="h-3.5 w-3.5" /> : <Swords className="h-3.5 w-3.5" />}
          {t.hero.featuredMatch}
        </span>
      </div>

      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-5 md:gap-10">
        <MatchParticipant participant={match.participants[0]} side="left" />

        <div className="flex min-w-[4.5rem] flex-col items-center gap-2 md:min-w-[6rem]">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono text-xs font-bold tracking-[0.28em] text-primary md:text-sm">
            VS
          </span>
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",
              isLive ? "bg-primary/15 text-primary" : "bg-white/5 text-white/55",
            ].join(" ")}
          >
            {formatMatchStatus(match.status, t)}
          </span>
        </div>

        <MatchParticipant participant={match.participants[1]} side="right" />
      </div>

    </Link>
  )
}

function MatchParticipant({
  participant,
  side,
}: {
  participant: HeroMatchParticipant
  side: "left" | "right"
}) {
  return (
    <div
      className={[
        "flex min-w-0 items-center gap-4 md:gap-5",
        side === "right" ? "flex-row-reverse text-right" : "",
      ].join(" ")}
    >
      <MatchParticipantAvatar participant={participant} />
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-foreground md:text-lg" title={participant.name}>
          {participant.name}
        </p>
        <p className="mt-1 font-mono text-xs text-white/45">
          {participant.score === null ? "-" : participant.score}
        </p>
      </div>
    </div>
  )
}

function MatchParticipantAvatar({ participant }: { participant: HeroMatchParticipant }) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = imageFailed ? null : withAvatarCacheBust(participant.imageUrl, null)
  const initials = getParticipantInitials(participant.name)

  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-black/50 font-mono text-sm font-bold text-primary shadow-[inset_0_0_18px_oklch(0.78_0.18_165_/_0.08)] md:h-16 md:w-16 md:text-base">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${participant.name} ${participant.kind === "team" ? "logo" : "avatar"}`}
          className={[
            "h-full w-full",
            participant.kind === "team" ? "object-contain p-2" : "object-cover",
          ].join(" ")}
          loading="eager"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  )
}

function formatMatchStatus(status: HeroFeaturedMatch["status"], t: TranslationSchema) {
  if (status === "live") return t.schedule.live
  if (status === "finished") return t.bracket.finished
  return t.bracket.upcoming
}

function getParticipantInitials(name: string) {
  const normalized = name.trim()
  if (!normalized || normalized.toUpperCase() === "TBD") return "?"

  const parts = normalized.split(/\s+/).filter(Boolean)
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
    : normalized.slice(0, 2)

  return initials.toUpperCase()
}
