"use client"

import { useState } from "react"
import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminResult } from "@/lib/admin/results"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { createTournamentNameMap, getPlayerNames, getTeamNames } from "@/lib/admin/view-helpers"
import { createResult, deleteResult, updateResult } from "@/app/admin/actions"
import { ResultParticipantFields } from "@/components/admin-participant-fields"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, SubmitButton } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"
import { getAdminFieldHints } from "@/components/admin/admin-field-hints"

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
  const { t } = useLanguage()
  const tournamentNames = createTournamentNameMap(tournaments)
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)

  return (
    <AdminSection
      id="results"
      title={t.admin.results.title}
      description={t.admin.results.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="results"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.results.createResult}</h3>
          <ResultForm
            action={createResult}
            submitLabel={t.admin.results.createResult}
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
          />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.results.existingResults}</h3>
          {results.length === 0 ? (
            <AdminEmptyState>{t.admin.results.noResults}</AdminEmptyState>
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
                      ? tournamentNames.get(result.tournament_id) ?? t.admin.results.unknownTournament
                      : t.admin.results.unassigned
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
  const { t } = useLanguage()
  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{result.team ?? t.admin.results.untitledResult}</h4>
            <p className="mt-1 break-words text-sm text-white/55">{tournamentName}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>{t.admin.results.placementLabel}{result.placement ?? "???"}</span>
            {result.label && <span className={pillClassName}>{result.label}</span>}
          </div>
        </div>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <ResultForm
            action={updateResult}
            submitLabel={t.admin.results.saveChanges}
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
  const { t, lang } = useLanguage()
  const fh = getAdminFieldHints(lang === "uk")
  const [selectedTournamentId, setSelectedTournamentId] = useState(result?.tournament_id ?? tournaments[0]?.id ?? "")
  const selectedTournament = tournaments.find((tournament) => tournament.id === selectedTournamentId)
  const isLobbyResult =
    selectedTournament?.tournament_format === "battle_royale" ||
    selectedTournament?.tournament_format === "free_for_all"

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {result && <input type="hidden" name="id" value={result.id} />}
      <AdminField
        label={t.admin.extra.tournamentLabel}
        hint={
          lang === "uk"
            ? { title: "Турнір, до якого належить цей результат.", example: "Eclyps Winter Cup 2026" }
            : { title: "Tournament this result belongs to.", example: "Eclyps Winter Cup 2026" }
        }
      >
        <select
          name="tournament_id"
          value={selectedTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
          required
          className={inputClassName}
        >
          <option value="" disabled>
            {t.admin.extra.selectTournament}
          </option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id} className="bg-neutral-900 text-white">
              {tournament.name ?? t.admin.extra.untitledTournament}
            </option>
          ))}
        </select>
      </AdminField>
      <ResultParticipantFields
        initialType={result?.participant_type}
        teamNames={teamNames}
        playerNames={playerNames}
        team={result?.team}
      />
      <AdminField label={t.admin.results.placementField} hint={fh.results.placement}>
        <input name="placement" type="number" min={1} step={1} defaultValue={result?.placement ?? ""} required className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.results.labelField} hint={fh.results.label}>
        <input name="label" defaultValue={result?.label ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.results.mvpField} hint={fh.results.mvp}>
        <input name="mvp" defaultValue={result?.mvp ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.results.scorelineField} hint={fh.results.scoreline}>
        <input name="scoreline" defaultValue={result?.scoreline ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.results.noteField} hint={fh.results.note}>
        <input name="note" defaultValue={result?.note ?? ""} className={inputClassName} />
      </AdminField>
      <div className={`sm:col-span-2 rounded-xl border p-4 ${isLobbyResult ? "border-primary/15 bg-primary/5" : "border-white/10 bg-black/20"}`}>
        <div className="mb-3 flex flex-col gap-1">
          <p className="text-sm font-semibold text-white/85">
            {lang === "uk" ? "Lobby result details" : "Lobby result details"}
          </p>
          <p className="text-xs leading-5 text-white/45">
            {isLobbyResult
              ? lang === "uk"
                ? "Для Battle Royale / FFA заповни лобі, місце, kills і points — з цього будується leaderboard."
                : "For Battle Royale / FFA, fill lobby, placement, kills, and points for leaderboard calculations."
              : lang === "uk"
                ? "Для звичайних форматів ці поля можна залишити порожніми."
                : "For regular formats, these fields can stay empty."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <AdminField label={lang === "uk" ? "Lobby round" : "Lobby round"}>
            <input name="lobby_round" type="number" min={1} step={1} defaultValue={result?.lobby_round ?? ""} className={inputClassName} />
          </AdminField>
          <AdminField label={lang === "uk" ? "Lobby" : "Lobby"}>
            <input name="lobby_order" type="number" min={1} step={1} defaultValue={result?.lobby_order ?? ""} className={inputClassName} />
          </AdminField>
          <AdminField label={lang === "uk" ? "Kills" : "Kills"}>
            <input name="kills" type="number" min={0} step={1} defaultValue={result?.kills ?? ""} className={inputClassName} />
          </AdminField>
          <AdminField label={lang === "uk" ? "Points" : "Points"}>
            <input name="points" type="number" min={0} step={1} defaultValue={result?.points ?? ""} className={inputClassName} />
          </AdminField>
        </div>
      </div>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}
