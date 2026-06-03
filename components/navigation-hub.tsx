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
      href: "/matches?tab=upcoming",
      label: t.navigationHub.cards.schedule.label,
      description: t.navigationHub.cards.schedule.description,
      icon: Calendar,
    },
    {
      href: "/matches?tab=finished",
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
                className="glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 border border-primary/10 transition-all duration-300 hover:border-primary/45"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                {/* Neon Hover Glow Overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/[0.01] group-hover:to-primary/[0.06] transition-all duration-500"
                  aria-hidden="true"
                />
                
                {/* Top Border Glow Line */}
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-primary/50 transition-all duration-500"
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-xl border border-primary/20 bg-primary/5 text-primary group-hover:border-primary/50 group-hover:bg-primary/10 transition-all duration-300">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
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
                    className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-primary"
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
