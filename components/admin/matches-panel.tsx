import type { AdminMatch } from "@/lib/admin/matches"
import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { formatStatus } from "@/lib/admin/formatters"
import { createTournamentNameMap, getPlayerNames, getTeamNames } from "@/lib/admin/view-helpers"
import { getWinnerSelectionFromParticipantId } from "@/lib/matches/core"
import { createMatch, deleteMatch, updateMatch } from "@/app/admin/actions"
import { MatchParticipantFields } from "@/components/admin-participant-fields"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, StatusSelect, SubmitButton, TournamentSelect } from "@/components/admin/admin-form-fields"

export function MatchesPanel({
  matches,
  tournaments,
  teams,
  players,
  fetchError,
  feedback,
}: {
  matches: AdminMatch[]
  tournaments: AdminTournament[]
  teams: AdminTeam[]
  players: AdminPlayer[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const tournamentNames = createTournamentNameMap(tournaments)
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)

  return (
    <AdminSection
      id="matches"
      title="Matches"
      description="Create, update, and remove matches. Team values are stored as text."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="matches"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create match</h3>
          <MatchForm
            action={createMatch}
            submitLabel="Create match"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
          />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing matches</h3>
          {matches.length === 0 ? (
            <AdminEmptyState>No matches exist in Supabase yet.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {matches.map((match) => (
                <MatchRecord
                  key={match.id}
                  match={match}
                  tournaments={tournaments}
                  teamNames={teamNames}
                  playerNames={playerNames}
                  tournamentName={
                    match.tournament_id
                      ? tournamentNames.get(match.tournament_id) ?? "Unknown tournament"
                      : "Unassigned"
                  }
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function MatchRecord({
  match,
  tournaments,
  teamNames,
  playerNames,
  tournamentName,
}: {
  match: AdminMatch
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  tournamentName: string
}) {
  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">
              {match.team1 ?? "TBD"} vs {match.team2 ?? "TBD"}
            </h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {tournamentName} ?? {match.round ?? "No round"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>{formatStatus(match.status)}</span>
            <span className={pillClassName}>
              {match.score1 ?? "???"} : {match.score2 ?? "???"}
            </span>
            <span className={pillClassName}>Order {match.match_order ?? "???"}</span>
          </div>
        </div>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <MatchForm
            action={updateMatch}
            submitLabel="Save changes"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
            match={match}
          />
          <DeleteForm action={deleteMatch} id={match.id} />
        </div>
      </div>
    </details>
  )
}

function MatchForm({
  action,
  submitLabel,
  tournaments,
  teamNames,
  playerNames,
  match,
}: {
  action: AdminFormAction
  submitLabel: string
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  match?: AdminMatch
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {match && <input type="hidden" name="id" value={match.id} />}
      <TournamentSelect tournaments={tournaments} value={match?.tournament_id} />
      <AdminField label="Round">
        <input name="round" defaultValue={match?.round ?? ""} className={inputClassName} />
      </AdminField>
      <MatchParticipantFields
        initialType={match?.participant_type}
        teamNames={teamNames}
        playerNames={playerNames}
        team1={match?.team1}
        team2={match?.team2}
      />
      <AdminField label="Score 1">
        <input name="score1" type="number" defaultValue={match?.score1 ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Score 2">
        <input name="score2" type="number" defaultValue={match?.score2 ?? ""} className={inputClassName} />
      </AdminField>
      <StatusSelect value={match?.status} />
      <WinnerSelect match={match} />
      <AdminField label="Match order">
        <input name="match_order" type="number" min={1} step={1} defaultValue={match?.match_order ?? ""} required className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}

function WinnerSelect({ match }: { match?: AdminMatch }) {
  return (
    <AdminField label="Winner">
      <select
        name="winner_selection"
        defaultValue={
          match
            ? getWinnerSelectionFromParticipantId({
                winnerParticipantId: match.winner_participant_id,
                participant1Id: match.participant_1_id,
                participant2Id: match.participant_2_id,
              })
            : ""
        }
        className={inputClassName}
      >
        <option value="">Auto / none</option>
        <option value="participant_1">{match?.team1 ?? "Participant 1"}</option>
        <option value="participant_2">{match?.team2 ?? "Participant 2"}</option>
      </select>
    </AdminField>
  )
}
