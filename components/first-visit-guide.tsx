"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { m } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Gamepad2,
  LogIn,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type GuidePathId = "watch" | "compete" | "captain"

type GuidePath = {
  id: GuidePathId
  icon: typeof Eye
  title: string
  body: string
  href: string
  cta: string
  steps: readonly string[]
}

type FirstVisitGuideProps = {
  autoOpen?: boolean
}

export const FIRST_VISIT_GUIDE_OPEN_EVENT = "eclyps:open-first-visit-guide"

const STORAGE_KEY = "eclyps:first-visit-guide-dismissed"

export function FirstVisitGuide({ autoOpen = false }: FirstVisitGuideProps) {
  const { lang, setLanguage, t } = useLanguage()
  const [isVisible, setIsVisible] = useState(false)
  const [neverShowAgain, setNeverShowAgain] = useState(false)

  useEffect(() => {
    let shouldHide = false

    try {
      shouldHide = window.localStorage.getItem(STORAGE_KEY) === "true"
      setNeverShowAgain(shouldHide)
    } catch {
      shouldHide = false
    }

    setIsVisible(autoOpen && !shouldHide)
  }, [autoOpen])

  useEffect(() => {
    const openGuide = () => {
      try {
        setNeverShowAgain(window.localStorage.getItem(STORAGE_KEY) === "true")
      } catch {
        setNeverShowAgain(false)
      }

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
  }

  const choosePath = () => {
    rememberPreference()
  }

  if (!isVisible) return null

  const paths: GuidePath[] = [
    {
      id: "watch",
      icon: Eye,
      title: t.firstVisitGuide.paths.watch.title,
      body: t.firstVisitGuide.paths.watch.body,
      href: "/tournament",
      cta: t.firstVisitGuide.paths.watch.cta,
      steps: t.firstVisitGuide.paths.watch.steps,
    },
    {
      id: "compete",
      icon: Gamepad2,
      title: t.firstVisitGuide.paths.compete.title,
      body: t.firstVisitGuide.paths.compete.body,
      href: "/registration#registration",
      cta: t.firstVisitGuide.paths.compete.cta,
      steps: t.firstVisitGuide.paths.compete.steps,
    },
    {
      id: "captain",
      icon: Users,
      title: t.firstVisitGuide.paths.captain.title,
      body: t.firstVisitGuide.paths.captain.body,
      href: "/registration#registration",
      cta: t.firstVisitGuide.paths.captain.cta,
      steps: t.firstVisitGuide.paths.captain.steps,
    },
  ]

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
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_72%,oklch(0.025_0.008_190/0.92)_100%)]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
          <div className="justify-self-start">
            <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary sm:px-4 sm:text-[11px]">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.firstVisitGuide.eyebrow}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 justify-self-center">
            <div className="rounded-2xl border border-primary/20 bg-black/30 p-2 shadow-[0_0_36px_oklch(0.78_0.18_165_/_0.12)]">
              <Image
                src="/images/logo.png"
                alt="Eclyps logo"
                width={52}
                height={52}
                priority
                sizes="52px"
                className="h-10 w-10 object-contain sm:h-12 sm:w-12"
              />
            </div>
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
          </div>

          <label className="inline-flex min-w-0 cursor-pointer items-center gap-2 justify-self-end rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/68 transition hover:border-primary/35 hover:text-primary sm:px-4 sm:text-sm">
            <input
              type="checkbox"
              checked={neverShowAgain}
              onChange={(event) => setNeverShowAgain(event.target.checked)}
              className="h-4 w-4 shrink-0 accent-primary"
            />
            <span className="hidden sm:inline">{t.firstVisitGuide.dismiss}</span>
          </label>
        </header>

        <div className="grid flex-1 place-items-center py-5 sm:py-6">
          <m.div
            className="w-full overflow-hidden rounded-[1.75rem] border border-primary/22 bg-[oklch(0.075_0.014_190/0.90)] shadow-[0_0_90px_oklch(0.78_0.18_165_/_0.10)] backdrop-blur-xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="border-b border-white/10 px-5 py-6 sm:px-7 lg:px-9">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div className="min-w-0">
                  <h1
                    id="first-visit-title"
                    className="max-w-3xl text-balance text-3xl font-black leading-[1.02] tracking-[-0.045em] text-foreground sm:text-4xl md:text-5xl"
                  >
                    {t.firstVisitGuide.title}
                  </h1>
                  <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
                    {t.firstVisitGuide.description}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <Signal icon={LogIn} label={t.firstVisitGuide.signals.discord} />
                  <Signal icon={Trophy} label={t.firstVisitGuide.signals.schedule} />
                  <Signal icon={ShieldCheck} label={t.firstVisitGuide.signals.progress} />
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary/75">
                    {t.firstVisitGuide.choiceEyebrow}
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">
                    {t.firstVisitGuide.choiceTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeGuide}
                  className="w-fit rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/15"
                >
                  {t.firstVisitGuide.secondaryCta}
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {paths.map((path, index) => (
                  <GuidePathCard key={path.id} path={path} index={index} onChoose={choosePath} />
                ))}
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}

function Signal({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-pretty text-xs font-medium leading-5 text-white/68">{label}</p>
    </div>
  )
}

function GuidePathCard({
  path,
  index,
  onChoose,
}: {
  path: GuidePath
  index: number
  onChoose: () => void
}) {
  const Icon = path.icon

  return (
    <m.article
      className="group flex min-w-0 flex-col rounded-3xl border border-white/10 bg-black/26 p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.04]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.04 }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
          0{index + 1}
        </span>
      </div>

      <h3 className="mt-5 text-pretty text-xl font-bold leading-tight tracking-[-0.025em] text-foreground sm:text-2xl lg:text-xl xl:text-2xl">
        {path.title}
      </h3>
      <p className="mt-3 text-pretty text-sm leading-6 text-white/60">{path.body}</p>

      <ul className="mt-5 space-y-3">
        {path.steps.map((step) => (
          <li key={step} className="flex min-w-0 gap-3 text-sm leading-5 text-white/68">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-pretty">{step}</span>
          </li>
        ))}
      </ul>

      <a
        href={path.href}
        onClick={onChoose}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition group-hover:border-primary/60 group-hover:bg-primary/15"
      >
        {path.cta}
        <ArrowRight className="h-4 w-4" />
      </a>
    </m.article>
  )
}
