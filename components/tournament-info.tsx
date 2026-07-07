"use client"

import { m } from "framer-motion"
import Link from "next/link"
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
  bannerUrl?: string | null
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
  bannerUrl,
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

        {bannerUrl ? (
          <m.div
            className="relative mb-12 overflow-hidden rounded-3xl border border-primary/20 bg-black/40 shadow-[0_0_50px_rgba(0,255,170,0.12)]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="h-56 w-full bg-cover bg-center md:h-80"
              style={{ backgroundImage: `url("${bannerUrl}")` }}
              aria-label={tournamentName}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </m.div>
        ) : null}

        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          <Link href="/matches" className={quickLinkClassName}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-primary shadow-[0_0_18px_rgba(0,255,170,0.18)]">
              <Swords className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-base font-black text-foreground">{t.matchPage.openMatches}</span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Live games</span>
            </span>
            <span className="text-xl text-primary transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>

          <Link href="#bracket" className={quickLinkClassName}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-primary shadow-[0_0_18px_rgba(0,255,170,0.18)]">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-base font-black text-foreground">{t.matchPage.openBracket}</span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Tournament grid</span>
            </span>
            <span className="text-xl text-primary transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>

          <Link href="/tournaments" className={quickLinkClassName}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-primary shadow-[0_0_18px_rgba(0,255,170,0.18)]">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-base font-black text-foreground">{t.tournamentArchive.tournamentArchive}</span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Past events</span>
            </span>
            <span className="text-xl text-primary transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>

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

const quickLinkClassName =
  "group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-primary/45 bg-[linear-gradient(135deg,rgba(0,255,170,0.14),rgba(0,20,14,0.78))] p-4 shadow-[0_0_28px_rgba(0,255,170,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/70 hover:bg-primary/15 hover:shadow-[0_0_38px_rgba(0,255,170,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-primary/70 before:opacity-80 after:pointer-events-none after:absolute after:-right-10 after:-top-10 after:h-24 after:w-24 after:rounded-full after:bg-primary/10 after:blur-2xl after:transition-opacity after:duration-300 group-hover:after:opacity-100"

function readDisplayValue(value?: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function readPositiveCount(value?: string) {
  const normalizedValue = readDisplayValue(value)
  if (!normalizedValue) return null

  const numericValue = Number(normalizedValue)
  return Number.isFinite(numericValue) && numericValue >= 0 ? normalizedValue : null
}
