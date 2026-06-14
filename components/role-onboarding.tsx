"use client"

import { useState } from "react"
import { m } from "framer-motion"
import {
  BarChart3,
  CheckCircle2,
  Crown,
  Eye,
  Gamepad2,
  GitBranch,
  LogIn,
  Medal,
  ShieldCheck,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { SectionHeading } from "@/components/section-heading"

type RoleId = "spectator" | "player" | "captain"

type GuideStep = {
  title: string
  body: string
  icon: typeof Eye
}

type RoleGuide = {
  id: RoleId
  label: string
  eyebrow: string
  title: string
  summary: string
  icon: typeof Eye
  steps: GuideStep[]
  statusNotes: readonly string[]
  ctas: Array<{ label: string; href: string }>
}

type RoleOnboardingProps = {
  embedded?: boolean
  onNavigate?: () => void
}

export function RoleOnboarding({ embedded = false, onNavigate }: RoleOnboardingProps = {}) {
  const [activeRoleId, setActiveRoleId] = useState<RoleId | null>(null)
  const { t } = useLanguage()
  const roleGuides = getRoleGuides(t)
  const activeGuide = roleGuides.find((guide) => guide.id === activeRoleId)

  return (
    <section
      className={embedded ? "relative z-10 px-0 py-3 sm:py-5" : "relative z-10 px-4 py-20"}
      id={embedded ? undefined : "guide"}
    >
      <div className={embedded ? "mx-auto max-w-5xl" : "mx-auto max-w-6xl"}>
        {embedded ? (
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80 sm:text-xs">
              {t.roleOnboarding.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-black leading-tight text-foreground drop-shadow-[0_0_26px_oklch(0.78_0.18_165_/_0.18)] sm:text-4xl">
              {t.roleOnboarding.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-6 text-white/62 sm:text-base">
              {t.roleOnboarding.description}
            </p>
          </div>
        ) : (
          <SectionHeading eyebrow={t.roleOnboarding.eyebrow} title={t.roleOnboarding.title}>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/58">
              {t.roleOnboarding.description}
            </p>
          </SectionHeading>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {roleGuides.map((guide) => {
            const Icon = guide.icon
            const isActive = activeRoleId === guide.id

            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => setActiveRoleId(guide.id)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                  isActive
                    ? "border-primary/55 bg-primary/[0.12] shadow-[0_0_46px_oklch(0.78_0.18_165_/_0.16)]"
                    : "border-primary/18 bg-black/28 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.05]"
                }`}
                aria-pressed={isActive}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
                <span className="flex items-start gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition ${
                    isActive
                      ? "border-primary/45 bg-primary/20 text-primary"
                      : "border-primary/20 bg-primary/10 text-primary/80"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-primary/72">
                      {guide.eyebrow}
                    </span>
                    <span className="mt-2 block text-lg font-bold text-foreground">
                      {guide.label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-white/58">
                      {guide.title}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {activeGuide ? (
          <RoleRoutePanel guide={activeGuide} onNavigate={onNavigate} />
        ) : (
          <RoleEmptyPanel />
        )}
      </div>
    </section>
  )
}

function RoleEmptyPanel() {
  const { t } = useLanguage()

  return (
    <m.div
      key="role-guide-empty"
      className="mt-5 overflow-hidden rounded-[1.75rem] border border-primary/18 bg-[oklch(0.065_0.012_190/0.68)] shadow-[0_0_52px_oklch(0.78_0.18_165_/_0.08)] backdrop-blur-xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="relative grid min-h-48 place-items-center overflow-hidden p-6 text-center sm:min-h-56 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165/0.10),transparent_24rem)]" />
        <div className="relative mx-auto max-w-xl">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-balance text-2xl font-black text-foreground">
            {t.roleOnboarding.emptyTitle}
          </h3>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-6 text-white/60">
            {t.roleOnboarding.emptyBody}
          </p>
        </div>
      </div>
    </m.div>
  )
}

function RoleRoutePanel({
  guide,
  onNavigate,
}: {
  guide: RoleGuide
  onNavigate?: () => void
}) {
  const { t } = useLanguage()
  const Icon = guide.icon

  return (
    <m.div
      key={guide.id}
      className="mt-5 overflow-hidden rounded-[1.75rem] border border-primary/22 bg-[oklch(0.075_0.014_190/0.78)] shadow-[0_0_64px_oklch(0.78_0.18_165_/_0.10)] backdrop-blur-xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,oklch(0.78_0.18_165/0.12),transparent_24rem)]" />

        <div className="relative min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                {guide.label} {t.roleOnboarding.routeLabel}
              </p>
              <h3 className="mt-1 break-words text-2xl font-black leading-tight text-foreground">
                {guide.title}
              </h3>
            </div>
          </div>

          <p className="mt-4 text-pretty text-sm leading-6 text-white/64">
            {guide.summary}
          </p>

          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/82">
              {t.roleOnboarding.statusCalls}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.statusNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-white/10 bg-black/28 px-3 py-1.5 text-xs leading-5 text-white/72"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="grid gap-3">
            {guide.steps.map((step, index) => {
              const StepIcon = step.icon

              return (
                <div
                  key={`${guide.id}-${step.title}`}
                  className="rounded-2xl border border-white/10 bg-black/24 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                      <StepIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/65">
                        {t.roleOnboarding.step} {index + 1}
                      </p>
                      <h4 className="mt-1 break-words text-sm font-bold text-foreground">
                        {step.title}
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-white/58">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {guide.ctas.map((cta) => (
              <a
                key={`${guide.id}-${cta.href}`}
                href={cta.href}
                onClick={onNavigate}
                className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/16"
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </m.div>
  )
}

function getRoleGuides(t: ReturnType<typeof useLanguage>["t"]): RoleGuide[] {
  return [
    {
      id: "spectator",
      label: t.roleOnboarding.guides.spectator.label,
      eyebrow: t.roleOnboarding.guides.spectator.eyebrow,
      title: t.roleOnboarding.guides.spectator.title,
      summary: t.roleOnboarding.guides.spectator.summary,
      icon: Eye,
      steps: [
        {
          title: t.roleOnboarding.guides.spectator.steps[0].title,
          body: t.roleOnboarding.guides.spectator.steps[0].body,
          icon: Trophy,
        },
        {
          title: t.roleOnboarding.guides.spectator.steps[1].title,
          body: t.roleOnboarding.guides.spectator.steps[1].body,
          icon: GitBranch,
        },
        {
          title: t.roleOnboarding.guides.spectator.steps[2].title,
          body: t.roleOnboarding.guides.spectator.steps[2].body,
          icon: BarChart3,
        },
      ],
      statusNotes: t.roleOnboarding.guides.spectator.statusNotes,
      ctas: [
        { label: t.roleOnboarding.guides.spectator.ctas.tournament, href: "/tournament" },
        { label: t.roleOnboarding.guides.spectator.ctas.bracket, href: "/tournament#bracket" },
        { label: t.roleOnboarding.guides.spectator.ctas.schedule, href: "/matches?tab=upcoming#matches" },
      ],
    },
    {
      id: "player",
      label: t.roleOnboarding.guides.player.label,
      eyebrow: t.roleOnboarding.guides.player.eyebrow,
      title: t.roleOnboarding.guides.player.title,
      summary: t.roleOnboarding.guides.player.summary,
      icon: Gamepad2,
      steps: [
        {
          title: t.roleOnboarding.guides.player.steps[0].title,
          body: t.roleOnboarding.guides.player.steps[0].body,
          icon: LogIn,
        },
        {
          title: t.roleOnboarding.guides.player.steps[1].title,
          body: t.roleOnboarding.guides.player.steps[1].body,
          icon: UserPlus,
        },
        {
          title: t.roleOnboarding.guides.player.steps[2].title,
          body: t.roleOnboarding.guides.player.steps[2].body,
          icon: CheckCircle2,
        },
        {
          title: t.roleOnboarding.guides.player.steps[3].title,
          body: t.roleOnboarding.guides.player.steps[3].body,
          icon: Medal,
        },
      ],
      statusNotes: t.roleOnboarding.guides.player.statusNotes,
      ctas: [
        { label: t.roleOnboarding.guides.player.ctas.registration, href: "/registration" },
        { label: t.roleOnboarding.guides.player.ctas.players, href: "/players" },
        { label: t.roleOnboarding.guides.player.ctas.results, href: "/matches?tab=finished#matches" },
      ],
    },
    {
      id: "captain",
      label: t.roleOnboarding.guides.captain.label,
      eyebrow: t.roleOnboarding.guides.captain.eyebrow,
      title: t.roleOnboarding.guides.captain.title,
      summary: t.roleOnboarding.guides.captain.summary,
      icon: Crown,
      steps: [
        {
          title: t.roleOnboarding.guides.captain.steps[0].title,
          body: t.roleOnboarding.guides.captain.steps[0].body,
          icon: ShieldCheck,
        },
        {
          title: t.roleOnboarding.guides.captain.steps[1].title,
          body: t.roleOnboarding.guides.captain.steps[1].body,
          icon: Users,
        },
        {
          title: t.roleOnboarding.guides.captain.steps[2].title,
          body: t.roleOnboarding.guides.captain.steps[2].body,
          icon: Crown,
        },
        {
          title: t.roleOnboarding.guides.captain.steps[3].title,
          body: t.roleOnboarding.guides.captain.steps[3].body,
          icon: Swords,
        },
      ],
      statusNotes: t.roleOnboarding.guides.captain.statusNotes,
      ctas: [
        { label: t.roleOnboarding.guides.captain.ctas.registration, href: "/registration" },
        { label: t.roleOnboarding.guides.captain.ctas.teams, href: "/teams" },
        { label: t.roleOnboarding.guides.captain.ctas.schedule, href: "/matches?tab=upcoming#matches" },
      ],
    },
  ]
}
