"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { m } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ParticleField } from "@/components/particle-field"
import { RoleOnboarding } from "@/components/role-onboarding"
import {
  clearDiscordAuthInProgress,
  consumeDiscordAuthInProgress,
} from "@/lib/auth/discord-auth-client"

type GuideStage = "intro" | "guide"

type FirstVisitGuideProps = {
  autoOpen?: boolean
}

export const FIRST_VISIT_GUIDE_OPEN_EVENT = "eclyps:open-first-visit-guide"

const STORAGE_KEY = "eclyps:first-visit-guide-dismissed"

function shouldSuppressAutoOpen() {
  if (typeof window === "undefined") return false

  const url = new URL(window.location.href)
  const hasAuthSignal = ["code", "error", "error_description", "registrationError"].some((param) =>
    url.searchParams.has(param),
  )
  const isAuthRoute = url.pathname.startsWith("/auth")

  return isAuthRoute || hasAuthSignal || consumeDiscordAuthInProgress()
}

export function FirstVisitGuide({ autoOpen = false }: FirstVisitGuideProps) {
  const { lang, setLanguage, t } = useLanguage()
  const [isVisible, setIsVisible] = useState(false)
  const [stage, setStage] = useState<GuideStage>("intro")
  const [neverShowAgain, setNeverShowAgain] = useState(false)

  useEffect(() => {
    let shouldHide = false

    try {
      shouldHide = window.localStorage.getItem(STORAGE_KEY) === "true"
      setNeverShowAgain(shouldHide)
    } catch {
      shouldHide = false
    }

    setStage("intro")

    if (!autoOpen) {
      clearDiscordAuthInProgress()
      setIsVisible(false)
      return
    }

    if (shouldHide || shouldSuppressAutoOpen()) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)
  }, [autoOpen])

  useEffect(() => {
    const openGuide = () => {
      try {
        setNeverShowAgain(window.localStorage.getItem(STORAGE_KEY) === "true")
      } catch {
        setNeverShowAgain(false)
      }

      setStage("intro")
      setIsVisible(true)
    }

    window.addEventListener(FIRST_VISIT_GUIDE_OPEN_EVENT, openGuide)
    return () => window.removeEventListener(FIRST_VISIT_GUIDE_OPEN_EVENT, openGuide)
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [isVisible])

  const rememberPreference = () => {
    try {
      if (neverShowAgain) {
        window.localStorage.setItem(STORAGE_KEY, "true")
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Non-critical: the guide can still close for this session.
    }
  }

  const closeGuide = () => {
    rememberPreference()
    setIsVisible(false)
    setStage("intro")
  }

  const startGuide = () => {
    setStage("guide")
  }

  if (!isVisible) return null

  return (
    <section
      aria-labelledby="first-visit-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] overflow-y-auto text-foreground"
      role="dialog"
      style={{
        background:
          "radial-gradient(circle at 50% -10%, oklch(0.78 0.18 165 / 0.16), transparent 34rem), radial-gradient(circle at 0% 100%, oklch(0.62 0.16 205 / 0.10), transparent 30rem), radial-gradient(circle at 100% 100%, oklch(0.78 0.18 165 / 0.08), transparent 32rem), linear-gradient(180deg, oklch(0.055 0.012 190) 0%, oklch(0.04 0.01 190) 54%, oklch(0.025 0.008 190) 100%)",
      }}
    >
      <ParticleField />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_0%,transparent_72%,oklch(0.025_0.008_190/0.92)_100%)]" />

      <div className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {stage === "intro" ? (
          <IntroScreen
            lang={lang}
            onStart={startGuide}
            setLanguage={setLanguage}
            title={t.firstVisitGuide.intro.title}
            eyebrow={t.firstVisitGuide.intro.eyebrow}
            description={t.firstVisitGuide.intro.description}
            startCta={t.firstVisitGuide.intro.startCta}
          />
        ) : (
          <GuideScreen
            closeLabel={t.firstVisitGuide.secondaryCta}
            dismissLabel={t.firstVisitGuide.dismiss}
            eyebrow={t.firstVisitGuide.eyebrow}
            lang={lang}
            neverShowAgain={neverShowAgain}
            onClose={closeGuide}
            setLanguage={setLanguage}
            setNeverShowAgain={setNeverShowAgain}
          />
        )}
      </div>
    </section>
  )
}

function GuideScreen({
  closeLabel,
  dismissLabel,
  eyebrow,
  lang,
  neverShowAgain,
  onClose,
  setLanguage,
  setNeverShowAgain,
}: {
  closeLabel: string
  dismissLabel: string
  eyebrow: string
  lang: "uk" | "en"
  neverShowAgain: boolean
  onClose: () => void
  setLanguage: (lang: "uk" | "en") => void
  setNeverShowAgain: (value: boolean) => void
}) {
  return (
    <>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
        <div className="justify-self-start">
          <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary sm:px-4 sm:text-[11px]">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">{eyebrow}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 justify-self-center">
          <Image
            src="/images/logo.png"
            alt="Eclyps logo"
            width={92}
            height={92}
            priority
            sizes="92px"
            className="h-16 w-16 object-contain drop-shadow-[0_0_28px_oklch(0.78_0.18_165_/_0.42)] sm:h-20 sm:w-20"
          />
          <LanguageToggle lang={lang} setLanguage={setLanguage} />
        </div>

        <label className="inline-flex min-w-0 cursor-pointer items-center gap-2 justify-self-end rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/68 transition hover:border-primary/35 hover:text-primary sm:px-4 sm:text-sm">
          <input
            type="checkbox"
            checked={neverShowAgain}
            onChange={(event) => setNeverShowAgain(event.target.checked)}
            className="h-4 w-4 shrink-0 accent-primary"
          />
          <span className="hidden sm:inline">{dismissLabel}</span>
        </label>
      </header>

      <m.div
        className="flex-1 py-3 sm:py-4"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <RoleOnboarding embedded onNavigate={onClose} />

        <div className="mt-1 flex justify-center pb-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-primary/25 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/15"
          >
            {closeLabel}
          </button>
        </div>
      </m.div>
    </>
  )
}

function IntroScreen({
  lang,
  setLanguage,
  eyebrow,
  title,
  description,
  startCta,
  onStart,
}: {
  lang: "uk" | "en"
  setLanguage: (lang: "uk" | "en") => void
  eyebrow: string
  title: string
  description: string
  startCta: string
  onStart: () => void
}) {
  return (
    <div className="grid flex-1 place-items-center py-8 sm:py-10">
      <m.div
        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-primary/25 bg-[oklch(0.07_0.014_190/0.88)] px-6 py-8 text-center shadow-[0_0_120px_oklch(0.78_0.18_165_/_0.14)] backdrop-blur-2xl sm:px-10 sm:py-11"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.48, ease: "easeOut" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165/0.18),transparent_22rem)]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex justify-end">
          <LanguageToggle lang={lang} setLanguage={setLanguage} />
        </div>

        <Image
          src="/images/logo.png"
          alt="Eclyps logo"
          width={132}
          height={132}
          priority
          sizes="132px"
          className="relative mx-auto mt-1 h-28 w-28 object-contain drop-shadow-[0_0_34px_oklch(0.78_0.18_165_/_0.48)] sm:h-32 sm:w-32"
        />

        <div className="relative mt-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
          <Sparkles className="h-4 w-4" />
          {eyebrow}
        </div>

        <h1
          id="first-visit-title"
          className="relative mx-auto mt-4 max-w-xl text-balance bg-gradient-to-b from-white via-white to-primary/82 bg-clip-text text-4xl font-semibold leading-[0.96] tracking-[-0.065em] text-transparent drop-shadow-[0_0_24px_oklch(0.78_0.18_165_/_0.16)] sm:text-5xl md:text-6xl"
          style={{ fontFamily: '"SF Pro Display", "Inter", "Manrope", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        >
          {title}
        </h1>
        <p className="relative mx-auto mt-5 max-w-lg text-pretty text-sm leading-6 text-white/66 sm:text-base sm:leading-7">
          {description}
        </p>

        <button
          type="button"
          onClick={onStart}
          className="relative mt-8 inline-flex min-w-48 items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black shadow-[0_0_34px_oklch(0.78_0.18_165_/_0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_0_48px_oklch(0.78_0.18_165_/_0.40)] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 focus:ring-offset-black"
        >
          {startCta}
          <ArrowRight className="h-4 w-4" />
        </button>
      </m.div>
    </div>
  )
}

function LanguageToggle({
  lang,
  setLanguage,
}: {
  lang: "uk" | "en"
  setLanguage: (lang: "uk" | "en") => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-black/35 p-0.5">
      <button
        type="button"
        onClick={() => setLanguage("uk")}
        className={`rounded-full px-2 py-1 text-[10px] font-bold transition-all duration-200 ${
          lang === "uk"
            ? "bg-primary text-black shadow-[0_0_12px_oklch(0.78_0.18_165_/_0.35)]"
            : "text-white/60 hover:text-white"
        }`}
      >
        UK
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-full px-2 py-1 text-[10px] font-bold transition-all duration-200 ${
          lang === "en"
            ? "bg-primary text-black shadow-[0_0_12px_oklch(0.78_0.18_165_/_0.35)]"
            : "text-white/60 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  )
}
