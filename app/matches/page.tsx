import Link from "next/link"
import { CalendarClock, ExternalLink, Radio, Trophy } from "lucide-react"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { ListEmptyState } from "@/components/list-empty-state"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData, type HomepageMatch } from "@/lib/data/homepage"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"
import { getTranslations } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

type MatchesPageProps = {
  searchParams?: Promise<{
    tab?: string
    disputeError?: string
    disputeSuccess?: string
  }>
}

type MatchTab = "all" | "upcoming" | "live" | "finished"

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const params = await searchParams
  const activeTab = normalizeTab(params?.tab)
  const [homepageData, userProfile, t] = await Promise.all([
    getHomepageData(),
    getCurrentUserProfile(),
    getTranslations(),
  ])
  const matches = filterMatches(homepageData.matches, activeTab)
  const feedback = getDisputeFeedback(params, t)

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Navbar
          participantLabel={homepageData.participantLabel}
          userProfile={userProfile}
        />

        <section className="relative z-10 px-4 py-10 md:py-14" id="matches">
          <div className="mx-auto max-w-6xl">
            <div className="glass-card relative overflow-hidden rounded-2xl p-5 md:p-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165_/_0.10),transparent_38%)]" />
              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  {t.matchesPage.eyebrow}
                </p>
                <h1 className="mt-3 break-words text-3xl font-black text-foreground md:text-5xl">
                  {t.matchesPage.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
                  {t.matchesPage.description}
                </p>
              </div>
            </div>

            <MatchTabs activeTab={activeTab} t={t} />

            {feedback ? (
              <div
                className={`glass-card mx-auto mt-6 max-w-xl rounded-xl px-4 py-3 text-center text-sm ${
                  feedback.tone === "success" ? "text-primary" : "text-red-100"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            {matches.length === 0 ? (
              <ListEmptyState variant={getMatchEmptyVariant(activeTab)} />
            ) : (
              <div className="mt-8 grid gap-4">
                {matches.map((match) => (
                  <UnifiedMatchCard
                    key={match.id}
                    match={match}
                    tournamentName={homepageData.tournament?.name ?? null}
                    tournamentGame={homepageData.tournament?.game ?? null}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </MotionProvider>
      <Footer />
    </main>
  )
}

function MatchTabs({ activeTab, t }: { activeTab: MatchTab; t: any }) {
  const tabs: Array<{ value: MatchTab; label: string }> = [
    { value: "all", label: t.matchesPage.tabs.all },
    { value: "upcoming", label: t.matchesPage.tabs.upcoming },
    { value: "live", label: t.matchesPage.tabs.live },
    { value: "finished", label: t.matchesPage.tabs.finished },
  ]

  return (
    <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-1">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/matches?tab=${tab.value}`}
            className={[
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              activeTab === tab.value
                ? "border-primary/50 bg-primary text-black"
                : "border-white/10 bg-black/25 text-white/65 hover:border-primary/40 hover:text-primary",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function UnifiedMatchCard({
  match,
  tournamentName,
  tournamentGame,
  t,
}: {
  match: HomepageMatch
  tournamentName: string | null
  tournamentGame: string | null
  t: any
}) {
  const leftName = match.team1 ?? t.matchPage.tbd
  const rightName = match.team2 ?? t.matchPage.tbd
  const winnerName = getWinnerName(match)
  const hasScore = match.score1 !== null && match.score2 !== null

  return (
    <article className="glass-card grid gap-4 rounded-2xl p-4 transition hover:border-primary/30 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {tournamentName ? (
            <span className="font-semibold uppercase tracking-[0.18em] text-primary">
              {tournamentName}
            </span>
          ) : null}
          {tournamentGame ? (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              {tournamentGame}
            </span>
          ) : null}
          <StatusBadge status={match.status} t={t} />
        </div>

        <h2 className="mt-3 break-words text-lg font-black leading-tight text-foreground sm:text-xl md:text-2xl">
          {leftName} <span className="text-primary/70">{t.schedule.vs}</span> {rightName}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/55">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            {formatMatchScheduleTime({
              scheduledAt: match.scheduled_at,
              timezone: match.timezone,
              scheduleNote: match.schedule_note,
            })}
          </span>
          <span>{match.bracket_round ?? match.round ?? t.matchPage.round}</span>
          {winnerName ? (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Trophy className="h-4 w-4" />
              {winnerName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto md:justify-end">
        <span className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-center font-mono text-xl font-black text-primary">
          {hasScore ? `${match.score1}:${match.score2}` : "-:-"}
        </span>
        <Link
          href={`/matches/${match.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-primary/40 hover:text-primary"
        >
          {t.matchPage.matchPage}
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

function StatusBadge({ status, t }: { status: HomepageMatch["status"]; t: any }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/65">
      {status === "live" ? <Radio className="h-3 w-3 text-primary" /> : null}
      {status === "finished"
        ? t.matchesPage.tabs.finished
        : status === "live"
          ? t.matchesPage.tabs.live
          : t.matchesPage.tabs.upcoming}
    </span>
  )
}

function filterMatches(matches: HomepageMatch[], tab: MatchTab) {
  if (tab === "all") return matches
  return matches.filter((match) => match.status === tab)
}

function normalizeTab(value: string | undefined): MatchTab {
  return value === "upcoming" || value === "live" || value === "finished"
    ? value
    : "all"
}

function getWinnerName(match: HomepageMatch) {
  if (!match.winner_participant_id) return null
  if (match.winner_participant_id === match.participant_1_id) return match.team1
  if (match.winner_participant_id === match.participant_2_id) return match.team2
  return null
}

function getMatchEmptyVariant(tab: MatchTab) {
  if (tab === "upcoming") return "matches-upcoming" as const
  if (tab === "live") return "matches-live" as const
  if (tab === "finished") return "matches-finished" as const
  return "matches-all" as const
}

function getDisputeFeedback(searchParams?: {
  disputeError?: string
  disputeSuccess?: string
}, t?: any) {
  if (searchParams?.disputeSuccess === "submitted") {
    return {
      tone: "success" as const,
      message: t?.matchesPage.disputeSubmitted,
    }
  }

  if (!searchParams?.disputeError) return null

  return {
    tone: "error" as const,
    message: t?.matchesPage.disputeFailed,
  }
}
