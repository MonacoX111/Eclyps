"use client"

import { useEffect } from "react"
import Link from "next/link"
import { m } from "framer-motion"
import { ExternalLink, Radio, Trophy } from "lucide-react"
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"

export type PublicBracketParticipant = {
  id: string | null
  name: string
  score: number | null
  isWinner: boolean
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

export type PublicBracketData = {
  id: string
  status: string | null
  labels: PublicBracketLabels
  rounds: PublicBracketRound[]
  champion: string | null
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

  return (
    <section className="relative z-10 px-4 py-24" id="bracket">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={labels.subtitle} title={labels.title} />

        <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-black/30 px-4 py-6 shadow-[0_0_60px_oklch(0.78_0.18_165_/_0.06)] md:px-6 md:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165_/_0.10),transparent_36%)]" />

          {!hasBracket ? (
            <BracketEmptyState />
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
        <div className={["min-w-0", side === "right" ? "lg:text-right" : ""].join(" ")}>
          <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-primary uppercase">
            {label}
          </p>
          <h3 className="break-words text-2xl font-bold text-foreground">
            {participant.name}
          </h3>
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
      <span className="min-w-0 break-words text-sm font-semibold">
        {participant.name}
      </span>
      <ScoreBox score={participant.score} compact />
    </div>
  )
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
