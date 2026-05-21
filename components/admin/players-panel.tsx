import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { createTournamentNameMap } from "@/lib/admin/view-helpers"
import { createPlayer, deletePlayer, updatePlayer } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, SubmitButton, TournamentSelect } from "@/components/admin/admin-form-fields"

export function PlayersPanel({
  players,
  tournaments,
  fetchError,
  feedback,
}: {
  players: AdminPlayer[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const tournamentNames = createTournamentNameMap(tournaments)

  return (
    <AdminSection
      id="players"
      title="Players"
      description="Create, update, and remove individual tournament players."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="players"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create player</h3>
          <PlayerForm action={createPlayer} submitLabel="Create player" tournaments={tournaments} />
        </article>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing players</h3>
          {players.length === 0 ? (
            <AdminEmptyState>No players exist in Supabase yet.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {players.map((player) => (
                <PlayerRecord
                  key={player.id}
                  player={player}
                  tournaments={tournaments}
                  tournamentName={
                    player.tournament_id
                      ? tournamentNames.get(player.tournament_id) ?? "Unknown tournament"
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

function PlayerRecord({
  player,
  tournaments,
  tournamentName,
}: {
  player: AdminPlayer
  tournaments: AdminTournament[]
  tournamentName: string
}) {
  const showRealName = Boolean(
    player.real_name && player.real_name !== player.display_name,
  )

  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="break-words font-medium">{player.display_name}</h4>
            {showRealName && (
              <p className="mt-1 break-words text-sm text-white/45">{player.real_name}</p>
            )}
            {player.region && (
              <p className="mt-1 break-words text-sm text-white/45">{player.region}</p>
            )}
            <p className="mt-1 break-words text-sm text-white/55">{tournamentName}</p>
          </div>
          <span className={pillClassName}>Seed {player.seed ?? "???"}</span>
        </div>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <PlayerForm action={updatePlayer} submitLabel="Save changes" tournaments={tournaments} player={player} />
          <DeleteForm action={deletePlayer} id={player.id} />
        </div>
      </div>
    </details>
  )
}

function PlayerForm({
  action,
  submitLabel,
  tournaments,
  player,
}: {
  action: AdminFormAction
  submitLabel: string
  tournaments: AdminTournament[]
  player?: AdminPlayer
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {player && <input type="hidden" name="id" value={player.id} />}
      <TournamentSelect tournaments={tournaments} value={player?.tournament_id} />
      <AdminField label="Real name">
        <input name="name" defaultValue={player?.name ?? ""} required className={inputClassName} />
      </AdminField>
      <AdminField label="Nickname / display name">
        <input name="nickname" defaultValue={player?.nickname ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Region">
        <input
          name="region"
          defaultValue={player?.region ?? ""}
          placeholder="Ukraine, EU, North America"
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Seed">
        <input name="seed" type="number" min={1} step={1} defaultValue={player?.seed ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Wins">
        <input name="wins" type="number" min={0} step={1} defaultValue={player?.wins ?? 0} required className={inputClassName} />
      </AdminField>
      <AdminField label="Losses">
        <input name="losses" type="number" min={0} step={1} defaultValue={player?.losses ?? 0} required className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}
