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
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"

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

export function RoleOnboarding() {
  const [activeRoleId, setActiveRoleId] = useState<RoleId | null>(null)
  const { t } = useLanguage()

  const roleGuides: RoleGuide[] = [
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
        { label: t.roleOnboarding.guides.spectator.ctas.bracket, href: "/bracket" },
        { label: t.roleOnboarding.guides.spectator.ctas.schedule, href: "/matches?tab=upcoming" },
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
        { label: t.roleOnboarding.guides.player.ctas.results, href: "/matches?tab=finished" },
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
        { label: t.roleOnboarding.guides.captain.ctas.schedule, href: "/matches?tab=upcoming" },
      ],
    },
  ]

  return (
    <section className="relative z-10 px-4 py-20" id="guide">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={t.roleOnboarding.eyebrow} title={t.roleOnboarding.title}>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/58">
            {t.roleOnboarding.description}
          </p>
        </SectionHeading>

        <div className="grid gap-4 lg:grid-cols-3">
          {roleGuides.map((guide) => (
            <RoleGuideCard
              key={guide.id}
              guide={guide}
              isOpen={activeRoleId === guide.id}
              onToggle={() => {
                setActiveRoleId(activeRoleId === guide.id ? null : guide.id)
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function RoleGuideCard({
  guide,
  isOpen,
  onToggle,
}: {
  guide: RoleGuide
  isOpen: boolean
  onToggle: () => void
}) {
  const Icon = guide.icon
  const { t } = useLanguage()

  return (
    <details
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 bg-[oklch(0.09_0.012_180/0.72)] ${
        isOpen
          ? "border-primary/45 bg-primary/[0.07] shadow-[0_0_52px_oklch(0.78_0.18_165_/_0.12)]"
          : "border-primary/20 shadow-[0_0_52px_oklch(0.78_0.18_165_/_0.07)] hover:-translate-y-1 hover:border-primary/35 hover:bg-primary/[0.02] hover:shadow-[0_0_52px_oklch(0.78_0.18_165_/_0.15)]"
      }`}
      open={isOpen}
    >
      <summary
        className="relative cursor-pointer list-none p-5 marker:hidden"
        onClick={(e) => {
          e.preventDefault()
          onToggle()
        }}
      >
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <span className="flex items-center justify-between gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary/70">
            {guide.eyebrow}
          </span>
        </span>
        <span className="mt-5 block text-xl font-semibold text-foreground">
          {guide.label}
        </span>
        <span className="mt-2 block min-h-11 text-sm leading-6 text-white/58">
          {guide.title}
        </span>
        <span className="mt-4 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition group-open:border-primary/45">
          {isOpen ? t.roleOnboarding.closeGuide : t.roleOnboarding.openGuide}
        </span>
      </summary>

      <div className="px-5 pb-5">
        <div className="border-t border-white/10 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">
            {guide.label} {t.roleOnboarding.routeLabel}
          </p>
          <h3 className="mt-2 break-words text-xl font-bold text-foreground">
            {guide.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/62">{guide.summary}</p>

          <div className="mt-5 grid gap-3">
            {guide.steps.map((step, index) => {
              const StepIcon = step.icon

              return (
                <m.div
                  key={`${guide.id}-${step.title}`}
                  className="rounded-xl border border-white/10 bg-black/24 p-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                      <StepIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary/65">
                        {t.roleOnboarding.step} {index + 1}
                      </p>
                      <h4 className="mt-1 break-words text-sm font-semibold text-foreground">
                        {step.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-white/58">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </m.div>
              )
            })}
          </div>

          <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              {t.roleOnboarding.statusCalls}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.statusNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/70"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {guide.ctas.map((cta) => (
              <a
                key={`${guide.id}-${cta.href}`}
                href={cta.href}
                className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary/60 hover:bg-primary/15"
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </details>
  )
}
