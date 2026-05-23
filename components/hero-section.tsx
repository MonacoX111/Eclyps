"use client"

import { m } from "framer-motion"
import Image from "next/image"
import { InstagramCta } from "@/components/instagram-cta"
import { useLanguage } from "@/components/language-provider"

type HeroSectionProps = {
  tournamentName?: string
  tournamentDate?: string
  registrationStatus?: string
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
        className="relative z-10 mb-8 max-w-full break-words text-center text-lg font-medium tracking-widest uppercase text-primary md:text-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        {tournamentName}
      </m.p>

      {/* Date & Status */}
      <m.div
        className="relative z-10 mb-8 flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm text-muted-foreground md:text-base"
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

      {/* CTA Button */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        <InstagramCta />
      </m.div>

      {/* Scroll indicator */}
      <m.div
        className="absolute bottom-8 z-10 flex flex-col items-center gap-2 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-xs tracking-widest uppercase">{t.hero.scroll}</span>
        <m.div
          className="h-8 w-px bg-primary/40"
          animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </m.div>
    </section>
  )
}
