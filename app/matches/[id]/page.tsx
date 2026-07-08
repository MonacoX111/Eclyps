import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Flag,
  Radio,
  Swords,
  Trophy,
} from "lucide-react"
import { submitMatchDispute } from "@/app/actions/disputes"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { PublicBracket } from "@/components/public-bracket"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData } from "@/lib/data/homepage"
import { getPublicMatchDetail, isUserMatchParticipant, type MatchDetail } from "@/lib/data/match-detail"
import { getTournamentArchiveDetail } from "@/lib/data/tournament-archive"
import { getLanguage, getTranslations } from "@/lib/i18n/server"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"
import { cookies } from "next/headers"
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth"
import { getMatchMessages } from "@/lib/data/match-chat"
import { MatchChat } from "@/components/match-chat"
import { createPageMetadata } from "@/lib/seo"

export const dynamic = "force-dynamic"

type MatchPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { id } = await params
  const [match, homepageData, t] = await Promise.all([
    getPublicMatchDetail(id),
    getHomepageData(),
    getTranslations(),
  ])

  if (!match) {
    return {
      title: `${t.matchPage.matchDetails} | Eclyps`,
      robots: { index: false, follow: false },
    }
  }

  const title = `${participantName(match.participants[0], t)} vs ${participantName(match.participants[1], t)} | Eclyps`
  const scheduledTime = formatMatchScheduleTime({
    scheduledAt: match.scheduledAt,
    timezone: match.timezone,
    scheduleNote: match.scheduleNote,
  })
  const tournamentBanner =
    homepageData.tournament?.id === match.tournament.id
      ? homepageData.tournamentView?.bannerUrl
      : match.tournament.id
        ? (await getTournamentArchiveDetail(match.tournament.id))?.tournament.bannerUrl
        : null
  const image =
    tournamentBanner ??
    match.participants.find((participant) => participant.imageUrl)?.imageUrl

  return createPageMetadata({
    title,
    description: `${match.tournament.name ?? t.matchPage.tournament}. ${formatStatus(match.status, t)}. ${scheduledTime}.`,
    path: `/matches/${id}`,
    image,
    imageAlt: title,
  })
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params
  const [match, homepageData, userProfile, t, lang, chatMessages, cookieStore] = await Promise.all([
    getPublicMatchDetail(id),
    getHomepageData(),
    getCurrentUserProfile(),
    getTranslations(),
    getLanguage(),
    getMatchMessages(id),
    cookies(),
  ])

  if (!match) notFound()

  const isMatchParticipant = await isUserMatchParticipant(match, userProfile?.id ?? null)
  const isAdmin = await isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)

  const isActiveTournamentMatch = homepageData.tournament?.id === match.tournament.id
  const bracket = isActiveTournamentMatch
    ? homepageData.publicBracket
    : await getArchivedTournamentBracket(match.tournament.id)
  const backHref =
    isActiveTournamentMatch || !match.tournament.id
      ? "/matches"
      : `/tournaments/${match.tournament.id}`
  const backLabel = isActiveTournamentMatch
    ? t.matchPage.backToMatches
    : t.tournamentArchive.backToTournament
  const bracketHref = isActiveTournamentMatch
    ? "/tournament#bracket"
    : match.tournament.id
      ? `/tournaments/${match.tournament.id}#bracket`
      : null
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
              <Link href={backHref} className={secondaryLinkClassName}>
                {backLabel}
              </Link>
              {bracketHref ? (
                <Link href={bracketHref} className={secondaryLinkClassName}>
                  {t.matchPage.openBracket}
                </Link>
              ) : null}
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
                  isWinner={isWinnerParticipant(match, match.participants[0])}
                  t={t}
                />
                <ScorePanel match={match} winnerName={winner?.name ?? null} t={t} />
                <ParticipantCard
                  participant={match.participants[1]}
                  isWinner={isWinnerParticipant(match, match.participants[1])}
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

          {isMatchParticipant ? (
            <MatchRoomGuide match={match} lang={lang} t={t} />
          ) : (
            <SpectatorGuide match={match} lang={lang} t={t} />
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <DetailsSection match={match} winnerName={winner?.name ?? null} t={t} />
            <div className="space-y-6">
              <WatchSection match={match} t={t} />
              <DisputeSection match={match} lang={lang} t={t} />
            </div>
          </div>
        </div>
        </section>

        <PublicBracket bracket={bracket} showMatchPageLink={false} />
      </MotionProvider>

      <MatchChat
        matchId={match.id}
        initialMessages={chatMessages}
        isParticipant={isMatchParticipant}
        isAuthenticated={Boolean(userProfile)}
        isAdmin={isAdmin}
        currentUserId={userProfile?.id ?? null}
        currentUserName={userProfile?.display_name ?? null}
        currentUserAvatarUrl={userProfile?.avatar_url ?? null}
      />
      <Footer />
    </main>
  )
}

async function getArchivedTournamentBracket(tournamentId: string | null) {
  if (!tournamentId) return null

  const archiveDetail = await getTournamentArchiveDetail(tournamentId)
  return archiveDetail?.bracket ?? null
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


function MatchRoomGuide({
  match,
  lang,
  t,
}: {
  match: MatchDetail
  lang: "uk" | "en"
  t: any
}) {
  const isUk = lang === "uk"
  const steps = buildMatchRoomSteps({ match, isUk, t })

  return (
    <section className="mt-6 rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(0,200,150,0.10),transparent_36%),rgba(255,255,255,0.025)] p-5 shadow-[0_0_46px_rgba(0,200,150,0.08)] md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/75">
            {isUk ? "Match room" : "Match room"}
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {isUk ? "Що робити перед і після матчу" : "What to do before and after the match"}
          </h2>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
          {formatStatus(match.status, t)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`rounded-xl border p-4 transition ${step.isActive ? "border-primary/40 bg-primary/10 shadow-[0_0_24px_rgba(0,200,150,0.10)]" : step.isDone ? "border-primary/20 bg-primary/[0.04]" : "border-white/10 bg-black/20 opacity-80"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary/75">
                {step.isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.isActive ? (
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                )}
                {step.label}
              </div>
              {step.isDone ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary/80">
                  {isUk ? "Готово" : "Done"}
                </span>
              ) : step.isActive ? (
                <span className="rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {isUk ? "Зараз" : "Now"}
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/35">
                  {isUk ? "Далі" : "Next"}
                </span>
              )}
            </div>
            <h3 className="mt-3 text-sm font-bold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/58">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SpectatorGuide({
  match,
  lang,
  t,
}: {
  match: MatchDetail
  lang: "uk" | "en"
  t: any
}) {
  const isUk = lang === "uk"
  const hasChannel = Boolean(match.broadcast?.url)
  const isFinished = match.status === "finished"
  const isLive = match.status === "live"

  const steps = [
    {
      id: "lineup",
      label: isUk ? "Учасники" : "Line-up",
      title: isUk ? "Дізнайся, хто грає" : "See who is playing",
      body: isUk
        ? "Переглянь обох учасників, раунд і сітку, щоб розуміти контекст матчу."
        : "Check both participants, the round, and the bracket to get the context.",
      isActive: match.status === "upcoming",
      isDone: isLive || isFinished,
    },
    {
      id: "watch",
      label: isUk ? "Перегляд" : "Watch",
      title: hasChannel
        ? (isUk ? "Дивись трансляцію" : "Watch the stream")
        : (isUk ? "Очікуй трансляцію" : "Wait for a stream"),
      body: hasChannel
        ? (isUk ? "Канал трансляції доступний нижче — відкрий його під час live." : "The broadcast channel is available below — open it during live.")
        : (isUk ? "Якщо трансляції ще немає, перевір Discord/анонси або зачекай на оновлення." : "If there is no stream yet, check Discord/announcements or wait for an update."),
      isActive: isLive,
      isDone: isFinished,
    },
    {
      id: "result",
      label: isUk ? "Результат" : "Result",
      title: isUk ? "Стеж за підсумком" : "Follow the result",
      body: isUk
        ? "Після матчу тут зʼявиться фінальний рахунок і переможець. Слідкуй за просуванням у сітці."
        : "After the match the final score and winner appear here. Follow the bracket progression.",
      isActive: isFinished,
      isDone: isFinished,
    },
  ]

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(0,200,150,0.06),transparent_36%),rgba(255,255,255,0.02)] p-5 shadow-[0_0_36px_rgba(0,200,150,0.05)] md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/70">
            {isUk ? "Для глядачів" : "For spectators"}
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {isUk ? "Як стежити за матчем" : "How to follow the match"}
          </h2>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
          {formatStatus(match.status, t)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`rounded-xl border p-4 transition ${step.isActive ? "border-primary/40 bg-primary/10 shadow-[0_0_24px_rgba(0,200,150,0.10)]" : step.isDone ? "border-primary/20 bg-primary/[0.04]" : "border-white/10 bg-black/20 opacity-80"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary/75">
                {step.isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.isActive ? (
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                )}
                {step.label}
              </div>
              {step.isDone ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary/80">
                  {isUk ? "Готово" : "Done"}
                </span>
              ) : step.isActive ? (
                <span className="rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {isUk ? "Зараз" : "Now"}
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/35">
                  {isUk ? "Далі" : "Next"}
                </span>
              )}
            </div>
            <h3 className="mt-3 text-sm font-bold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/58">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function buildMatchRoomSteps({
  match,
  isUk,
  t,
}: {
  match: MatchDetail
  isUk: boolean
  t: any
}) {
  const hasChannel = Boolean(match.broadcast?.url)
  const isFinished = match.status === "finished"
  const isLive = match.status === "live"
  const hasDispute = match.disputeStatus !== "none"

  return [
    {
      id: "prepare",
      label: isUk ? "Підготовка" : "Prepare",
      title: isUk ? "Перевір час і суперника" : "Check time and opponent",
      body: isUk
        ? "Перед стартом звір розклад, раунд і учасників. Якщо дані неповні — орієнтуйся на оновлення адміна."
        : "Before start, confirm schedule, round, and participants. If data is incomplete, wait for admin updates.",
      isActive: match.status === "upcoming",
      isDone: isLive || isFinished,
    },
    {
      id: "play",
      label: isUk ? "Матч" : "Match",
      title: hasChannel
        ? (isUk ? "Зайди в канал матчу" : "Join the match channel")
        : (isUk ? "Чекай канал або стрім" : "Wait for channel or stream"),
      body: hasChannel
        ? (isUk ? "Канал уже доданий у блок нижче — відкрий його перед стартом або під час live." : "The channel is available below — open it before start or while live.")
        : (isUk ? "Якщо канал ще не доданий, перевір Discord/анонси або дочекайся оновлення від адміна." : "If no channel is set yet, check Discord/announcements or wait for admin update."),
      isActive: isLive,
      isDone: isFinished,
    },
    {
      id: "resolve",
      label: isUk ? "Після гри" : "After match",
      title: hasDispute
        ? (isUk ? "Спір уже зафіксовано" : "Dispute is recorded")
        : (isUk ? "Перевір результат" : "Verify the result"),
      body: hasDispute
        ? `${isUk ? "Поточний статус" : "Current status"}: ${formatDisputeStatus(match.disputeStatus, t)}.`
        : (isUk ? "Якщо результат неправильний або була проблема — створи dispute у блоці праворуч." : "If the result is wrong or there was an issue, submit a dispute in the panel on the right."),
      isActive: isFinished && !hasDispute,
      isDone: hasDispute,
    },
  ]
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
  const nextMatchLabel =
    match.nextMatchLabel ??
    (match.bracketId && !match.nextMatchId ? t.matchPage.noNextMatchFinal : null)

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
    [t.matchPage.nextMatch, nextMatchLabel],
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

function DisputeSection({
  match,
  lang,
  t,
}: {
  match: MatchDetail
  lang: "uk" | "en"
  t: any
}) {
  const isUk = lang === "uk"
  const hasActiveDispute = match.disputeStatus === "open" || match.disputeStatus === "under_review"

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-foreground">{t.matchPage.disputeStatus}</h2>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-sm text-white/70">
        <Flag className="h-4 w-4 text-primary" />
        {formatDisputeStatus(match.disputeStatus, t)}
      </div>

      {hasActiveDispute ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-6 text-primary">
          {t.schedule.disputePrefix} {formatDisputeStatus(match.disputeStatus, t)}.
        </div>
      ) : (
        <details className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-white/75">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              {t.schedule.reportDispute}
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-primary/70">
              {t.schedule.matchIssue}
            </span>
          </summary>
          <p className="mt-3 text-xs leading-5 text-white/48">
            {isUk
              ? "Цю форму можуть відправити тільки підтверджені учасники матчу. Адмін побачить матч, репортера, причину та evidence link."
              : "Only confirmed participants can submit this form. Admins will see the match, reporter, reason, and evidence link."}
          </p>
          <form action={submitMatchDispute} className="mt-4 grid gap-3">
            <input type="hidden" name="match_id" value={match.id} />
            <label className="grid gap-2 text-sm text-white/70">
              <span>{t.schedule.type}</span>
              <select name="dispute_type" className={disputeInputClassName} defaultValue="wrong_result">
                <option value="no_show">{t.schedule.types.no_show}</option>
                <option value="wrong_result">{t.schedule.types.wrong_result}</option>
                <option value="cheating">{t.schedule.types.cheating}</option>
                <option value="connection_issue">{t.schedule.types.connection_issue}</option>
                <option value="rule_violation">{t.schedule.types.rule_violation}</option>
                <option value="other">{t.schedule.types.other}</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              <span>{t.schedule.disputeTitle}</span>
              <input name="title" required className={disputeInputClassName} placeholder={t.schedule.titlePlaceholder} />
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              <span>{t.schedule.description}</span>
              <textarea name="description" required rows={3} className={disputeInputClassName} placeholder={t.schedule.descriptionPlaceholder} />
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              <span>{t.schedule.evidenceLink}</span>
              <input name="evidence_url" type="url" className={disputeInputClassName} placeholder="https://..." />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-primary/90 cursor-pointer"
            >
              {t.schedule.submitDispute}
            </button>
          </form>
        </details>
      )}
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
    (participant) => isWinnerParticipant(match, participant),
  )
}

function isWinnerParticipant(
  match: MatchDetail,
  participant: MatchDetail["participants"][number],
) {
  return Boolean(
    match.winnerParticipantId &&
      participant.id &&
      participant.id === match.winnerParticipantId,
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

const disputeInputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-white outline-none transition focus:border-primary/60"
