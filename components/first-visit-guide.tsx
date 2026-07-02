"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { m } from "framer-motion"
import { ArrowLeft, ArrowRight, Check, Eye, Sparkles } from "lucide-react"
import { loginWithDiscord } from "@/app/auth/actions"
import { useLanguage } from "@/components/language-provider"
import { ParticleField } from "@/components/particle-field"
import { RoleOnboarding } from "@/components/role-onboarding"
import {
  clearDiscordAuthInProgress,
  consumeDiscordAuthInProgress,
  markDiscordAuthInProgress,
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
          "radial-gradient(circle at 50% -10%, oklch(0.78 0.18 165 / 0.16), transparent 34rem), radial-gradient(circle at 0% 100%, oklch(0.62 0.16 205 / 0.10), transparent 30rem), radial-gradient(circle at 100% 100%, oklch(0.78 0.18 165 / 0.08), transparent 32rem), linear-gradient(180deg, oklch(0.055 0.012 190) 0%, oklch(0.045 0.011 190) 40%, oklch(0.035 0.009 190) 70%, oklch(0.025 0.008 190) 100%)",
      }}
    >
      <ParticleField />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_0%,oklch(0.025_0.008_190/0.04)_30%,oklch(0.025_0.008_190/0.22)_55%,oklch(0.025_0.008_190/0.55)_78%,oklch(0.025_0.008_190/0.85)_100%)]" />

      <div className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {stage === "intro" ? (
          <IntroScreen
            lang={lang}
            onStart={startGuide}
            onClose={closeGuide}
            setLanguage={setLanguage}
            neverShowAgain={neverShowAgain}
            setNeverShowAgain={setNeverShowAgain}
            dismissLabel={t.firstVisitGuide.dismiss}
          />
        ) : (
          <GuideScreen
            backLabel={t.firstVisitGuide.backCta}
            closeLabel={t.firstVisitGuide.secondaryCta}
            dismissLabel={t.firstVisitGuide.dismiss}
            eyebrow={t.firstVisitGuide.eyebrow}
            lang={lang}
            neverShowAgain={neverShowAgain}
            onBack={() => setStage("intro")}
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
  backLabel,
  closeLabel,
  dismissLabel,
  eyebrow,
  lang,
  neverShowAgain,
  onBack,
  onClose,
  setLanguage,
  setNeverShowAgain,
}: {
  backLabel: string
  closeLabel: string
  dismissLabel: string
  eyebrow: string
  lang: "uk" | "en"
  neverShowAgain: boolean
  onBack: () => void
  onClose: () => void
  setLanguage: (lang: "uk" | "en") => void
  setNeverShowAgain: (value: boolean) => void
}) {
  return (
    <>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:px-4 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
          <div className="hidden min-w-0 items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary md:inline-flex lg:px-4 lg:text-[11px]">
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

        <FancyCheckbox
          checked={neverShowAgain}
          onChange={setNeverShowAgain}
          label={dismissLabel}
          className="justify-self-end rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 sm:px-4"
          labelClassName="hidden sm:inline"
        />
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
  onStart,
  onClose,
  neverShowAgain,
  setNeverShowAgain,
  dismissLabel,
}: {
  lang: "uk" | "en"
  setLanguage: (lang: "uk" | "en") => void
  onStart: () => void
  onClose: () => void
  neverShowAgain: boolean
  setNeverShowAgain: (value: boolean) => void
  dismissLabel: string
}) {
  const { t } = useLanguage()
  const intro = t.firstVisitGuide.intro
  const [activeStep, setActiveStep] = useState(0)

  return (
    <div className="grid flex-1 place-items-center py-6 sm:py-8">
      <m.div
        className="relative grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[oklch(0.045_0.01_190/0.94)] shadow-[0_0_0_1px_oklch(0.78_0.18_165/0.05),0_28px_90px_-24px_oklch(0_0_0/0.85),0_0_120px_oklch(0.78_0.18_165_/_0.10)] backdrop-blur-2xl lg:grid-cols-[1.05fr_1fr]"
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Left panel — gradient showcase with steps */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 lg:flex lg:p-10"
          style={{
            background:
              "radial-gradient(circle at 78% 18%, oklch(0.62 0.14 170 / 0.55), transparent 26rem), radial-gradient(circle at 12% 88%, oklch(0.30 0.08 180 / 0.85), transparent 24rem), linear-gradient(148deg, oklch(0.36 0.10 172) 0%, oklch(0.22 0.06 178) 52%, oklch(0.12 0.03 185) 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(0_0_0/0.35),transparent_28rem)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-white/85">
            <Sparkles className="h-3.5 w-3.5" />
            {intro.eyebrow}
          </div>

          <div className="relative mt-auto pt-16">
            <h2
              className="max-w-md text-balance text-4xl font-medium leading-[1.08] tracking-[-0.02em] text-white drop-shadow-[0_2px_24px_oklch(0_0_0/0.35)] xl:text-[2.75rem]"
              style={{ fontFamily: '"Unbounded", "Inter", system-ui, -apple-system, sans-serif' }}
            >
              {intro.leftTitle}
            </h2>
            <p className="mt-4 max-w-sm text-pretty text-sm leading-6 text-white/72">
              {intro.leftDescription}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {intro.steps.map((step, index) => {
                const isActive = index === activeStep

                return (
                  <div
                    key={step.title}
                    onMouseEnter={() => setActiveStep(index)}
                    onMouseLeave={() => setActiveStep(0)}
                    className={`flex cursor-default flex-col gap-3 rounded-2xl p-4 backdrop-blur-md transition-all duration-300 ease-out ${
                      isActive
                        ? "-translate-y-1 border border-white/50 bg-white text-black shadow-[0_20px_50px_-16px_oklch(0_0_0/0.6)]"
                        : "border border-white/14 bg-white/[0.07] text-white hover:border-white/30"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-colors duration-300 ${
                        isActive ? "bg-black text-white" : "bg-white/12 text-white/85"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`text-pretty text-[13px] font-semibold leading-5 transition-colors duration-300 ${
                        isActive ? "text-black" : "text-white/88"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`text-pretty text-[11px] leading-4 transition-colors duration-300 ${
                        isActive ? "text-black/62" : "text-white/55"
                      }`}
                    >
                      {step.body}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right panel — auth actions */}
        <div className="relative flex flex-col px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex items-center justify-between gap-3">
            <Image
              src="/images/logo.png"
              alt="Eclyps logo"
              width={56}
              height={56}
              priority
              sizes="56px"
              className="h-12 w-12 object-contain drop-shadow-[0_0_20px_oklch(0.78_0.18_165_/_0.4)] sm:h-14 sm:w-14"
            />
            <LanguageToggle lang={lang} setLanguage={setLanguage} />
          </div>

          <div className="flex flex-1 flex-col justify-center py-8">
            <h1
              id="first-visit-title"
              className="text-balance text-center text-3xl font-semibold tracking-[-0.01em] text-white sm:text-[2rem]"
              style={{ fontFamily: '"Unbounded", "Inter", system-ui, -apple-system, sans-serif' }}
            >
              {intro.authTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-pretty text-center text-sm leading-6 text-white/60">
              {intro.authDescription}
            </p>

            <div className="mx-auto mt-8 w-full max-w-sm">
              <form action={loginWithDiscord} onSubmit={markDiscordAuthInProgress}>
                <button
                  type="submit"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-black shadow-[0_0_30px_oklch(0.78_0.18_165_/_0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_0_44px_oklch(0.78_0.18_165_/_0.38)] focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 focus:ring-offset-black"
                >
                  <DiscordIcon className="h-5 w-5" />
                  {intro.discordCta}
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/12" />
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
                  {intro.orLabel}
                </span>
                <span className="h-px flex-1 bg-white/12" />
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/14 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-black"
              >
                <Eye className="h-4.5 w-4.5" />
                {intro.guestCta}
              </button>

              <button
                type="button"
                onClick={onStart}
                className="mx-auto mt-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary/80"
              >
                {intro.guideCta}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <FancyCheckbox
            checked={neverShowAgain}
            onChange={setNeverShowAgain}
            label={dismissLabel}
            className="mx-auto"
          />
        </div>
      </m.div>
    </div>
  )
}

function FancyCheckbox({
  checked,
  onChange,
  label,
  className = "",
  labelClassName = "",
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  className?: string
  labelClassName?: string
}) {
  return (
    <label
      className={`group inline-flex min-w-0 cursor-pointer select-none items-center gap-2.5 text-xs font-medium transition-colors sm:text-sm ${
        checked ? "text-primary" : "text-white/50 hover:text-white/80"
      } ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black ${
          checked
            ? "border-primary bg-primary shadow-[0_0_14px_oklch(0.78_0.18_165_/_0.45)]"
            : "border-white/25 bg-white/[0.05] group-hover:border-white/45"
        }`}
      >
        <Check
          className={`h-3.5 w-3.5 text-black transition-all duration-200 ${
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
          strokeWidth={3}
        />
      </span>
      <span className={labelClassName}>{label}</span>
    </label>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
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
