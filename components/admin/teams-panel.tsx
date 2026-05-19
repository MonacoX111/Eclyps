import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { createTeam, deleteTeam, updateTeam } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, SubmitButton, TournamentSelect } from "@/components/admin/admin-form-fields"

export function TeamsPanel({
  teams,
  tournaments,
  fetchError,
  feedback,
}: {
  teams: AdminTeam[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const tournamentNames = new Map(
    tournaments.map((tournament) => [tournament.id, tournament.name ?? "Untitled tournament"]),
  )

  return (
    <AdminSection
      id="teams"
      title="Teams"
      description="Create, update, and remove teams linked to tournaments in Supabase."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="teams"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create team</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Adds a real team row to <code>public.teams</code>.
          </p>

          <TeamForm action={createTeam} submitLabel="Create team" tournaments={tournaments} />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing teams</h3>

          {teams.length === 0 ? (
            <AdminEmptyState>No teams exist in Supabase yet.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {teams.map((team) => (
                <TeamRecord
                  key={team.id}
                  team={team}
                  tournaments={tournaments}
                  tournamentName={
                    team.tournament_id
                      ? tournamentNames.get(team.tournament_id) ?? "Unknown tournament"
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

function TeamRecord({
  team,
  tournaments,
  tournamentName,
}: {
  team: AdminTeam
  tournaments: AdminTournament[]
  tournamentName: string
}) {
  return (
    <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{team.name ?? "Untitled team"}</h4>
            <p className="mt-1 break-words text-sm text-white/55">{tournamentName}</p>
          </div>

          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/65">
            Seed {team.seed ?? "???"}
          </span>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TeamForm action={updateTeam} submitLabel="Save changes" tournaments={tournaments} team={team} />
          <DeleteForm action={deleteTeam} id={team.id} />
        </div>
      </div>
    </details>
  )
}

function TeamForm({
  action,
  submitLabel,
  tournaments,
  team,
}: {
  action: AdminFormAction
  submitLabel: string
  tournaments: AdminTournament[]
  team?: AdminTeam
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {team && <input type="hidden" name="id" value={team.id} />}
      <TournamentSelect tournaments={tournaments} value={team?.tournament_id} />

      <AdminField label="Name">
        <input name="name" defaultValue={team?.name ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label="Seed">
        <input name="seed" type="number" min={1} step={1} defaultValue={team?.seed ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label="Wins">
        <input name="wins" type="number" min={0} step={1} defaultValue={team?.wins ?? 0} required className={inputClassName} />
      </AdminField>

      <AdminField label="Losses">
        <input name="losses" type="number" min={0} step={1} defaultValue={team?.losses ?? 0} required className={inputClassName} />
      </AdminField>

      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}
