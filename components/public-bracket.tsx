"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { m } from "framer-motion"
import { ExternalLink, GitBranch, ListOrdered, Radio, Table2, Trophy, UsersRound } from "lucide-react"
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh"
import { withAvatarCacheBust } from "@/lib/avatar"

export type PublicBracketParticipant = {
  id: string | null
  name: string
  score: number | null
  isWinner: boolean
  imageUrl: string | null
  kind: "player" | "team"
}

export type PublicBracketMatch = {
  id: string
  label: string
  position: number
  status: "upcoming" | "live" | "finished"
  participants: [PublicBracketParticipant, PublicBracketParticipant]
}

export type PublicBracketRound = {
  order: number
  label: string
  matches: PublicBracketMatch[]
}

export type PublicRoundRobinStanding = {
  participantId: string
  name: string
  groupKey?: string
  groupLabel?: string
  rank?: number
  played: number
  wins: number
  draws: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  scoreDiff: number
  points: number
  buchholz?: number
  omw?: number
}

export type PublicLeaderboardStanding = {
  participantId: string
  name: string
  placement: number | null
  played: number
  wins: number
  kills?: number
  points: number
}

export type PublicBracketData = {
  id: string
  type?: string | null
  formatLabel?: string | null
  status: string | null
  labels: PublicBracketLabels
  rounds: PublicBracketRound[]
  champion: string | null
  standings?: PublicRoundRobinStanding[]
  leaderboard?: PublicLeaderboardStanding[]
}

export type PublicBracketLabels = {
  title: string
  subtitle: string
  stageLabel: string
  participantLabel: string
  arenaLabel: string
}

type PublicBracketProps = {
  bracket?: PublicBracketData | null
  showMatchPageLink?: boolean
}

export function PublicBracket({ bracket, showMatchPageLink = true }: PublicBracketProps) {
  const { t } = useLanguage()

  // Live updates: refresh server data when matches/tournaments change
  useRealtimeRefresh({ tables: ["matches", "tournaments"], channel: "public-bracket" })

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#bracket") {
      const element = document.getElementById("bracket")
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 300)
      }
    }
  }, [])

  const hasBracket = Boolean(bracket && bracket.rounds.length > 0)
  const labels = bracket?.labels ?? {
    title: t.navbar.bracket,
    subtitle: t.navigationHub.cards.bracket.description,
  }

  const finalOnly =
    hasBracket && bracket!.rounds.length === 1 && bracket!.rounds[0]?.matches.length === 1
  const finalMatch = hasBracket ? bracket!.rounds.at(-1)?.matches.at(-1) ?? null : null
  const bracketType = bracket?.type ?? null

  return (
    <section className="relative z-10 px-4 py-24" id="bracket">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={labels.subtitle} title={labels.title} />

        <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-black/30 px-4 py-6 shadow-[0_0_60px_oklch(0.78_0.18_165_/_0.06)] md:px-6 md:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165_/_0.10),transparent_36%)]" />
          {hasBracket ? <FormatBadge bracket={bracket!} /> : null}

          {!hasBracket ? (
            <BracketEmptyState />
          ) : bracketType === "round_robin" ? (
            <TableFormatView bracket={bracket!} title="Round Robin" subtitle="Standings" />
          ) : bracketType === "swiss" ? (
            <SwissBracket bracket={bracket!} />
          ) : bracketType === "groups_then_playoffs" ? (
            <GroupsPlayoffsBracket bracket={bracket!} />
          ) : bracketType === "battle_royale" || bracketType === "free_for_all" ? (
            <LobbyLeaderboardBracket bracket={bracket!} />
          ) : bracketType === "double_elimination" ? (
            <DoubleEliminationBracket bracket={bracket!} />
          ) : finalOnly && finalMatch ? (
            <FinalOnlyBracket
              match={finalMatch}
              champion={bracket!.champion}
              labels={bracket!.labels}
              showMatchPageLink={showMatchPageLink}
            />
          ) : (
            <MultiRoundBracket bracket={bracket!} finalMatch={finalMatch} />
          )}
        </div>
      </div>
    </section>
  )
}

function FormatBadge({ bracket }: { bracket: PublicBracketData }) {
  return (
    <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-primary">
        <GitBranch className="h-3.5 w-3.5" />
        {bracket.formatLabel ?? getFormatLabel(bracket.type)}
      </span>
      {bracket.status ? (
        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
          {bracket.status}
        </span>
      ) : null}
    </div>
  )
}

function BracketEmptyState() {
  const { t } = useLanguage()

  return (
    <div className="relative z-10 mx-auto max-w-xl rounded-xl border border-white/10 bg-black/25 px-5 py-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
        {t.bracket.emptyTitle}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/60">
        {t.bracket.emptyBody}
      </p>
    </div>
  )
}

function FinalOnlyBracket({
  match,
  champion,
  labels,
  showMatchPageLink,
}: {
  match: PublicBracketMatch
  champion: string | null
  labels: PublicBracketLabels
  showMatchPageLink: boolean
}) {
  const { t } = useLanguage()

  return (
    <div className="relative">
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
        <m.div
          className="relative z-10 min-w-0"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <FinalistPanel
            participant={match.participants[0]}
            matchStatus={match.status}
            label={labels.participantLabel}
            side="left"
          />
        </m.div>

        <m.div
          className="relative z-0 order-first flex min-w-0 justify-center lg:order-none"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.08 }}
        >
          <ConnectorLine direction="left" active={match.status === "live"} />
          <BracketCore champion={champion} status={match.status} labels={labels} />
          <ConnectorLine direction="right" active={match.status === "live"} />
        </m.div>

        <m.div
          className="relative z-10 min-w-0"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <FinalistPanel
            participant={match.participants[1]}
            matchStatus={match.status}
            label={labels.participantLabel}
            side="right"
          />
        </m.div>
      </div>
      {showMatchPageLink ? (
        <div className="mt-6 flex justify-center">
          <Link
            href={`/matches/${match.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/15"
          >
            {t.matchPage.matchPage}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function TableFormatView({
  bracket,
  title,
  subtitle,
}: {
  bracket: PublicBracketData
  title: string
  subtitle: string
}) {
  return (
    <div className="relative z-10 space-y-8">
      <StandingsTable standings={bracket.standings ?? []} title={title} subtitle={subtitle} />
      <MatchListByRound bracket={bracket} />
    </div>
  )
}

function SwissBracket({ bracket }: { bracket: PublicBracketData }) {
  return (
    <div className="relative z-10 space-y-8">
      <StandingsTable standings={bracket.standings ?? []} title="Swiss" subtitle="Standings" showBuchholz />
      <MatchListByRound bracket={bracket} />
    </div>
  )
}

function GroupsPlayoffsBracket({ bracket }: { bracket: PublicBracketData }) {
  const groupLabels = Array.from(new Set((bracket.standings ?? []).map((row) => row.groupLabel).filter(Boolean)))
  const groupRounds = bracket.rounds.filter((round) => round.label.startsWith("Group "))
  const playoffRounds = bracket.rounds.filter((round) => !round.label.startsWith("Group "))
  const playoffBracket = { ...bracket, rounds: playoffRounds }

  return (
    <div className="relative z-10 space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        {groupLabels.map((groupLabel) => (
          <StandingsTable
            key={groupLabel}
            standings={(bracket.standings ?? []).filter((row) => row.groupLabel === groupLabel)}
            title={groupLabel ?? "Group"}
            subtitle="Group table"
            compact
          />
        ))}
      </div>
      {playoffRounds.length > 0 ? (
        <MultiRoundBracket bracket={playoffBracket} finalMatch={playoffRounds.at(-1)?.matches.at(-1) ?? null} />
      ) : (
        <MatchListByRound bracket={{ ...bracket, rounds: groupRounds }} />
      )}
    </div>
  )
}

function DoubleEliminationBracket({ bracket }: { bracket: PublicBracketData }) {
  const winners = bracket.rounds.filter((round) => round.label.startsWith("Winners"))
  const losers = bracket.rounds.filter((round) => round.label.startsWith("Losers"))
  const finals = bracket.rounds.filter((round) => round.label.startsWith("Grand Final"))

  return (
    <div className="relative z-10 space-y-10">
      <BracketRoundBand title="Winners Bracket" rounds={winners} icon="winners" />
      <BracketRoundBand title="Losers Bracket" rounds={losers} icon="losers" />
      <BracketRoundBand title="Grand Final" rounds={finals} icon="final" />
    </div>
  )
}

function LobbyLeaderboardBracket({ bracket }: { bracket: PublicBracketData }) {
  return (
    <div className="relative z-10 space-y-8">
      <LeaderboardTable leaderboard={bracket.leaderboard ?? []} />
      <LobbyRounds rounds={bracket.rounds} />
    </div>
  )
}

function StandingsTable({
  standings,
  title,
  subtitle,
  showBuchholz = false,
  compact = false,
}: {
  standings: PublicRoundRobinStanding[]
  title: string
  subtitle: string
  showBuchholz?: boolean
  compact?: boolean
}) {
  if (standings.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">{title}</p>
        <h3 className="mt-1 text-lg font-bold text-foreground">{subtitle}</h3>
      </div>
      <div className="bracket-scroll overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">D</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="px-4 py-3 text-center">Diff</th>
              {showBuchholz ? <th className="px-4 py-3 text-center">Buchholz</th> : null}
              {showBuchholz ? <th className="px-4 py-3 text-center">OMW</th> : null}
              <th className="px-4 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => (
              <tr key={row.participantId} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 font-mono text-primary">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.name}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.played}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.wins}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.draws}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.losses}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.scoreDiff}</td>
                {showBuchholz ? <td className="px-4 py-3 text-center text-white/75">{row.buchholz ?? 0}</td> : null}
                {showBuchholz ? <td className="px-4 py-3 text-center text-white/75">{formatPercent(row.omw)}</td> : null}
                <td className="px-4 py-3 text-center font-bold text-primary">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compact ? null : (
        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/45">
          Sorted by points, score diff, points for, wins, then name.
        </div>
      )}
    </div>
  )
}

function LeaderboardTable({ leaderboard }: { leaderboard: PublicLeaderboardStanding[] }) {
  if (leaderboard.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-sm text-white/60">
        Leaderboard will appear after final placements are saved.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">Leaderboard</p>
        <h3 className="mt-1 text-lg font-bold text-foreground">Placements</h3>
      </div>
      <div className="bracket-scroll overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3 text-center">Played</th>
              <th className="px-4 py-3 text-center">Wins</th>
              <th className="px-4 py-3 text-center">Kills</th>
              <th className="px-4 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, index) => (
              <tr key={row.participantId} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 font-mono text-primary">{row.placement ?? index + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.name}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.played}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.wins}</td>
                <td className="px-4 py-3 text-center text-white/75">{row.kills ?? 0}</td>
                <td className="px-4 py-3 text-center font-bold text-primary">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MatchListByRound({ bracket }: { bracket: PublicBracketData }) {
  return (
    <div className="space-y-4">
      {bracket.rounds.map((round) => (
        <div key={`${round.order}-${round.label}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{round.label}</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {round.matches.map((match) => (
              <BracketMatchCard key={match.id} match={match} showConnector={false} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function LobbyRounds({ rounds }: { rounds: PublicBracketRound[] }) {
  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <div key={`${round.order}-${round.label}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{round.label}</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {round.matches.map((match) => (
              <LobbyCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function LobbyCard({ match }: { match: PublicBracketMatch }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-xl border border-white/10 bg-black/25 p-4 transition hover:border-primary/35"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <ListOrdered className="h-5 w-5" />
        </span>
        <StatusBadge status={match.status} />
      </div>
      <h4 className="mt-4 break-words text-base font-bold text-foreground">{match.label}</h4>
      <p className="mt-2 text-sm text-white/55">{match.participants[1].name}</p>
    </Link>
  )
}

function BracketRoundBand({
  title,
  rounds,
  icon,
}: {
  title: string
  rounds: PublicBracketRound[]
  icon: "winners" | "losers" | "final"
}) {
  if (rounds.length === 0) return null

  const bandBracket: PublicBracketData = {
    id: title,
    status: null,
    labels: {
      title,
      subtitle: title,
      stageLabel: title,
      participantLabel: "Participant",
      arenaLabel: title,
    },
    rounds,
    champion: null,
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-5 flex items-center gap-2">
        {icon === "final" ? <Trophy className="h-4 w-4 text-primary" /> : <GitBranch className="h-4 w-4 text-primary" />}
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{title}</h3>
      </div>
      <MultiRoundBracket bracket={bandBracket} finalMatch={rounds.at(-1)?.matches.at(-1) ?? null} />
    </div>
  )
}

function MultiRoundBracket({
  bracket,
  finalMatch,
}: {
  bracket: PublicBracketData
  finalMatch: PublicBracketMatch | null
}) {
  return (
    <div className="relative">
      <div className="mb-8 flex justify-center">
        <BracketCore
          champion={bracket.champion}
          status={finalMatch?.status ?? "upcoming"}
          labels={bracket.labels}
        />
      </div>

      <div className="bracket-scroll flex gap-6 overflow-x-auto pb-4 md:grid md:grid-flow-col md:auto-cols-fr md:overflow-visible">
        {bracket.rounds.map((round, roundIndex) => (
          <m.div
            key={`${round.order}-${round.label}`}
            className="relative min-w-[285px] md:min-w-0"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: roundIndex * 0.08 }}
          >
            <RoundHeader label={round.label} index={roundIndex + 1} />
            <div className="mt-5 flex min-h-full flex-col justify-around gap-5">
              {round.matches.map((match) => (
                <div key={match.id} className="relative">
                  <BracketMatchCard
                    match={match}
                    showConnector={roundIndex < bracket.rounds.length - 1}
                  />
                </div>
              ))}
            </div>
          </m.div>
        ))}
      </div>
    </div>
  )
}

function RoundHeader({ label, index }: { label: string; index: number }) {
  const { t } = useLanguage()

  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-primary/20" />
      <div className="text-center">
        <p className="font-mono text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
          {t.bracket.round} {index}
        </p>
        <h3 className="mt-1 text-sm font-bold tracking-widest text-primary uppercase">
          {label}
        </h3>
      </div>
      <span className="h-px flex-1 bg-primary/20" />
    </div>
  )
}

function BracketCore({
  champion,
  status,
  labels,
}: {
  champion: string | null
  status: PublicBracketMatch["status"]
  labels: PublicBracketLabels
}) {
  const { t } = useLanguage()
  const isChampion = Boolean(champion)

  return (
    <div className="relative z-10 flex w-full max-w-[220px] flex-col items-center text-center">
      <div
        className={[
          "relative flex h-28 w-28 items-center justify-center rounded-full border border-primary/30 bg-black/50 md:h-32 md:w-32",
          "shadow-[0_0_50px_oklch(0.78_0.18_165_/_0.18)]",
          status === "live" ? "bracket-live-pulse" : "bracket-logo-breathe",
        ].join(" ")}
      >
        <span className="absolute inset-2 rounded-full border border-primary/10" />
        <img
          src="/images/logo.png"
          alt="Eclyps"
          className="h-16 w-16 object-contain drop-shadow-[0_0_22px_oklch(0.78_0.18_165_/_0.55)] md:h-20 md:w-20"
        />
      </div>

      <div className="mt-4 min-h-16">
        <p className="text-xs font-semibold tracking-[0.3em] text-primary uppercase">
          {isChampion ? t.bracket.champion : labels.stageLabel}
        </p>
        <p className="mt-2 min-w-0 break-words text-lg font-bold text-foreground">
          {champion ?? labels.arenaLabel}
        </p>
      </div>
    </div>
  )
}

function ConnectorLine({
  direction,
  active,
}: {
  direction: "left" | "right"
  active: boolean
}) {
  return (
    <span
      className={[
        "pointer-events-none absolute top-1/2 hidden h-px w-24 -translate-y-1/2 bg-primary/45 shadow-[0_0_12px_oklch(0.78_0.18_165_/_0.35)] lg:block",
        direction === "left"
          ? "right-[calc(50%+70px)]"
          : "left-[calc(50%+70px)]",
        active ? "bracket-line-pulse" : "",
      ].join(" ")}
    />
  )
}

function FinalistPanel({
  participant,
  matchStatus,
  label,
  side,
}: {
  participant: PublicBracketParticipant
  matchStatus: PublicBracketMatch["status"]
  label: string
  side: "left" | "right"
}) {
  const { t } = useLanguage()
  const isLoser = matchStatus === "finished" && participant.id && !participant.isWinner

  return (
    <div
      className={[
        "glass-card relative overflow-hidden rounded-xl p-5 transition-all duration-300",
        participant.isWinner
          ? "border-primary/45 shadow-[0_0_35px_oklch(0.78_0.18_165_/_0.14)]"
          : "",
        matchStatus === "live" ? "bracket-live-pulse" : "",
        isLoser ? "opacity-55" : "",
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div
        className={[
          "flex items-center justify-between gap-4",
          side === "right" ? "lg:flex-row-reverse" : "",
        ].join(" ")}
      >
        <div
          className={[
            "flex min-w-0 items-center gap-3",
            side === "right" ? "lg:flex-row-reverse lg:text-right" : "",
          ].join(" ")}
        >
          <ParticipantAvatar participant={participant} size="final" />
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-primary uppercase">
              {label}
            </p>
            <h3 className="break-words text-lg font-bold leading-tight text-foreground sm:text-2xl">
              {participant.name}
            </h3>
          </div>
        </div>
        <ScoreBox score={participant.score} />
      </div>
      {participant.isWinner ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <Trophy className="h-4 w-4" />
          {t.bracket.winner}
        </div>
      ) : null}
    </div>
  )
}

function BracketMatchCard({
  match,
  showConnector,
}: {
  match: PublicBracketMatch
  showConnector: boolean
}) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className={[
        "glass-card group relative block rounded-xl p-3 transition-all duration-300 hover:border-primary/35",
        match.status === "live"
          ? "bracket-live-pulse border-primary/40"
          : "",
      ].join(" ")}
    >
      {showConnector ? <MatchConnector active={match.status === "live"} /> : null}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="min-w-0 break-words text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {match.label}
        </span>
        <StatusBadge status={match.status} />
      </div>

      <div className="space-y-2">
        {match.participants.map((participant, index) => (
          <ParticipantRow
            key={`${match.id}-${index}-${participant.id ?? "tbd"}`}
            participant={participant}
            matchStatus={match.status}
          />
        ))}
      </div>
    </Link>
  )
}

function MatchConnector({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute left-full top-1/2 z-0 hidden w-6 -translate-y-1/2 md:block">
      <span
        className={[
          "absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary/30",
          active ? "bracket-line-pulse" : "",
        ].join(" ")}
      />
      <span
        className={[
          "absolute right-0 top-1/2 h-10 w-px -translate-y-1/2 bg-primary/20",
          active ? "bracket-line-pulse" : "",
        ].join(" ")}
      />
    </div>
  )
}

function ParticipantRow({
  participant,
  matchStatus,
}: {
  participant: PublicBracketParticipant
  matchStatus: PublicBracketMatch["status"]
}) {
  const isTbd = participant.name === "TBD"
  const isLoser = matchStatus === "finished" && participant.id && !participant.isWinner

  return (
    <div
      className={[
        "flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2",
        participant.isWinner
          ? "border-primary/45 bg-primary/10 text-foreground shadow-[inset_0_0_18px_oklch(0.78_0.18_165_/_0.08)]"
          : "border-white/10 bg-black/25 text-foreground",
        isLoser ? "opacity-45" : "",
        isTbd ? "border-dashed text-muted-foreground" : "",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <ParticipantAvatar participant={participant} size="compact" />
        <span className="min-w-0 truncate text-sm font-semibold" title={participant.name}>
          {participant.name}
        </span>
      </span>
      <ScoreBox score={participant.score} compact />
    </div>
  )
}

function ParticipantAvatar({
  participant,
  size,
}: {
  participant: PublicBracketParticipant
  size: "final" | "compact"
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = imageFailed ? null : withAvatarCacheBust(participant.imageUrl, null)
  const initials = getParticipantInitials(participant.name)

  return (
    <span
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-black/40 font-mono font-bold text-primary shadow-[inset_0_0_18px_oklch(0.78_0.18_165_/_0.08)]",
        size === "final"
          ? "h-14 w-14 text-base md:h-16 md:w-16"
          : "h-8 w-8 text-[11px] md:h-9 md:w-9",
      ].join(" ")}
      aria-hidden={!imageUrl}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${participant.name} ${participant.kind === "team" ? "logo" : "avatar"}`}
          className={[
            "h-full w-full",
            participant.kind === "team" ? "object-contain p-1.5" : "object-cover",
          ].join(" ")}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  )
}

function getParticipantInitials(name: string) {
  const normalized = name.trim()
  if (!normalized || normalized.toUpperCase() === "TBD") return "?"

  const parts = normalized.split(/\s+/).filter(Boolean)
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
    : normalized.slice(0, 2)

  return initials.toUpperCase()
}

function ScoreBox({ score, compact = false }: { score: number | null; compact?: boolean }) {
  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center rounded-md border border-primary/20 bg-black/35 font-mono font-bold",
        compact ? "h-8 min-w-8 px-2 text-sm" : "h-12 min-w-12 px-3 text-xl",
        score === null ? "text-muted-foreground" : "text-primary",
      ].join(" ")}
    >
      {score ?? "-"}
    </span>
  )
}

function StatusBadge({ status }: { status: PublicBracketMatch["status"] }) {
  const { t } = useLanguage()

  if (status === "live") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
        <Radio className="h-3 w-3" />
        {t.schedule.live}
      </span>
    )
  }

  return (
    <span className={getStatusClassName(status)}>
      {formatStatus(status, t)}
    </span>
  )
}

function getStatusClassName(status: PublicBracketMatch["status"]) {
  return [
    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
    status === "finished"
      ? "bg-white/10 text-foreground"
      : "bg-white/5 text-muted-foreground",
  ].join(" ")
}

function formatStatus(status: PublicBracketMatch["status"], t: any) {
  return status === "finished" ? t.bracket.finished : t.bracket.upcoming
}

function getFormatLabel(type: string | null | undefined) {
  return {
    single_elimination: "Single Elimination",
    double_elimination: "Double Elimination",
    round_robin: "Round Robin",
    swiss: "Swiss",
    groups_then_playoffs: "Groups + Playoffs",
    battle_royale: "Battle Royale",
    free_for_all: "Free-for-All",
  }[type ?? ""] ?? "Tournament"
}

function formatPercent(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0%"
  return `${Math.round(value * 100)}%`
}
