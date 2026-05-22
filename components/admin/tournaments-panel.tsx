import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { formatDisplayDate, formatDisplayDateTime, formatStatus } from "@/lib/admin/formatters"
import { createTournament, deleteTournament, updateTournament } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, StatusSelect, SubmitButton } from "@/components/admin/admin-form-fields"
import { formatUtcDateTimeInput } from "@/lib/check-ins/time"

export function TournamentsPanel({
  tournaments,
  fetchError,
  feedback,
}: {
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  return (
    <AdminSection
      id="tournaments"
      title="Tournaments"
      description="Create, update, and remove tournaments stored in Supabase."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="tournaments"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create tournament</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Adds a real tournament row to <code>public.tournaments</code>.
          </p>

          <TournamentForm action={createTournament} submitLabel="Create tournament" />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing tournaments</h3>

          {tournaments.length === 0 ? (
            <AdminEmptyState>No tournaments exist in Supabase yet.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {tournaments.map((tournament) => (
                <TournamentRecord key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function TournamentRecord({ tournament }: { tournament: AdminTournament }) {
  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{tournament.name ?? "Untitled tournament"}</h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {tournament.game ?? "Unknown game"} {"\u2022"} {formatDisplayDate(tournament.event_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/65">
              {formatStatus(tournament.status)}
            </span>
            {tournament.is_active && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
                Active
              </span>
            )}
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <dl className="grid gap-3 text-sm text-white/55 sm:grid-cols-2">
          <div>
            <dt className="text-white/35">Created</dt>
            <dd className="mt-1">{formatDisplayDateTime(tournament.created_at)}</dd>
          </div>
          <div>
            <dt className="text-white/35">Participant slots</dt>
            <dd className="mt-1">{tournament.team_count ?? "???"}</dd>
          </div>
          <div>
            <dt className="text-white/35">Participant type</dt>
            <dd className="mt-1">{formatParticipantType(tournament.participant_type)}</dd>
          </div>
          <div>
            <dt className="text-white/35">Match days</dt>
            <dd className="mt-1">{tournament.match_days ?? "???"}</dd>
          </div>
          <div>
            <dt className="text-white/35">Check-in opens</dt>
            <dd className="mt-1">{formatDisplayDateTime(tournament.check_in_opens_at)}</dd>
          </div>
          <div>
            <dt className="text-white/35">Check-in closes</dt>
            <dd className="mt-1">{formatDisplayDateTime(tournament.check_in_closes_at)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TournamentForm
            action={updateTournament}
            submitLabel="Save changes"
            tournament={tournament}
          />
          <DeleteForm action={deleteTournament} id={tournament.id} />
        </div>
      </div>
    </details>
  )
}

function TournamentForm({
  action,
  submitLabel,
  tournament,
}: {
  action: AdminFormAction
  submitLabel: string
  tournament?: AdminTournament
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {tournament && <input type="hidden" name="id" value={tournament.id} />}

      <AdminField label="Name">
        <input name="name" defaultValue={tournament?.name ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label="Game">
        <input name="game" defaultValue={tournament?.game ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label="Event date">
        <input name="event_date" type="date" defaultValue={tournament?.event_date ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label="Format">
        <input name="format" defaultValue={tournament?.format ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label="Participant type">
        <select
          name="participant_type"
          defaultValue={tournament?.participant_type ?? "player"}
          className={inputClassName}
        >
          <option value="player">Player tournament</option>
          <option value="team">Team tournament</option>
        </select>
      </AdminField>

      <AdminField label="Participant slots">
        <input name="team_count" type="number" min={1} step={1} defaultValue={tournament?.team_count ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label="Match days">
        <input name="match_days" type="number" min={1} step={1} defaultValue={tournament?.match_days ?? 1} required className={inputClassName} />
      </AdminField>

      <AdminField label="Prize pool">
        <input name="prize_pool" defaultValue={tournament?.prize_pool ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label="Check-in opens (UTC)">
        <input
          name="check_in_opens_at"
          type="datetime-local"
          defaultValue={formatUtcDateTimeInput(tournament?.check_in_opens_at)}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Check-in closes (UTC)">
        <input
          name="check_in_closes_at"
          type="datetime-local"
          defaultValue={formatUtcDateTimeInput(tournament?.check_in_closes_at)}
          className={inputClassName}
        />
      </AdminField>

      <StatusSelect value={tournament?.status} />

      <AdminField label="Arena title">
        <input name="arena_title" defaultValue={tournament?.arena_title ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label="Arena tags">
        <input name="arena_tags" defaultValue={tournament?.arena_tags?.join(", ") ?? ""} placeholder="PC Platform, 5v5 Format" className={inputClassName} />
      </AdminField>

      <div className="sm:col-span-2">
        <AdminField label="Arena description">
          <textarea name="arena_description" defaultValue={tournament?.arena_description ?? ""} rows={4} className={inputClassName} />
        </AdminField>
      </div>

      <div className="sm:col-span-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm font-medium text-white/80">Cinematic bracket labels</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <AdminField label="Bracket title">
              <input name="bracket_title" defaultValue={tournament?.bracket_title ?? ""} placeholder="Live Bracket" className={inputClassName} />
            </AdminField>

            <AdminField label="Bracket subtitle">
              <input name="bracket_subtitle" defaultValue={tournament?.bracket_subtitle ?? ""} placeholder="Tournament Tree" className={inputClassName} />
            </AdminField>

            <AdminField label="Stage label">
              <input name="bracket_stage_label" defaultValue={tournament?.bracket_stage_label ?? ""} placeholder="Grand Final" className={inputClassName} />
            </AdminField>

            <AdminField label="Participant label">
              <input name="bracket_participant_label" defaultValue={tournament?.bracket_participant_label ?? ""} placeholder="Finalist" className={inputClassName} />
            </AdminField>

            <div className="sm:col-span-2">
              <AdminField label="Arena label">
                <input name="bracket_arena_label" defaultValue={tournament?.bracket_arena_label ?? ""} placeholder="Eclyps Arena" className={inputClassName} />
              </AdminField>
            </div>
          </div>
        </div>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  )
}

function formatParticipantType(type: AdminTournament["participant_type"]) {
  return type === "team" ? "Team tournament" : "Player tournament"
}
