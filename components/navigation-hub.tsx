"use client"

import { m } from "framer-motion"
import Link from "next/link"
import {
  Trophy,
  Users,
  UserPlus,
  GitBranch,
  Calendar,
  Medal,
  ArrowRight,
} from "lucide-react"
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"

type NavigationHubProps = {
  participantLabel?: "Teams" | "Players"
}

export function NavigationHub({ participantLabel = "Teams" }: NavigationHubProps) {
  const { t } = useLanguage()
  const competitorPath = participantLabel === "Players" ? "/players" : "/teams"

  const cards = [
    {
      href: "/tournament",
      label: t.navigationHub.cards.tournament.label,
      description: t.navigationHub.cards.tournament.description,
      icon: Trophy,
    },
    {
      href: competitorPath,
      label: participantLabel === "Players" ? t.navbar.players : t.navbar.teams,
      description: participantLabel === "Players" 
        ? t.navigationHub.cards.competitor.descriptionPlayers 
        : t.navigationHub.cards.competitor.descriptionTeams,
      icon: Users,
    },
    {
      href: "/registration",
      label: t.navigationHub.cards.registration.label,
      description: t.navigationHub.cards.registration.description,
      icon: UserPlus,
    },
    {
      href: "/tournament#bracket",
      label: t.navigationHub.cards.bracket.label,
      description: t.navigationHub.cards.bracket.description,
      icon: GitBranch,
    },
    {
      href: "/matches?tab=upcoming#matches",
      label: t.navigationHub.cards.schedule.label,
      description: t.navigationHub.cards.schedule.description,
      icon: Calendar,
    },
    {
      href: "/matches?tab=finished#matches",
      label: t.navigationHub.cards.results.label,
      description: t.navigationHub.cards.results.description,
      icon: Medal,
    },
  ]

  return (
    <section className="relative z-10 px-4 py-24" id="navigation-hub">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={t.navigationHub.eyebrow} title={t.navigationHub.title}>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/58">
            {t.navigationHub.description}
          </p>
        </SectionHeading>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <m.div
                key={card.href}
                className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-black/25 p-6 shadow-[var(--surface-shadow)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/28 hover:bg-black/32"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent transition group-hover:via-primary/35"
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-lg border border-primary/18 bg-primary/[0.06] text-primary transition-all duration-300 group-hover:border-primary/38 group-hover:bg-primary/10">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="text-lg font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
                      {card.label}
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </div>

                <div className="relative z-10 mt-6 pt-4 border-t border-white/5">
                  <Link
                    href={card.href}
                    className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-primary/88"
                  >
                    <span>{t.navigationHub.viewSection}</span>
                    <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1.5 duration-300" />
                  </Link>
                </div>
              </m.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
