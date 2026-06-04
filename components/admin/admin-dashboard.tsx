import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client"
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
import { getLanguage } from "@/lib/i18n/server"
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

export async function AdminDashboard({
  searchParams,
}: {
  searchParams?: AdminSearchParams
}) {
  const [
    lang,
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
    getLanguage(),
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

  // Collect feedbacks into an object
  const feedbacks = {
    tournament: getTournamentFeedback(searchParams, lang),
    team: getTeamFeedback(searchParams, lang),
    player: getPlayerFeedback(searchParams, lang),
    participant: getParticipantFeedback(searchParams, lang),
    playerApplication: getPlayerApplicationFeedback(searchParams, lang),
    registration: getRegistrationFeedback(searchParams, lang),
    dispute: getDisputeFeedback(searchParams, lang),
    match: getMatchFeedback(searchParams, lang),
    result: getResultFeedback(searchParams, lang),
    activeTournament: getActiveTournamentFeedback(searchParams, lang),
    news: getNewsFeedback(searchParams, lang),
  }

  return (
    <AdminDashboardClient
      tournaments={tournaments || []}
      teams={teams || []}
      players={players || []}
      applications={applications || []}
      participants={participants || []}
      registrations={registrations || []}
      disputes={disputes || []}
      matches={matches || []}
      results={results || []}
      newsPosts={newsPosts || []}
      searchParams={searchParams}
      feedbacks={feedbacks}
    />
  )
}
