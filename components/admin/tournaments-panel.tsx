import { useState } from "react"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { getGameConfig, getSupportedGames, normalizeGame } from "@/lib/games"
import { formatDisplayDate, formatDisplayDateTime, formatStatus } from "@/lib/admin/formatters"
import { createTournament, deleteTournament, updateTournament } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, StatusSelect, SubmitButton } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"
import {
  formatKyivDateTimeInput,
  formatKyivCheckInDateWithLabel,
} from "@/lib/check-ins/time"

export function TournamentsPanel({
  tournaments,
  fetchError,
  feedback,
}: {
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t } = useLanguage()

  return (
    <AdminSection
      id="tournaments"
      title={t.admin.tournaments.title}
      description={t.admin.tournaments.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="tournaments"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.tournaments.createTournament}</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {t.admin.tournaments.createTournamentDesc}
          </p>

          <TournamentForm action={createTournament} submitLabel={t.admin.tournaments.createTournament} />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.tournaments.existingTournaments}</h3>

          {tournaments.length === 0 ? (
            <AdminEmptyState>{t.admin.emptyState.tournaments}</AdminEmptyState>
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
  const { t, lang } = useLanguage()
  const gameConfig = getGameConfig(tournament.game, tournament.game_mode)

  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{tournament.name ?? t.admin.tournaments.untitledTournament}</h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {normalizeGame(tournament.game) === "CS 2" && tournament.game_mode ? `CS 2 (${gameConfig.name})` : (tournament.game ?? t.admin.tournaments.unknownGame)} {"\u2022"} {formatDisplayDate(tournament.event_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/65">
              {formatStatus(tournament.status)}
            </span>
            {tournament.is_active && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
                {t.admin.tournaments.activeBadge}
              </span>
            )}
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <dl className="grid gap-3 text-sm text-white/55 sm:grid-cols-2">
          <div>
            <dt className="text-white/35">{t.admin.tournaments.createdLabel}</dt>
            <dd className="mt-1">{formatDisplayDateTime(tournament.created_at)}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.participantSlotsLabel}</dt>
            <dd className="mt-1">{tournament.team_count ?? "???"}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.participantTypeLabel}</dt>
            <dd className="mt-1">{formatParticipantType(tournament.participant_type, lang, t)}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.matchDaysLabel}</dt>
            <dd className="mt-1">{tournament.match_days ?? "???"}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.checkInOpensLabel}</dt>
            <dd className="mt-1">{formatKyivDateTime(tournament.check_in_opens_at)}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.checkInClosesLabel}</dt>
            <dd className="mt-1">{formatKyivDateTime(tournament.check_in_closes_at)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TournamentForm
            action={updateTournament}
            submitLabel={t.admin.tournaments.saveChanges}
            tournament={tournament}
          />
          <div className="p-3 rounded-xl border border-red-500/10 bg-red-950/5 self-start">
            <p className="text-[10px] text-red-400 font-semibold mb-2 max-w-[160px] leading-relaxed">
              {t.admin.dangerousAction}
            </p>
            <DeleteForm action={deleteTournament} id={tournament.id} />
          </div>
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
  const { t } = useLanguage()
  const supportedGames = getSupportedGames()

  const normalizedGame = normalizeGame(tournament?.game ?? "CS 2")
  const [selectedGame, setSelectedGame] = useState<string>(normalizedGame)
  
  const initialMode = tournament?.game_mode ?? (
    tournament?.game && normalizeGame(tournament.game) === "CS 2"
      ? (tournament.participant_type === "player" ? "1v1" : "5v5")
      : getGameConfig(tournament?.game ?? normalizedGame).defaultModeId
  )
  const [selectedMode, setSelectedMode] = useState<string>(initialMode)

  const [participantType, setParticipantType] = useState<"team" | "player">(
    (tournament?.participant_type as "team" | "player") ?? 
    (tournament?.game ? getGameConfig(tournament.game, initialMode).participantType : "team")
  )

  const handleGameChange = (gameValue: string) => {
    setSelectedGame(gameValue)
    const baseConfig = getGameConfig(gameValue)
    const defaultMode = baseConfig.defaultModeId
    setSelectedMode(defaultMode)
    const modeConfig = getGameConfig(gameValue, defaultMode)
    setParticipantType(modeConfig.participantType)
  }

  const handleModeChange = (modeValue: string) => {
    setSelectedMode(modeValue)
    const modeConfig = getGameConfig(selectedGame, modeValue)
    setParticipantType(modeConfig.participantType)
  }

  const gameConfig = getGameConfig(selectedGame, selectedMode)

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {tournament && <input type="hidden" name="id" value={tournament.id} />}

      <AdminField label={t.admin.tournaments.nameField}>
        <input name="name" defaultValue={tournament?.name ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.gameField}>
        <select
          name="game"
          value={selectedGame}
          onChange={(e) => handleGameChange(e.target.value)}
          required
          className={inputClassName}
        >
          {supportedGames.map((game) => (
            <option key={game} value={game} className="bg-neutral-900 text-white">
              {game === "FC" ? "FC (EA Sports FC)" : getGameConfig(game).fullName}
            </option>
          ))}
        </select>
      </AdminField>

      {selectedGame === "CS 2" ? (
        <AdminField label="CS 2 Format / Mode">
          <select
            name="game_mode"
            value={selectedMode}
            onChange={(e) => handleModeChange(e.target.value)}
            required
            className={inputClassName}
          >
            <option value="1v1" className="bg-neutral-900 text-white">1v1 Aim</option>
            <option value="2v2" className="bg-neutral-900 text-white">2v2 Wingman</option>
            <option value="5v5" className="bg-neutral-900 text-white">5v5 Classic</option>
          </select>
        </AdminField>
      ) : (
        <input type="hidden" name="game_mode" value={selectedMode} />
      )}

      {/* Dynamic Game Info Card */}
      <div className="sm:col-span-2 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          {t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Конфігурація гри" : "Game Configuration"}: {gameConfig.fullName}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/60 sm:grid-cols-4">
          <div>
            <dt className="text-white/35">{t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Формат учасників" : "Roster Format"}</dt>
            <dd className="mt-1 font-medium text-white capitalize">{gameConfig.rosterLabel}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Кількість замін" : "Max Substitutes"}</dt>
            <dd className="mt-1 font-medium text-white">{gameConfig.substitutes}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Тип рахунку" : "Score Format"}</dt>
            <dd className="mt-1 font-medium text-white uppercase">{gameConfig.scoreFormat}</dd>
          </div>
          <div>
            <dt className="text-white/35">{t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Формати матчів" : "Match Formats"}</dt>
            <dd className="mt-1 font-medium text-white">{gameConfig.matchFormats.join(", ")}</dd>
          </div>
          {gameConfig.mapPool.length > 0 && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-white/35">{t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Список мап" : "Map Pool"}</dt>
              <dd className="mt-1 font-medium text-white break-words">{gameConfig.mapPool.join(", ")}</dd>
            </div>
          )}
        </dl>
      </div>

      <AdminField label={t.admin.tournaments.eventDateField}>
        <input name="event_date" type="date" defaultValue={tournament?.event_date ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.formatField}>
        <input name="format" defaultValue={tournament?.format ?? gameConfig.matchFormats[0]} className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.participantTypeField}>
        <select
          name="participant_type"
          value={participantType}
          onChange={(e) => setParticipantType(e.target.value as "team" | "player")}
          className={inputClassName}
        >
          <option value="player">{t.admin.tournaments.playerTournamentOption}</option>
          <option value="team">{t.admin.tournaments.teamTournamentOption}</option>
        </select>
      </AdminField>

      <AdminField label={t.admin.tournaments.participantSlotsField}>
        <input name="team_count" type="number" min={1} step={1} defaultValue={tournament?.team_count ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.matchDaysField}>
        <input name="match_days" type="number" min={1} step={1} defaultValue={tournament?.match_days ?? 1} required className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.prizePoolField}>
        <input name="prize_pool" defaultValue={tournament?.prize_pool ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.checkInOpensField}>
        <input
          name="check_in_opens_at"
          type="datetime-local"
          defaultValue={formatKyivDateTimeInput(tournament?.check_in_opens_at)}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label={t.admin.tournaments.checkInClosesField}>
        <input
          name="check_in_closes_at"
          type="datetime-local"
          defaultValue={formatKyivDateTimeInput(tournament?.check_in_closes_at)}
          className={inputClassName}
        />
      </AdminField>

      <StatusSelect value={tournament?.status} />

      <AdminField label={t.admin.tournaments.arenaTitleField}>
        <input name="arena_title" defaultValue={tournament?.arena_title ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.arenaTagsField}>
        <input name="arena_tags" defaultValue={tournament?.arena_tags?.join(", ") ?? ""} placeholder="PC Platform, 5v5 Format" className={inputClassName} />
      </AdminField>

      <div className="sm:col-span-2">
        <AdminField label={t.admin.tournaments.arenaDescriptionField}>
          <textarea name="arena_description" defaultValue={tournament?.arena_description ?? ""} rows={4} className={inputClassName} />
        </AdminField>
      </div>

      <div className="sm:col-span-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm font-medium text-white/80">{t.admin.tournaments.cinematicBracketTitle}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <AdminField label={t.admin.tournaments.bracketTitleField}>
              <input name="bracket_title" defaultValue={tournament?.bracket_title ?? ""} placeholder="Live Bracket" className={inputClassName} />
            </AdminField>

            <AdminField label={t.admin.tournaments.bracketSubtitleField}>
              <input name="bracket_subtitle" defaultValue={tournament?.bracket_subtitle ?? ""} placeholder="Tournament Tree" className={inputClassName} />
            </AdminField>

            <AdminField label={t.admin.tournaments.bracketStageLabelField}>
              <input name="bracket_stage_label" defaultValue={tournament?.bracket_stage_label ?? ""} placeholder="Grand Final" className={inputClassName} />
            </AdminField>

            <AdminField label={t.admin.tournaments.bracketParticipantLabelField}>
              <input name="bracket_participant_label" defaultValue={tournament?.bracket_participant_label ?? ""} placeholder="Finalist" className={inputClassName} />
            </AdminField>

            <div className="sm:col-span-2">
              <AdminField label={t.admin.tournaments.bracketArenaLabelField}>
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

function formatParticipantType(type: AdminTournament["participant_type"], lang: string, t: any) {
  return type === "team"
    ? t.admin.tournaments.teamTournamentOption
    : t.admin.tournaments.playerTournamentOption
}

function formatKyivDateTime(value: string | null) {
  return value ? formatKyivCheckInDateWithLabel(value) : "???"
}
