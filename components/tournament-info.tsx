"use client"

import { m } from "framer-motion"
import { Trophy, Users, Calendar, Swords } from "lucide-react"
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"

type TournamentInfoProps = {
  tournamentName?: string
  game?: string
  prizePool?: string
  teamCount?: string
  matchDays?: string
  format?: string
  arenaTitle?: string
  arenaDescription?: string
  arenaTags?: string[]
  participantLabel?: "Teams" | "Players"
}

export function TournamentInfo({
  tournamentName = "June Private Cup",
  game,
  prizePool,
  teamCount,
  matchDays,
  format,
  arenaTitle = "Enter the Arena",
  arenaDescription,
  arenaTags = ["PC Platform", "5v5 Format", "BO1 + BO3", "Private Lobby"],
  participantLabel = "Teams",
}: TournamentInfoProps) {
  const { t } = useLanguage()

  const visiblePrizePool = readDisplayValue(prizePool)
  const visibleGame = readDisplayValue(game)
  const visibleTeamCount = readPositiveCount(teamCount)
  const visibleMatchDays = readDisplayValue(matchDays)
  const visibleFormat = readDisplayValue(format)

  const stats = [
    visiblePrizePool
      ? { icon: Trophy, label: t.tournament.prizePool, value: visiblePrizePool }
      : null,
    visibleTeamCount
      ? { icon: Users, label: participantLabel === "Players" ? t.navbar.players : t.navbar.teams, value: visibleTeamCount }
      : null,
    visibleMatchDays
      ? { icon: Calendar, label: t.tournament.matchDays, value: visibleMatchDays }
      : null,
    visibleFormat
      ? { icon: Swords, label: t.tournament.format, value: visibleFormat }
      : null,
  ].filter(
    (
      stat,
    ): stat is {
      icon: typeof Trophy
      label: string
      value: string
    } => stat !== null,
  )

  const visibleArenaDescription =
    typeof arenaDescription === "string" && arenaDescription.trim().length > 0
      ? arenaDescription
      : null

  const displayArenaTitle = arenaTitle === "Enter the Arena" ? t.tournament.enterArena : arenaTitle

  return (
    <section className="relative z-10 px-4 py-24" id="tournament">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <SectionHeading eyebrow={t.tournament.upcomingEvent} title={tournamentName}>
          {visibleGame ? (
            <span className="glass-card mt-4 inline-flex max-w-full break-words rounded-full px-4 py-1.5 text-center text-sm font-medium uppercase tracking-widest text-primary">
              {visibleGame}
            </span>
          ) : null}
        </SectionHeading>

        {/* Stats grid */}
        <div className="mb-16 flex flex-wrap justify-center gap-4">
          {stats.map((stat, i) => (
            <m.div
              key={stat.label}
              className="glass-card flex w-[calc((100%-1rem)/2)] flex-col items-center gap-3 rounded-xl p-6 text-center transition-all duration-300 md:w-[calc((100%-3rem)/4)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <stat.icon className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold text-foreground md:text-3xl">
                {stat.value}
              </span>
              <span className="text-xs tracking-widest uppercase text-muted-foreground">
                {stat.label}
              </span>
            </m.div>
          ))}
        </div>

        {/* Tournament description card */}
        <m.div
          className="glass-card mx-auto max-w-3xl rounded-2xl p-8 text-center md:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <h3 className="mb-4 text-xl font-bold text-foreground md:text-2xl">
            {displayArenaTitle}
          </h3>
          {visibleArenaDescription ? (
            <p className="mb-6 leading-relaxed text-muted-foreground">
              {visibleArenaDescription}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {arenaTags.map((tag) => (
              <span
                key={tag}
                className="glass-card max-w-full break-words rounded-full px-4 py-1.5 text-center text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </m.div>
      </div>
    </section>
  )
}

function readDisplayValue(value?: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function readPositiveCount(value?: string) {
  const normalizedValue = readDisplayValue(value)
  if (!normalizedValue) return null

  const numericValue = Number(normalizedValue)
  return Number.isFinite(numericValue) && numericValue >= 0 ? normalizedValue : null
}
