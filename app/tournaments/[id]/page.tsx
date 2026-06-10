import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarClock, Gamepad2, ListOrdered, Trophy, Users } from "lucide-react"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { PublicBracket } from "@/components/public-bracket"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import {
  getTournamentArchiveDetail,
  type ArchiveMatch,
  type ArchiveParticipant,
  type ArchiveResult,
} from "@/lib/data/tournament-archive"
import { formatShortEventDate } from "@/lib/date-format"
import { getLanguage, getTranslations } from "@/lib/i18n/server"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"

export const dynamic = "force-dynamic"

type TournamentDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { id } = await params
  const [data, userProfile, t, lang] = await Promise.all([
    getTournamentArchiveDetail(id),
    getCurrentUserProfile(),
    getTranslations(),
    getLanguage(),
  ])

  if (!data) notFound()

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Navbar
          participantLabel={data.tournament.participantType === "player" ? "Players" : "Teams"}
          userProfile={userProfile}
        />

        <section className="relative z-10 px-4 py-16 md:py-20">
          <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-3">
            <Link href="/tournaments" className={secondaryLinkClassName}>
              {t.tournamentArchive.backToArchive}
            </Link>
            <Link href="#bracket" className={secondaryLinkClassName}>
              {t.matchPage.openBracket}
            </Link>
            <Link href="#matches" className={secondaryLinkClassName}>
              {t.tournamentArchive.matchHistory}
            </Link>
          </div>

          <article id="overview" className="glass-card mt-6 scroll-mt-28 overflow-hidden rounded-2xl p-5 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  <span>{t.tournamentArchive.tournamentArchive}</span>
                  {data.tournament.game ? (
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 tracking-normal">
                      {data.tournament.game}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-4 break-words text-3xl font-black text-foreground md:text-5xl">
                  {data.tournament.name}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
                  {data.tournament.arenaDescription ?? data.tournament.resultSummary ?? t.tournamentArchive.finalStandings}
                </p>
              </div>
              <span className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75">
                {formatTournamentStatus(data.tournament.status, t)}
              </span>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <HeroStat icon={Gamepad2} label={t.tournamentArchive.game} value={data.tournament.game ?? t.tournamentArchive.tbd} />
              <HeroStat icon={CalendarClock} label={t.tournamentArchive.date} value={formatShortEventDate(data.tournament.eventDate ?? data.tournament.createdAt, lang)} />
              <HeroStat icon={Users} label={t.tournamentArchive.participants} value={String(data.tournament.participantCount)} />
              <HeroStat icon={Trophy} label={t.tournamentArchive.winner} value={data.tournament.winner ?? t.tournamentArchive.tbd} />
            </div>
          </article>

          <TournamentHubNav t={t} />

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <StandingsSection results={data.results} t={t} />
            <ParticipantsSection participants={data.participants} t={t} />
          </div>

          <section className="mt-6">
            <PublicBracket bracket={data.bracket} />
          </section>

          <MatchHistorySection matches={data.matches} t={t} />
          </div>
        </section>
      </MotionProvider>

      <Footer />
    </main>
  )
}

function TournamentHubNav({ t }: { t: any }) {
  const items = [
    { href: "#overview", label: t.tournamentArchive.overview },
    { href: "#participants", label: t.tournamentArchive.participants },
    { href: "#bracket", label: t.tournamentArchive.bracket },
    { href: "#matches", label: t.tournamentArchive.matchHistory },
    { href: "#results", label: t.tournamentArchive.results },
  ]

  return (
    <nav className="bracket-scroll mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-2">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold text-white/65 transition hover:bg-primary/10 hover:text-primary"
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </p>
      <p className="mt-2 min-w-0 break-words text-sm font-bold text-white/85">
        {value}
      </p>
    </div>
  )
}

function StandingsSection({ results, t }: { results: ArchiveResult[]; t: any }) {
  return (
    <section id="results" className="glass-card scroll-mt-28 rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-foreground">{t.tournamentArchive.finalStandings}</h2>
      {results.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">{t.tournamentArchive.finalStandingsUnavailable}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {results.map((result, index) => (
            <div
              key={result.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  #{result.placement ?? index + 1}
                </p>
                <p className="mt-1 break-words font-bold text-white/85">
                  {result.team ?? result.label ?? t.tournamentArchive.tbd}
                </p>
              </div>
              {result.scoreline ? (
                <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-sm text-primary">
                  {result.scoreline}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ParticipantsSection({
  participants,
  t,
}: {
  participants: ArchiveParticipant[]
  t: any
}) {
  return (
    <section id="participants" className="glass-card scroll-mt-28 rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-foreground">{t.tournamentArchive.participants}</h2>
      {participants.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">{t.tournamentArchive.tbd}</p>
      ) : (
        <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {participants.map((participant) => (
            <ParticipantRow key={participant.id} participant={participant} />
          ))}
        </div>
      )}
    </section>
  )
}

function ParticipantRow({ participant }: { participant: ArchiveParticipant }) {
  const href =
    participant.participantType === "team"
      ? participant.sourceTeamId
        ? `/teams/${participant.sourceTeamId}`
        : null
      : participant.sourcePlayerId
        ? `/players/${participant.sourcePlayerId}`
        : null
  const content = (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
        {participant.seed ?? participant.displayName.slice(0, 2).toUpperCase()}
      </span>
      <p className="min-w-0 break-words text-sm font-semibold text-white/80">
        {participant.displayName}
      </p>
    </div>
  )

  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {content}
    </Link>
  ) : (
    content
  )
}

function MatchHistorySection({ matches, t }: { matches: ArchiveMatch[]; t: any }) {
  const visibleMatches = matches.filter((match) => match.status === "finished")

  return (
    <section id="matches" className="glass-card mt-6 scroll-mt-28 rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-foreground">{t.tournamentArchive.matchHistory}</h2>
      {visibleMatches.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">{t.tournamentArchive.noMatchesFound}</p>
      ) : (
        <div className="mt-5 grid gap-3">
          {visibleMatches.map((match) => (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/35 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {match.bracketRound ?? match.round ?? t.tournamentArchive.matchHistory}
                </p>
                <p className="mt-2 break-words font-bold text-white/85">
                  {match.team1 ?? t.tournamentArchive.tbd} vs {match.team2 ?? t.tournamentArchive.tbd}
                </p>
                <p className="mt-1 text-sm text-white/45">
                  {formatMatchScheduleTime({
                    scheduledAt: match.scheduledAt,
                    timezone: match.timezone,
                    scheduleNote: match.scheduleNote,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 md:justify-end">
                <span className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 font-mono text-lg font-black text-primary">
                  {match.score1 ?? "-"}:{match.score2 ?? "-"}
                </span>
                <ListOrdered className="h-4 w-4 text-white/35" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function formatTournamentStatus(status: string, t: any) {
  if (status === "archived") return t.tournamentArchive.archived
  if (status === "cancelled") return t.tournamentArchive.cancelled
  return t.tournamentArchive.finished
}

const secondaryLinkClassName =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-primary/40 hover:text-primary"
