import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarClock,
  ExternalLink,
  Flag,
  Radio,
  Swords,
  Trophy,
} from "lucide-react"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getPublicMatchDetail, type MatchDetail } from "@/lib/data/match-detail"
import { getTranslations } from "@/lib/i18n/server"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"

export const dynamic = "force-dynamic"

type MatchPageProps = {
  params: Promise<{ id: string }>
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params
  const [match, userProfile, t] = await Promise.all([
    getPublicMatchDetail(id),
    getCurrentUserProfile(),
    getTranslations(),
  ])

  if (!match) notFound()

  const title = `${participantName(match.participants[0], t)} vs ${participantName(match.participants[1], t)}`
  const scheduledTime = formatMatchScheduleTime({
    scheduledAt: match.scheduledAt,
    timezone: match.timezone,
    scheduleNote: match.scheduleNote,
  })
  const winner = getWinner(match)

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Navbar
          participantLabel={match.participantType === "player" ? "Players" : "Teams"}
          userProfile={userProfile}
        />

        <section className="relative z-10 px-4 py-10 md:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap gap-3">
              <Link href="/matches" className={secondaryLinkClassName}>
                {t.matchPage.backToMatches}
              </Link>
              <Link href="/tournament#bracket" className={secondaryLinkClassName}>
                {t.matchPage.backToBracket}
              </Link>
            </div>

          <article className="glass-card relative overflow-hidden rounded-2xl p-5 md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165_/_0.10),transparent_38%)]" />

            <div className="relative z-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    <span>{match.tournament.name ?? t.matchPage.tournament}</span>
                    {match.tournament.game ? (
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 tracking-normal">
                        {match.tournament.game}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-4 break-words text-3xl font-black tracking-tight text-foreground md:text-5xl">
                    {title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/60">
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      {scheduledTime}
                    </span>
                    <span>{match.stage ?? match.round ?? t.matchPage.round}</span>
                    {match.bracketPosition ? (
                      <span>{t.matchPage.bracket} #{match.bracketPosition}</span>
                    ) : null}
                  </div>
                </div>
                <StatusBadge status={match.status} t={t} />
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)]">
                <ParticipantCard
                  participant={match.participants[0]}
                  isWinner={match.winnerParticipantId === match.participants[0].id}
                  t={t}
                />
                <ScorePanel match={match} winnerName={winner?.name ?? null} t={t} />
                <ParticipantCard
                  participant={match.participants[1]}
                  isWinner={match.winnerParticipantId === match.participants[1].id}
                  t={t}
                />
              </div>
            </div>
          </article>

          {match.isIncomplete ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/60">
              {t.matchPage.incompleteData}
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <DetailsSection match={match} winnerName={winner?.name ?? null} t={t} />
            <div className="space-y-6">
              <WatchSection match={match} t={t} />
              <DisputeSection match={match} t={t} />
            </div>
          </div>
        </div>
        </section>
      </MotionProvider>

      <Footer />
    </main>
  )
}

function ParticipantCard({
  participant,
  isWinner,
  t,
}: {
  participant: MatchDetail["participants"][number]
  isWinner: boolean
  t: any
}) {
  const name = participantName(participant, t)
  const content = (
    <div
      className={[
        "flex min-h-40 min-w-0 flex-col items-center justify-center rounded-xl border bg-black/25 p-5 text-center transition",
        isWinner
          ? "border-primary/45 shadow-[0_0_35px_oklch(0.78_0.18_165_/_0.14)]"
          : "border-white/10",
      ].join(" ")}
    >
      <Avatar participant={participant} name={name} />
      <h2 className="mt-4 max-w-full break-words text-xl font-bold text-foreground">
        {name}
      </h2>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
        {participant.type === "player" ? t.matchPage.player : t.matchPage.team}
      </p>
      {isWinner ? (
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Trophy className="h-3.5 w-3.5" />
          {t.matchPage.winner}
        </span>
      ) : null}
    </div>
  )

  return participant.href ? (
    <Link href={participant.href} className="block min-w-0 hover:opacity-95">
      {content}
    </Link>
  ) : (
    content
  )
}

function Avatar({
  participant,
  name,
}: {
  participant: MatchDetail["participants"][number]
  name: string
}) {
  if (participant.imageUrl) {
    return (
      <img
        src={participant.imageUrl}
        alt=""
        className="h-20 w-20 rounded-full border border-primary/25 object-cover"
      />
    )
  }

  return (
    <span className="grid h-20 w-20 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xl font-black text-primary">
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function ScorePanel({
  match,
  winnerName,
  t,
}: {
  match: MatchDetail
  winnerName: string | null
  t: any
}) {
  const hasScore = match.score1 !== null && match.score2 !== null
  const score = hasScore ? `${match.score1}:${match.score2}` : "-:-"

  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-5 text-center">
      <Swords className="h-6 w-6 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
        {match.status === "finished" ? t.matchPage.finalScore : t.matchPage.status}
      </p>
      <p className="mt-2 font-mono text-4xl font-black text-foreground">
        {score}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/60">
        {match.status === "upcoming"
          ? t.matchPage.matchNotStarted
          : winnerName
            ? `${t.matchPage.winner}: ${winnerName}`
            : t.matchPage.scoreUnavailable}
      </p>
    </div>
  )
}

function DetailsSection({
  match,
  winnerName,
  t,
}: {
  match: MatchDetail
  winnerName: string | null
  t: any
}) {
  const items = [
    [t.matchPage.tournament, match.tournament.name],
    [t.matchPage.game, match.tournament.game],
    [t.matchPage.participantType, match.participantType],
    [t.matchPage.round, match.round],
    [t.matchPage.stage, match.stage],
    [
      t.matchPage.scheduledTime,
      formatMatchScheduleTime({
        scheduledAt: match.scheduledAt,
        timezone: match.timezone,
        scheduleNote: match.scheduleNote,
      }),
    ],
    [t.matchPage.status, formatStatus(match.status, t)],
    [t.matchPage.winner, winnerName],
    [t.matchPage.nextMatch, match.nextMatchLabel],
  ]

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-foreground">{t.matchPage.matchDetails}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
              {label}
            </p>
            <p className="mt-2 min-w-0 break-words text-sm font-semibold text-white/80">
              {value || t.matchPage.tbd}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/tournament#bracket" className={secondaryLinkClassName}>
          {t.matchPage.openBracket}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link href="/matches" className={secondaryLinkClassName}>
          {t.matchPage.openMatches}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}

function WatchSection({ match, t }: { match: MatchDetail; t: any }) {
  const channel = match.broadcast
  const typeLabel = channel ? getChannelTypeLabel(channel.type, t) : null
  const description =
    channel?.type === "discord"
      ? t.matchPage.discordChannelDescription
      : channel?.type === "other"
        ? t.matchPage.externalMatchChannel
        : null
  const buttonLabel = channel ? getChannelButtonLabel(channel.type, t) : null

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-foreground">{t.matchPage.matchChannel}</h2>
      {channel?.url ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {typeLabel}
            </p>
            {channel.label ? (
              <p className="mt-2 min-w-0 break-words text-sm font-semibold text-white/80">
                {channel.label}
              </p>
            ) : null}
            {description ? (
              <p className="mt-2 text-sm leading-6 text-white/60">
                {description}
              </p>
            ) : null}
          </div>
          <a
            href={channel.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryLinkClassName} w-full justify-center`}
          >
            <Radio className="h-4 w-4" />
            {buttonLabel}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-white/60">
          {t.matchPage.noMatchChannel}
        </p>
      )}
    </section>
  )
}

function getChannelTypeLabel(type: NonNullable<MatchDetail["broadcast"]>["type"], t: any) {
  if (type === "twitch") return "Twitch"
  if (type === "youtube") return "YouTube"
  if (type === "kick") return "Kick"
  if (type === "discord") return t.matchPage.discordVoice
  return t.matchPage.externalMatchChannel
}

function getChannelButtonLabel(type: NonNullable<MatchDetail["broadcast"]>["type"], t: any) {
  if (type === "discord") return t.matchPage.openDiscord
  if (type === "other") return t.matchPage.openLink
  return t.matchPage.openStream
}

function DisputeSection({ match, t }: { match: MatchDetail; t: any }) {
  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-foreground">{t.matchPage.disputeStatus}</h2>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-sm text-white/70">
        <Flag className="h-4 w-4 text-primary" />
        {formatDisputeStatus(match.disputeStatus, t)}
      </div>
    </section>
  )
}

function StatusBadge({ status, t }: { status: MatchDetail["status"]; t: any }) {
  return (
    <span
      className={[
        "inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.16em]",
        status === "live"
          ? "bg-primary/15 text-primary"
          : "bg-white/10 text-white/75",
      ].join(" ")}
    >
      {status === "live" ? <Radio className="h-4 w-4" /> : null}
      {formatStatus(status, t)}
    </span>
  )
}

function getWinner(match: MatchDetail) {
  return match.participants.find(
    (participant) => participant.id && participant.id === match.winnerParticipantId,
  )
}

function participantName(
  participant: MatchDetail["participants"][number],
  t: any,
) {
  return participant.name ?? t.matchPage.tbd
}

function formatStatus(status: MatchDetail["status"], t: any) {
  if (status === "live") return t.schedule.live
  if (status === "finished") return t.schedule.finished
  return t.schedule.upcoming
}

function formatDisputeStatus(status: MatchDetail["disputeStatus"], t: any) {
  if (status === "open") return t.matchPage.disputeOpened
  if (status === "under_review") return t.matchPage.underReview
  if (status === "resolved" || status === "rejected") return t.matchPage.resolved
  return t.matchPage.noDispute
}

const primaryLinkClassName =
  "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-black transition hover:bg-primary/90"

const secondaryLinkClassName =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-primary/40 hover:text-primary"
