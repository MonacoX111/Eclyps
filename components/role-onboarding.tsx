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
  statusNotes: string[]
  ctas: Array<{ label: string; href: string }>
}

const roleGuides: RoleGuide[] = [
  {
    id: "spectator",
    label: "Spectator",
    eyebrow: "Watch",
    title: "Follow the event without logging in",
    summary:
      "Browse the tournament, scan the bracket, follow match times, and open player or team profiles. Discord is only needed when you want to participate.",
    icon: Eye,
    steps: [
      {
        title: "Start with the tournament",
        body: "Check the active event, format, prize pool, player or team count, and stage details.",
        icon: Trophy,
      },
      {
        title: "Track the bracket and schedule",
        body: "Use the bracket for tournament progress and the schedule for match times, live states, and finished scores.",
        icon: GitBranch,
      },
      {
        title: "Read results and profiles",
        body: "Open profiles to review regions, recent matches, stats, rating, rank, and result history.",
        icon: BarChart3,
      },
    ],
    statusNotes: [
      "No Discord login required",
      "Time TBA means match time is not announced yet",
      "Bracket appears after admins publish it",
    ],
    ctas: [
      { label: "View Tournament", href: "/tournament" },
      { label: "Open Bracket", href: "/bracket" },
      { label: "Match Schedule", href: "/schedule" },
    ],
  },
  {
    id: "player",
    label: "Player",
    eyebrow: "Compete",
    title: "From Discord login to ELO history",
    summary:
      "Connect Discord, become an approved Eclyps player, register for the active tournament, check in, then track matches and rating on your profile.",
    icon: Gamepad2,
    steps: [
      {
        title: "Login with Discord",
        body: "Your Discord account anchors ownership for applications, registrations, check-in, and disputes.",
        icon: LogIn,
      },
      {
        title: "Apply as Player",
        body: "Submit your nickname and region, then wait for admin approval before tournament registration unlocks.",
        icon: UserPlus,
      },
      {
        title: "Register and check in",
        body: "After player approval, register for the tournament, wait for tournament approval, then check in during the open window.",
        icon: CheckCircle2,
      },
      {
        title: "Play and track progress",
        body: "Finished matches feed your public profile, recent history, winrate, streak, rating, and rank.",
        icon: Medal,
      },
    ],
    statusNotes: [
      "Pending means an admin still needs to review",
      "Approved means your player or tournament slot is accepted",
      "Checked in means your attendance is confirmed",
    ],
    ctas: [
      { label: "Open Registration", href: "/registration" },
      { label: "View Players", href: "/players" },
      { label: "View Results", href: "/results" },
    ],
  },
  {
    id: "captain",
    label: "Captain",
    eyebrow: "Lead",
    title: "Register a team and lock the roster",
    summary:
      "Captains need an approved player profile first. Then they can submit a team registration, roster, captain nickname, substitutes, and handle team check-in.",
    icon: Crown,
    steps: [
      {
        title: "Become an approved player",
        body: "Captain ownership starts from a verified Discord account with an approved Eclyps player profile.",
        icon: ShieldCheck,
      },
      {
        title: "Submit the team",
        body: "Enter the team name, contact details, 5 main players, and up to 2 optional substitutes.",
        icon: Users,
      },
      {
        title: "Match the captain nickname",
        body: "The captain nickname must exactly match one of the submitted roster nicknames.",
        icon: Crown,
      },
      {
        title: "Approve, check in, compete",
        body: "Admins review the team. Once approved, the captain or owner checks in and the roster is ready for matches.",
        icon: Swords,
      },
    ],
    statusNotes: [
      "Roster requires 5 main players",
      "Substitutes are optional and limited to 2",
      "Only the owner or captain can check in the team",
    ],
    ctas: [
      { label: "Open Registration", href: "/registration" },
      { label: "View Teams", href: "/teams" },
      { label: "Match Schedule", href: "/schedule" },
    ],
  },
]

export function RoleOnboarding() {
  const [activeRoleId, setActiveRoleId] = useState<RoleId | null>(null)

  return (
    <section className="relative z-10 px-4 py-20" id="guide">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Start Here" title="How Do You Want to Use Eclyps?">
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/58">
            Pick a role and get the short match plan before you browse, register,
            or lead a roster.
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
          {isOpen ? "Close guide" : "Open guide"}
        </span>
      </summary>

      <div className="px-5 pb-5">
        <div className="border-t border-white/10 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">
            {guide.label} route
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
                        Step {index + 1}
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
              Status calls
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
