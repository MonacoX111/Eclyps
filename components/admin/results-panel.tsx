import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminResult } from "@/lib/admin/results"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { createTournamentNameMap, getPlayerNames, getTeamNames } from "@/lib/admin/view-helpers"
import { createResult, deleteResult, updateResult } from "@/app/admin/actions"
import { ResultParticipantFields } from "@/components/admin-participant-fields"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, SubmitButton, TournamentSelect } from "@/components/admin/admin-form-fields"

export function ResultsPanel({
  results,
  tournaments,
  teams,
  players,
  fetchError,
  feedback,
}: {
  results: AdminResult[]
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
      id="results"
      title="Results"
      description="Create, update, and remove result rows. Team values are stored as text."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="results"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create result</h3>
          <ResultForm
            action={createResult}
            submitLabel="Create result"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
          />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing results</h3>
          {results.length === 0 ? (
            <AdminEmptyState>No results exist in Supabase yet.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {results.map((result) => (
                <ResultRecord
                  key={result.id}
                  result={result}
                  tournaments={tournaments}
                  teamNames={teamNames}
                  playerNames={playerNames}
                  tournamentName={
                    result.tournament_id
                      ? tournamentNames.get(result.tournament_id) ?? "Unknown tournament"
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

function ResultRecord({
  result,
  tournaments,
  teamNames,
  playerNames,
  tournamentName,
}: {
  result: AdminResult
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
            <h4 className="break-words font-medium">{result.team ?? "Untitled result"}</h4>
            <p className="mt-1 break-words text-sm text-white/55">{tournamentName}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>Placement {result.placement ?? "???"}</span>
            {result.label && <span className={pillClassName}>{result.label}</span>}
          </div>
        </div>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <ResultForm
            action={updateResult}
            submitLabel="Save changes"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
            result={result}
          />
          <DeleteForm action={deleteResult} id={result.id} />
        </div>
      </div>
    </details>
  )
}

function ResultForm({
  action,
  submitLabel,
  tournaments,
  teamNames,
  playerNames,
  result,
}: {
  action: AdminFormAction
  submitLabel: string
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  result?: AdminResult
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {result && <input type="hidden" name="id" value={result.id} />}
      <TournamentSelect tournaments={tournaments} value={result?.tournament_id} />
      <ResultParticipantFields
        initialType={result?.participant_type}
        teamNames={teamNames}
        playerNames={playerNames}
        team={result?.team}
      />
      <AdminField label="Placement">
        <input name="placement" type="number" min={1} step={1} defaultValue={result?.placement ?? ""} required className={inputClassName} />
      </AdminField>
      <AdminField label="Label">
        <input name="label" defaultValue={result?.label ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="MVP">
        <input name="mvp" defaultValue={result?.mvp ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Scoreline">
        <input name="scoreline" defaultValue={result?.scoreline ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Note">
        <input name="note" defaultValue={result?.note ?? ""} className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}
