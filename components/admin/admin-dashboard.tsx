import { logoutAdmin } from "@/app/admin/actions"
import { ActiveTournamentPanel } from "@/components/admin/active-tournament-panel"
import { MatchesPanel } from "@/components/admin/matches-panel"
import { DisputesPanel } from "@/components/admin/disputes-panel"
import { PlayerApplicationsPanel } from "@/components/admin/player-applications-panel"
import { PlayersPanel } from "@/components/admin/players-panel"
import { ParticipantsPanel } from "@/components/admin/participants-panel"
import { NewsPanel } from "@/components/admin/news-panel"
import { RegistrationsPanel } from "@/components/admin/registrations-panel"
import { ResultsPanel } from "@/components/admin/results-panel"
import { TeamsPanel } from "@/components/admin/teams-panel"
import { TournamentsPanel } from "@/components/admin/tournaments-panel"
import { TeamNameDatalist } from "@/components/admin/admin-form-fields"
import {
  getActiveTournamentFeedback,
  getDisputeFeedback,
  getMatchFeedback,
  getNewsFeedback,
  getPlayerApplicationFeedback,
  getPlayerFeedback,
  getParticipantFeedback,
  getRegistrationFeedback,
  getResultFeedback,
  getTeamFeedback,
  getTournamentFeedback,
} from "@/lib/admin/feedback"
import { getAdminMatches } from "@/lib/admin/matches"
import { getAdminNewsPosts } from "@/lib/admin/news"
import { getAdminDisputes } from "@/lib/admin/disputes"
import { getAdminParticipants } from "@/lib/admin/participants"
import { getAdminPlayerApplications } from "@/lib/admin/player-applications"
import { getAdminPlayers } from "@/lib/admin/players"
import { getAdminRegistrations } from "@/lib/admin/registrations"
import { getAdminResults } from "@/lib/admin/results"
import { getAdminTeams } from "@/lib/admin/teams"
import { getAdminTournaments } from "@/lib/admin/tournaments"
import type { AdminSearchParams } from "@/lib/admin/types"
import { getPlayerNames, getTeamNames } from "@/lib/admin/view-helpers"

const adminSections = [
  {
    id: "tournaments",
    title: "Tournaments",
    description: "Tournament management will be added in 14/30.",
  },
  {
    id: "teams",
    title: "Teams",
    description: "Team management is active in 15/30.",
  },
  {
    id: "players",
    title: "Players",
    description: "Player management is active.",
  },
  {
    id: "participants",
    title: "Participants",
    description: "Tournament participant management is active.",
  },
  {
    id: "player-applications",
    title: "Player Applications",
    description: "Approve Discord users into the Eclyps player pool.",
  },
  {
    id: "matches",
    title: "Matches / Results",
    description: "Matches and results management is active in 16/30.",
  },
  {
    id: "registrations",
    title: "Registrations",
    description: "Approve or reject public tournament signups.",
  },
  {
    id: "disputes",
    title: "Disputes",
    description: "Review match reports from eligible players and captains.",
  },
  {
    id: "active-tournament",
    title: "Active Tournament",
    description: "Choose which tournament appears on the public homepage.",
  },
  {
    id: "news",
    title: "News",
    description: "Manage public Eclyps announcements and articles.",
  },
] as const

export async function AdminDashboard({
  searchParams,
}: {
  searchParams?: AdminSearchParams
}) {
  const [
    { tournaments, error: tournamentError },
    { teams, error: teamError },
    { players, error: playerError },
    { applications, error: playerApplicationError },
    { participants, error: participantError },
    { registrations, error: registrationError },
    { disputes, error: disputeError },
    { matches, error: matchError },
    { results, error: resultError },
    { posts: newsPosts, error: newsError },
  ] = await Promise.all([
    getAdminTournaments(),
    getAdminTeams(),
    getAdminPlayers(),
    getAdminPlayerApplications(),
    getAdminParticipants(),
    getAdminRegistrations(),
    getAdminDisputes(),
    getAdminMatches(),
    getAdminResults(),
    getAdminNewsPosts(),
  ])
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <TeamNameDatalist teamNames={teamNames} />
      <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-300/80">
              Eclyps Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Authentication is active. This dashboard is the admin foundation for
              upcoming tournament, team, match, result, and active tournament
              management features.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white"
            >
              {"\u2190"} Back to site
            </a>

            <form action={logoutAdmin}>
              <button
                type="submit"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        <nav
          aria-label="Admin sections"
          className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4"
        >
          {adminSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-emerald-300/40 hover:text-white"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </header>

      <TournamentsPanel
        tournaments={tournaments}
        fetchError={tournamentError}
        feedback={getTournamentFeedback(searchParams)}
      />

      <TeamsPanel
        teams={teams}
        tournaments={tournaments}
        fetchError={teamError}
        feedback={getTeamFeedback(searchParams)}
      />

      <PlayersPanel
        players={players}
        tournaments={tournaments}
        fetchError={playerError}
        feedback={getPlayerFeedback(searchParams)}
      />

      <ParticipantsPanel
        participants={participants}
        tournaments={tournaments}
        players={players}
        teams={teams}
        fetchError={participantError}
        feedback={getParticipantFeedback(searchParams)}
      />

      <PlayerApplicationsPanel
        applications={applications}
        fetchError={playerApplicationError}
        feedback={getPlayerApplicationFeedback(searchParams)}
      />

      <RegistrationsPanel
        registrations={registrations}
        tournaments={tournaments}
        fetchError={registrationError}
        feedback={getRegistrationFeedback(searchParams)}
        filter={searchParams?.registrationFilter}
      />

      <DisputesPanel
        disputes={disputes}
        fetchError={disputeError}
        feedback={getDisputeFeedback(searchParams)}
      />

      <MatchesPanel
        matches={matches}
        tournaments={tournaments}
        teams={teams}
        players={players}
        participants={participants}
        fetchError={matchError ?? participantError}
        feedback={getMatchFeedback(searchParams)}
      />

      <ResultsPanel
        results={results}
        tournaments={tournaments}
        teams={teams}
        players={players}
        fetchError={resultError}
        feedback={getResultFeedback(searchParams)}
      />

      <ActiveTournamentPanel
        tournaments={tournaments}
        fetchError={tournamentError}
        feedback={getActiveTournamentFeedback(searchParams)}
      />

      <NewsPanel
        posts={newsPosts}
        fetchError={newsError}
        feedback={getNewsFeedback(searchParams)}
      />
    </div>
  )
}
