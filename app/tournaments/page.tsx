import Link from "next/link"
import type { Metadata } from "next"
import { Archive, CalendarDays, Search, SlidersHorizontal, Trophy, Users } from "lucide-react"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { ListEmptyState } from "@/components/list-empty-state"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import {
  getTournamentArchiveList,
  type ArchiveTournament,
} from "@/lib/data/tournament-archive"
import { formatShortEventDate } from "@/lib/date-format"
import { getLanguage, getTranslations } from "@/lib/i18n/server"
import { createPageMetadata } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const [archive, t] = await Promise.all([
    getTournamentArchiveList({}),
    getTranslations(),
  ])
  const image = archive.tournaments.find((tournament) => tournament.bannerUrl)?.bannerUrl

  return createPageMetadata({
    title: `${t.tournamentArchive.historyTitle} | Eclyps`,
    description: t.tournamentArchive.description,
    path: "/tournaments",
    image,
    imageAlt: t.tournamentArchive.historyTitle,
  })
}

type TournamentsPageProps = {
  searchParams?: Promise<{
    q?: string
    game?: string
    status?: string
  }>
}

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const filters = await searchParams
  const [archive, userProfile, t, lang] = await Promise.all([
    getTournamentArchiveList(filters),
    getCurrentUserProfile(),
    getTranslations(),
    getLanguage(),
  ])

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Navbar userProfile={userProfile} />

        <section className="relative z-10 px-4 py-10 md:py-14">
          <div className="mx-auto max-w-6xl">
          <div className="glass-card relative overflow-hidden rounded-2xl p-5 md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.18_165_/_0.10),transparent_38%)]" />
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  {t.tournamentArchive.tournamentArchive}
                </p>
                <h1 className="mt-3 break-words text-3xl font-black text-foreground md:text-5xl">
                  {t.tournamentArchive.historyTitle}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
                  {t.tournamentArchive.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/tournament" className={secondaryLinkClassName}>
                  {t.tournamentArchive.backToTournament}
                </Link>
                <Link href="/matches?tab=finished" className={secondaryLinkClassName}>
                  {t.tournamentArchive.backToResults}
                </Link>
              </div>
            </div>
          </div>

          <ArchiveFilters
            t={t}
            filters={filters ?? {}}
            games={archive.games}
            statuses={archive.statuses}
          />

          {archive.tournaments.length === 0 ? (
            <ListEmptyState variant="tournaments" className="mt-10" />
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {archive.tournaments.map((tournament) => (
                <TournamentArchiveCard
                  key={tournament.id}
                  tournament={tournament}
                  lang={lang}
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

function ArchiveFilters({
  t,
  filters,
  games,
  statuses,
}: {
  t: any
  filters: { q?: string; game?: string; status?: string }
  games: string[]
  statuses: string[]
}) {
  return (
    <form className="glass-card mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
      <label className={filterLabelClassName}>
        <span className="inline-flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          {t.tournamentArchive.search}
        </span>
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder={t.tournamentArchive.search}
          className={filterInputClassName}
        />
      </label>

      <label className={filterLabelClassName}>
        <span>{t.tournamentArchive.filterByGame}</span>
        <select name="game" defaultValue={filters.game ?? ""} className={filterInputClassName}>
          <option value="">{t.admin.extra.all}</option>
          {games.map((game) => (
            <option key={game} value={game}>
              {game}
            </option>
          ))}
        </select>
      </label>

      <label className={filterLabelClassName}>
        <span>{t.tournamentArchive.filterByStatus}</span>
        <select name="status" defaultValue={filters.status ?? ""} className={filterInputClassName}>
          <option value="">{t.admin.extra.all}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {formatTournamentStatus(status, t)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black transition hover:bg-primary/90 md:self-end"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {t.tournamentArchive.applyFilters}
      </button>
    </form>
  )
}

function TournamentArchiveCard({
  tournament,
  lang,
  t,
}: {
  tournament: ArchiveTournament
  lang: "uk" | "en"
  t: any
}) {
  return (
    <article className="glass-card relative overflow-hidden rounded-2xl p-0 transition hover:border-primary/30">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      {tournament.bannerUrl ? (
        <div
          className="h-36 bg-cover bg-center sm:h-44"
          style={{ backgroundImage: `url("${tournament.bannerUrl}")` }}
          aria-hidden="true"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {tournament.game ?? t.tournamentArchive.game}
            </p>
            <h2 className="mt-2 break-words text-2xl font-black text-foreground">
              {tournament.name}
            </h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
            {formatTournamentStatus(tournament.status, t)}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetaPill icon={CalendarDays} label={t.tournamentArchive.date} value={formatShortEventDate(tournament.eventDate ?? tournament.createdAt, lang)} />
          <MetaPill icon={Users} label={t.tournamentArchive.participants} value={String(tournament.participantCount)} />
          <MetaPill icon={Trophy} label={t.tournamentArchive.winner} value={tournament.winner ?? t.tournamentArchive.tbd} />
          <MetaPill icon={Archive} label={t.tournamentArchive.results} value={tournament.resultSummary ?? t.tournamentArchive.finalStandingsUnavailable} />
        </div>

        <Link
          href={`/tournaments/${tournament.id}`}
          className="mt-1 inline-flex w-fit items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-black transition hover:bg-primary/90"
        >
          {t.tournamentArchive.viewTournament}
        </Link>
      </div>
    </article>
  )
}

function MetaPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Archive
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="inline-flex max-w-full items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-2 min-w-0 break-words text-sm font-semibold text-white/80">
        {value}
      </p>
    </div>
  )
}

function formatTournamentStatus(status: string, t: any) {
  if (status === "archived") return t.tournamentArchive.archived
  if (status === "cancelled") return t.tournamentArchive.cancelled
  return t.tournamentArchive.finished
}

const filterLabelClassName = "grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45"
const filterInputClassName =
  "min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none transition focus:border-primary/60"
const secondaryLinkClassName =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-primary/40 hover:text-primary"
