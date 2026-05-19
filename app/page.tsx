import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { TournamentInfo } from "@/components/tournament-info"
import { TeamsGrid, type TeamCard } from "@/components/teams-grid"
import { MatchSchedule, type MatchScheduleItem } from "@/components/match-schedule"
import { Results, type ResultCard } from "@/components/results"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getActiveTournament, type ActiveTournament } from "@/lib/data/tournaments"
import { getTeamsForActiveTournament, type TournamentTeam } from "@/lib/data/teams"
import { getPlayersForActiveTournament, type TournamentPlayer } from "@/lib/data/players"
import { getMatchesForActiveTournament, type TournamentMatch } from "@/lib/data/matches"
import { getResultsForActiveTournament, type TournamentResult } from "@/lib/data/results"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={<Navbar />}>
          <ActiveNavbar />
        </Suspense>
        <Suspense fallback={<TournamentBlocksLoading />}>
          <ActiveTournamentBlocks />
        </Suspense>

        <Suspense fallback={<CardsLoading />}>
          <ActiveTournamentTeams />
        </Suspense>

        <div
          className="mx-auto h-px max-w-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
          }}
        />

        <Suspense fallback={<ScheduleLoading />}>
          <ActiveTournamentMatches />
        </Suspense>

        <div
          className="mx-auto h-px max-w-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
          }}
        />

        <Suspense fallback={<ResultsLoading />}>
          <ActiveTournamentResults />
        </Suspense>
      </MotionProvider>
      <Footer />
    </main>
  )
}

async function ActiveTournamentBlocks() {
  const [tournament, matches, results, players] = await Promise.all([
    getActiveTournament(),
    getMatchesForActiveTournament(),
    getResultsForActiveTournament(),
    getPlayersForActiveTournament(),
  ])
  if (!tournament) return <TournamentUnavailable />

  const participantType = getParticipantType(matches, results)
  const tournamentView = getTournamentView(tournament, participantType, players.length)

  return <TournamentBlocks {...tournamentView} />
}

async function ActiveNavbar() {
  const [matches, results] = await Promise.all([
    getMatchesForActiveTournament(),
    getResultsForActiveTournament(),
  ])
  const participantType = getParticipantType(matches, results)

  return <Navbar participantLabel={participantType === "player" ? "Players" : "Teams"} />
}

async function ActiveTournamentTeams() {
  const [teams, players, matches, results] = await Promise.all([
    getTeamsForActiveTournament(),
    getPlayersForActiveTournament(),
    getMatchesForActiveTournament(),
    getResultsForActiveTournament(),
  ])
  const participantType = getParticipantType(matches, results)
  return participantType === "player"
    ? <TeamsGrid teams={getPlayerCards(players)} participantLabel="Players" />
    : <TeamsGrid teams={getTeamCards(teams)} participantLabel="Teams" />
}

async function ActiveTournamentMatches() {
  const matches = await getMatchesForActiveTournament()

  return <MatchSchedule matches={getMatchScheduleItems(matches)} />
}

async function ActiveTournamentResults() {
  const [tournament, results] = await Promise.all([
    getActiveTournament(),
    getResultsForActiveTournament(),
  ])

  return <Results results={getResultCards(results, tournament)} />
}

type TournamentBlocksProps = {
  heroName?: string
  sectionName?: string
  date?: string
  game?: string
  format?: string
  teamCount?: string
  status?: string
  prizePool?: string
  matchDays?: string
  arenaTitle?: string
  arenaDescription?: string
  arenaTags?: string[]
  participantLabel?: "Teams" | "Players"
}

function TournamentBlocks({
  heroName,
  sectionName,
  date,
  game,
  format,
  teamCount,
  status,
  prizePool,
  matchDays,
  arenaTitle,
  arenaDescription,
  arenaTags,
  participantLabel,
}: TournamentBlocksProps = {}) {
  return (
    <>
      <HeroSection
        tournamentName={heroName}
        tournamentDate={date}
        registrationStatus={status}
      />

      {/* Divider glow line */}
      <div
        className="mx-auto h-px max-w-xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
        }}
      />

      <TournamentInfo
        tournamentName={sectionName}
        prizePool={prizePool}
        teamCount={teamCount}
        matchDays={matchDays}
        format={format}
        game={game}
        arenaTitle={arenaTitle}
        arenaDescription={arenaDescription}
        arenaTags={arenaTags}
        participantLabel={participantLabel}
      />

      <div
        className="mx-auto h-px max-w-xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
        }}
      />
    </>
  )
}

function TournamentBlocksLoading() {
  return (
    <>
      <section className="relative flex min-h-screen items-center justify-center px-4 py-20">
        <div className="h-56 w-56 animate-pulse rounded-full bg-white/[0.04] md:h-72 md:w-72 lg:h-80 lg:w-80" />
      </section>
      <div className="mx-auto h-px max-w-xl bg-white/10" />
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
          <div className="mt-16 flex flex-wrap justify-center gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="glass-card h-32 w-[calc((100%-1rem)/2)] animate-pulse rounded-xl md:w-[calc((100%-3rem)/4)]"
              />
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto h-px max-w-xl bg-white/10" />
    </>
  )
}

function TournamentUnavailable() {
  return (
    <>
      <section className="relative flex min-h-screen items-center justify-center px-4 py-20 text-center">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
            Upcoming Event
          </p>
          <p className="text-sm text-muted-foreground">
            Tournament details are not available right now.
          </p>
        </div>
      </section>
      <div className="mx-auto h-px max-w-xl bg-white/10" />
    </>
  )
}

function CardsLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="flex flex-wrap justify-center gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="glass-card h-48 w-full animate-pulse rounded-xl sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function ScheduleLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="glass-card h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  )
}

function ResultsLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="glass-card h-56 animate-pulse rounded-2xl" />
      </div>
    </section>
  )
}

function getTournamentView(
  tournament: ActiveTournament | null,
  participantType: "team" | "player",
  playerCount: number,
): TournamentBlocksProps {
  if (!tournament) return {}

  return {
    heroName: readString(tournament.name, tournament.title),
    sectionName: readString(tournament.name, tournament.display_name, tournament.title),
    date: formatTournamentDate(readString(tournament.event_date)),
    game: readString(tournament.game),
    format: readString(tournament.format),
    teamCount:
      participantType === "player"
        ? String(playerCount || readNumberString(tournament.team_count) || "0")
        : readNumberString(tournament.team_count),
    status: formatStatus(readString(tournament.status)),
    prizePool: formatPrizePool(tournament.prize_pool),
    matchDays: readNumberString(tournament.match_days),
    arenaTitle: readString(tournament.arena_title),
    arenaDescription: readString(tournament.arena_description),
    arenaTags: readStringArray(tournament.arena_tags),
    participantLabel: participantType === "player" ? "Players" : "Teams",
  }
}

function readString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)
}

function readNumberString(...values: unknown[]) {
  const value = values.find(
    (candidate): candidate is number | string =>
      typeof candidate === "number" ||
      (typeof candidate === "string" && candidate.trim().length > 0),
  )

  return value === undefined ? undefined : String(value)
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined

  const tags = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  )

  return tags.length > 0 ? tags : undefined
}

function formatStatus(status?: string) {
  if (!status) return undefined

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPrizePool(value: unknown) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return readString(value)
}

function formatTournamentDate(start?: string, end?: string) {
  if (!start) return undefined

  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return start

  const formattedStart = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(startDate)

  if (!end) return formattedStart

  const endDate = new Date(end)
  if (Number.isNaN(endDate.getTime())) return formattedStart

  const formattedEnd = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(endDate)

  return formattedStart === formattedEnd
    ? formattedStart
    : `${formattedStart} - ${formattedEnd}`
}

function getTeamCards(teams: TournamentTeam[]): TeamCard[] {
  return teams.map((team, index) => {
    return {
      id: team.id,
      name: team.name,
      tag: createTeamTag(team.name),
      wins: team.wins ?? 0,
      losses: team.losses ?? 0,
      rank: team.seed ?? index + 1,
    }
  })
}

function getPlayerCards(players: TournamentPlayer[]): TeamCard[] {
  return players.map((player, index) => ({
    id: player.id,
    name: player.name,
    tag: player.nickname || createTeamTag(player.name),
    wins: player.wins ?? 0,
    losses: player.losses ?? 0,
    rank: player.seed ?? index + 1,
  }))
}

function getParticipantType(
  matches: TournamentMatch[],
  results: TournamentResult[],
): "team" | "player" {
  return matches.some((match) => match.participant_type === "player") ||
    results.some((result) => result.participant_type === "player")
    ? "player"
    : "team"
}

function createTeamTag(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase()
}

function getMatchScheduleItems(matches: TournamentMatch[]): MatchScheduleItem[] {
  return matches
    .filter(
      (match): match is TournamentMatch & { team1: string; team2: string } =>
        Boolean(match.team1 && match.team2),
    )
    .map((match) => ({
      id: match.id,
      round: formatRoundLabel(match.round),
      teamA: match.team1,
      teamB: match.team2,
      time: null,
      status: normalizeMatchStatus(match.status),
      score1: match.score1,
      score2: match.score2,
    }))
}

function formatRoundLabel(round: string | null) {
  if (!round) return "Matches"

  const normalized = round.toLowerCase()

  if (normalized === "quarterfinal") return "Quarterfinals"
  if (normalized === "semifinal") return "Semifinals"
  if (normalized === "final" || normalized === "grand final") return "Grand Final"

  return round
}

function normalizeMatchStatus(status?: string | null): MatchScheduleItem["status"] {
  if (status === "live" || status === "finished") return status

  return "upcoming"
}

function getResultCards(
  results: TournamentResult[],
  tournament: ActiveTournament | null,
): ResultCard[] {
  if (results.length === 0) {
    return []
  }

  const placements = results
    .filter(
      (result): result is TournamentResult & { placement: 1 | 2 | 3; team: string } =>
        (result.placement === 1 ||
          result.placement === 2 ||
          result.placement === 3) &&
        Boolean(result.team),
    )
    .map((result) => ({
      placement: result.placement,
      team: result.team,
    }))

  if (placements.length === 0) return []

  const season = readString(tournament?.name)
  if (!season) return []

  return [
    {
      season,
      placements,
      mvp: readString(results.find((result) => result.placement === 1)?.mvp),
      date: formatResultsDate(readString(tournament?.event_date)),
    },
  ]
}

function formatResultsDate(eventDate?: string) {
  if (!eventDate) return undefined

  const date = new Date(eventDate)
  if (Number.isNaN(date.getTime())) return eventDate

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date)
}
