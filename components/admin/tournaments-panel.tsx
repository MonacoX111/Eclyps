import { useState } from "react"
import type { AdminMatch } from "@/lib/admin/matches"
import type { AdminParticipant } from "@/lib/admin/participants"
import type { AdminRegistration } from "@/lib/admin/registrations"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { getGameConfig, getSupportedGames, normalizeGame } from "@/lib/games"
import {
  TOURNAMENT_FORMAT_DEFINITIONS,
  getTournamentFormatDefinition,
  normalizeTournamentFormatConfig,
  type TournamentFormat,
} from "@/lib/tournament-formats"
import { formatDisplayDate, formatDisplayDateTime, formatStatus } from "@/lib/admin/formatters"
import { createTournament, deleteTournament, updateTournament } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, StatusSelect, SubmitButton } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"
import {
  formatKyivDateTimeInput,
  formatKyivCheckInDateWithLabel,
} from "@/lib/check-ins/time"

export function TournamentsPanel({
  tournaments,
  participants,
  matches,
  registrations,
  fetchError,
  feedback,
}: {
  tournaments: AdminTournament[]
  participants: AdminParticipant[]
  matches: AdminMatch[]
  registrations: AdminRegistration[]
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
      <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.28fr)]">
        <article className={`${innerPanelClassName} min-w-0`}>
          <h3 className="text-lg font-medium">{t.admin.tournaments.createTournament}</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {t.admin.tournaments.createTournamentDesc}
          </p>

          <TournamentForm action={createTournament} submitLabel={t.admin.tournaments.createTournament} />
        </article>

        <article className={`${innerPanelClassName} min-w-0`}>
          <h3 className="text-lg font-medium">{t.admin.tournaments.existingTournaments}</h3>

          {tournaments.length === 0 ? (
            <AdminEmptyState>{t.admin.emptyState.tournaments}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {tournaments.map((tournament) => (
                <TournamentRecord
                  key={tournament.id}
                  tournament={tournament}
                  participants={participants.filter((participant) => participant.tournament_id === tournament.id)}
                  matches={matches.filter((match) => match.tournament_id === tournament.id)}
                  registrations={registrations.filter((registration) => registration.tournament_id === tournament.id)}
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function TournamentRecord({
  tournament,
  participants,
  matches,
  registrations,
}: {
  tournament: AdminTournament
  participants: AdminParticipant[]
  matches: AdminMatch[]
  registrations: AdminRegistration[]
}) {
  const { t, lang } = useLanguage()
  const gameConfig = getGameConfig(tournament.game, tournament.game_mode)
  const health = buildTournamentHealth(tournament, participants, matches, registrations, lang)

  return (
    <details className={`${recordClassName} min-w-0`}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{tournament.name ?? t.admin.tournaments.untitledTournament}</h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {normalizeGame(tournament.game) === "CS 2" && tournament.game_mode ? `CS 2 (${gameConfig.name})` : (tournament.game ?? t.admin.tournaments.unknownGame)} {"\u2022"} {formatDisplayDate(tournament.event_date)} {"\u2022"} {getTournamentFormatDefinition(tournament.tournament_format).shortLabel}
            </p>
          </div>

          <div className="flex max-w-full flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/65">
              {formatStatus(tournament.status)}
            </span>
            {tournament.is_active && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
                {t.admin.tournaments.activeBadge}
              </span>
            )}
            <span className={`rounded-full border px-2.5 py-1 ${health.tone === "ready" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : health.tone === "error" ? "border-red-300/20 bg-red-300/10 text-red-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>
              {health.label}
            </span>
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
            <dt className="text-white/35">{isUkLabel(lang, "Структура турніру", "Tournament structure")}</dt>
            <dd className="mt-1">{getTournamentFormatDefinition(tournament.tournament_format).label}</dd>
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

        <TournamentHealthPanel items={health.items} lang={lang} />

        <div className="mt-5 grid gap-4">
          <TournamentForm
            action={updateTournament}
            submitLabel={t.admin.tournaments.saveChanges}
            tournament={tournament}
          />
          <div className="rounded-xl border border-red-500/10 bg-red-950/5 p-3">
            <p className="mb-2 text-[10px] font-semibold leading-relaxed text-red-400">
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
  const { t, lang } = useLanguage()
  const isUk = lang === "uk"
  const supportedGames = getSupportedGames()
  const hints = getFieldHints(isUk)

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
  const [selectedTournamentFormat, setSelectedTournamentFormat] = useState<TournamentFormat>(
    tournament?.tournament_format ?? "single_elimination",
  )
  const [participantSlots, setParticipantSlots] = useState<string>(
    tournament?.team_count ? String(tournament.team_count) : "",
  )
  const [bannerUrl, setBannerUrl] = useState<string>(tournament?.banner_url ?? "")

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
  const tournamentFormatDefinition = getTournamentFormatDefinition(selectedTournamentFormat)
  const tournamentFormatConfig = normalizeTournamentFormatConfig(
    selectedTournamentFormat,
    tournament?.format_config,
  )
  const slotPreview = getSlotHealthDetail(tournamentFormatDefinition, Number(participantSlots), isUk)
  const slotPreviewTone: TournamentHealthTone =
    Number(participantSlots) > 0 &&
    Number(participantSlots) >= tournamentFormatDefinition.minParticipants &&
    (tournamentFormatDefinition.maxParticipants === null || Number(participantSlots) <= tournamentFormatDefinition.maxParticipants) &&
    (selectedTournamentFormat !== "single_elimination" || isPowerOfTwo(Number(participantSlots)))
      ? "ready"
      : "warning"
  const isWizard = true
  const wizardSteps = [
    {
      title: isUk ? "Основне" : "Basics",
      description: isUk ? "Назва, гра, режим і дата старту." : "Name, game, mode, and start date.",
    },
    {
      title: isUk ? "Візуал" : "Visuals",
      description: isUk ? "Формат матчу, призовий фонд і банер." : "Match format, prize pool, and banner.",
    },
    {
      title: isUk ? "Формат турніру" : "Tournament format",
      description: isUk ? "Структура турніру та її налаштування." : "Tournament structure and its settings.",
    },
    {
      title: isUk ? "Учасники" : "Participants",
      description: isUk ? "Тип учасників, слоти та кількість ігрових днів." : "Participant type, slots, and match days.",
    },
    {
      title: isUk ? "Check-in" : "Check-in",
      description: isUk ? "Вікно check-in і статус турніру." : "Check-in window and tournament status.",
    },
    {
      title: isUk ? "Frontend" : "Frontend",
      description: isUk ? "Тексти для публічної сторінки та bracket-блоку." : "Public page copy and bracket presentation.",
    },
  ]
  const [wizardStep, setWizardStep] = useState(0)
  const isFirstWizardStep = wizardStep === 0
  const isLastWizardStep = wizardStep === wizardSteps.length - 1

  return (
    <form action={action} className="mt-4 space-y-4">
      {tournament && <input type="hidden" name="id" value={tournament.id} />}
      {isWizard ? <TournamentWizardSteps steps={wizardSteps} activeStep={wizardStep} /> : null}
      {isWizard ? (
        <TournamentWizardAssistant
          formatLabel={tournamentFormatDefinition.label}
          slotDetail={slotPreview}
          slotTone={slotPreviewTone}
          bannerUrl={bannerUrl}
          isUk={isUk}
        />
      ) : null}

      <div className={getTournamentWizardPanelClassName(isWizard, wizardStep, 0)}>

      <AdminField label={t.admin.tournaments.nameField} hint={hints.name}>
        <input name="name" defaultValue={tournament?.name ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.gameField} hint={hints.game}>
        <select
          name="game"
          value={selectedGame}
          onChange={(e) => handleGameChange(e.target.value)}
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
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 xl:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          {t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Конфігурація гри" : "Game Configuration"}: {gameConfig.fullName}
        </p>
        <dl className="mt-3 grid gap-3 text-xs text-white/60 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="sm:col-span-2 xl:col-span-4">
              <dt className="text-white/35">{t.admin.tournaments.createTournamentDesc.includes("налаштування") ? "Список мап" : "Map Pool"}</dt>
              <dd className="mt-1 font-medium text-white break-words">{gameConfig.mapPool.join(", ")}</dd>
            </div>
          )}
        </dl>
      </div>

      <AdminField label={t.admin.tournaments.eventDateField} hint={hints.eventDate}>
        <input name="event_date" type="date" defaultValue={tournament?.event_date ?? ""} className={inputClassName} />
      </AdminField>

      </div>

      <div className={getTournamentWizardPanelClassName(isWizard, wizardStep, 1)}>
      <AdminField label={t.admin.tournaments.formatField} hint={hints.format}>
        <input name="format" defaultValue={tournament?.format ?? gameConfig.matchFormats[0]} className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.prizePoolField} hint={hints.prizePool}>
        <input name="prize_pool" defaultValue={tournament?.prize_pool ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField
        label={isUk ? "Банер турніру" : "Tournament banner"}
        hint={{
          title: isUk
            ? "Посилання на банер турніру. Використовується на головній та сторінках турніру."
            : "Tournament banner image URL. Used on the homepage and tournament pages.",
          example: "https://.../banner.jpg",
        }}
      >
        <input
          name="banner_url"
          defaultValue={tournament?.banner_url ?? ""}
          onChange={(event) => setBannerUrl(event.target.value)}
          placeholder="https://.../banner.jpg"
          className={inputClassName}
        />
      </AdminField>

      </div>

      <div className={getTournamentWizardPanelClassName(isWizard, wizardStep, 2)}>
      <AdminField label={isUk ? "Структура турніру" : "Tournament structure"} hint={hints.tournamentFormat}>
        <select
          name="tournament_format"
          value={selectedTournamentFormat}
          onChange={(e) => setSelectedTournamentFormat(e.target.value as TournamentFormat)}
          className={inputClassName}
        >
          {TOURNAMENT_FORMAT_DEFINITIONS.map((format) => (
            <option key={format.id} value={format.id} className="bg-neutral-900 text-white">
              {format.label}{format.isImplemented ? "" : isUk ? " (engine скоро)" : " (engine soon)"}
            </option>
          ))}
        </select>
      </AdminField>

      <TournamentFormatConfigFields
        key={selectedTournamentFormat}
        definition={tournamentFormatDefinition}
        config={tournamentFormatConfig}
        isUk={isUk}
      />

      </div>

      <div className={getTournamentWizardPanelClassName(isWizard, wizardStep, 3)}>
      <AdminField label={t.admin.tournaments.participantTypeField} hint={hints.participantType}>
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

      <AdminField label={t.admin.tournaments.participantSlotsField} hint={hints.participantSlots}>
        <input
          name="team_count"
          type="number"
          min={1}
          step={1}
          defaultValue={tournament?.team_count ?? ""}
          onChange={(event) => setParticipantSlots(event.target.value)}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label={t.admin.tournaments.matchDaysField} hint={hints.matchDays}>
        <input name="match_days" type="number" min={1} step={1} defaultValue={tournament?.match_days ?? 1} className={inputClassName} />
      </AdminField>

      </div>

      <div className={getTournamentWizardPanelClassName(isWizard, wizardStep, 4)}>
      <AdminField label={t.admin.tournaments.checkInOpensField} hint={hints.checkInOpens}>
        <input
          name="check_in_opens_at"
          type="datetime-local"
          defaultValue={formatKyivDateTimeInput(tournament?.check_in_opens_at)}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label={t.admin.tournaments.checkInClosesField} hint={hints.checkInCloses}>
        <input
          name="check_in_closes_at"
          type="datetime-local"
          defaultValue={formatKyivDateTimeInput(tournament?.check_in_closes_at)}
          className={inputClassName}
        />
      </AdminField>

      <StatusSelect value={tournament?.status} />

      </div>

      <div className={getTournamentWizardPanelClassName(isWizard, wizardStep, 5)}>
      <AdminField label={t.admin.tournaments.arenaTitleField} hint={hints.arenaTitle}>
        <input name="arena_title" defaultValue={tournament?.arena_title ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.tournaments.arenaTagsField} hint={hints.arenaTags}>
        <input name="arena_tags" defaultValue={tournament?.arena_tags?.join(", ") ?? ""} placeholder="PC Platform, 5v5 Format" className={inputClassName} />
      </AdminField>

      <div className="xl:col-span-2">
        <AdminField label={t.admin.tournaments.arenaDescriptionField} hint={hints.arenaDescription}>
          <textarea name="arena_description" defaultValue={tournament?.arena_description ?? ""} rows={4} className={inputClassName} />
        </AdminField>
      </div>

      <div className="xl:col-span-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm font-medium text-white/80">{t.admin.tournaments.cinematicBracketTitle}</p>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <AdminField label={t.admin.tournaments.bracketTitleField} hint={hints.bracketTitle}>
              <input name="bracket_title" defaultValue={tournament?.bracket_title ?? ""} placeholder="Live Bracket" className={inputClassName} />
            </AdminField>

            <AdminField label={t.admin.tournaments.bracketSubtitleField} hint={hints.bracketSubtitle}>
              <input name="bracket_subtitle" defaultValue={tournament?.bracket_subtitle ?? ""} placeholder="Tournament Tree" className={inputClassName} />
            </AdminField>

            <AdminField label={t.admin.tournaments.bracketStageLabelField} hint={hints.bracketStage}>
              <input name="bracket_stage_label" defaultValue={tournament?.bracket_stage_label ?? ""} placeholder="Grand Final" className={inputClassName} />
            </AdminField>

            <AdminField label={t.admin.tournaments.bracketParticipantLabelField} hint={hints.bracketParticipant}>
              <input name="bracket_participant_label" defaultValue={tournament?.bracket_participant_label ?? ""} placeholder="Finalist" className={inputClassName} />
            </AdminField>

            <div className="xl:col-span-2">
              <AdminField label={t.admin.tournaments.bracketArenaLabelField} hint={hints.bracketArena}>
                <input name="bracket_arena_label" defaultValue={tournament?.bracket_arena_label ?? ""} placeholder="Eclyps Arena" className={inputClassName} />
              </AdminField>
            </div>
          </div>
        </div>
      </div>

      </div>

      {isWizard ? (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <button
            type="button"
            disabled={isFirstWizardStep}
            onClick={() => setWizardStep((step) => Math.max(step - 1, 0))}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUk ? "Назад" : "Back"}
          </button>
          <div className="text-center text-xs text-white/45">
            {wizardStep + 1} / {wizardSteps.length}
          </div>
          {isLastWizardStep ? (
            <div className="sm:justify-self-end">
              <SubmitButton label={submitLabel} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setWizardStep((step) => Math.min(step + 1, wizardSteps.length - 1))}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-200 sm:justify-self-end"
            >
              {isUk ? "Далі" : "Next"}
            </button>
          )}
        </div>
      ) : (
        <SubmitButton label={submitLabel} />
      )}
    </form>
  )
}

function TournamentWizardSteps({
  steps,
  activeStep,
}: {
  steps: { title: string; description: string }[]
  activeStep: number
}) {
  const currentStep = steps[activeStep] ?? steps[0]

  return (
    <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-300 text-xs font-bold text-black">
          {activeStep + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-white/90">{currentStep.title}</p>
            <span className="w-fit rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/55">
              {activeStep + 1} / {steps.length}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/55">{currentStep.description}</p>
        </div>
      </div>
    </div>
  )
}

function TournamentWizardAssistant({
  formatLabel,
  slotDetail,
  slotTone,
  bannerUrl,
  isUk,
}: {
  formatLabel: string
  slotDetail: string
  slotTone: TournamentHealthTone
  bannerUrl: string
  isUk: boolean
}) {
  const trimmedBannerUrl = bannerUrl.trim()

  return (
    <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="grid gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            {isUk ? "Обраний формат" : "Selected format"}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/85">{formatLabel}</p>
        </div>
        <div className={`rounded-lg border p-3 ${slotTone === "ready" ? "border-emerald-300/15 bg-emerald-300/5" : "border-amber-300/15 bg-amber-300/5"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            {isUk ? "Перевірка слотів" : "Slot check"}
          </p>
          <p className={`mt-1 text-sm font-medium ${slotTone === "ready" ? "text-emerald-100" : "text-amber-100"}`}>
            {slotDetail}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
        {trimmedBannerUrl ? (
          <div
            className="h-32 bg-cover bg-center sm:h-40"
            style={{ backgroundImage: `url("${trimmedBannerUrl}")` }}
            aria-label={isUk ? "Preview банера турніру" : "Tournament banner preview"}
          />
        ) : (
          <div className="grid min-h-24 place-items-center px-3 py-5 text-center text-xs leading-5 text-white/35">
            {isUk ? "Додай URL банера, щоб побачити preview." : "Add a banner URL to preview it here."}
          </div>
        )}
      </div>
    </div>
  )
}

function getTournamentWizardPanelClassName(isWizard: boolean, activeStep: number, step: number) {
  if (!isWizard) return "grid gap-3 xl:grid-cols-2"

  return activeStep === step ? "grid gap-3 xl:grid-cols-2" : "hidden"
}

type TournamentHealthTone = "ready" | "warning" | "error"

type TournamentHealthItem = {
  id: string
  tone: TournamentHealthTone
  label: string
  detail: string
}

function TournamentHealthPanel({
  items,
  lang,
}: {
  items: TournamentHealthItem[]
  lang: string
}) {
  const isUk = lang === "uk"
  const visibleItems = items.filter((item) => item.tone !== "ready")
  const readyItems = items.length - visibleItems.length

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white/85">
            {isUk ? "Готовність турніру" : "Tournament health"}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            {isUk
              ? `${readyItems}/${items.length} перевірок без проблем.`
              : `${readyItems}/${items.length} checks look good.`}
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/55">
          {visibleItems.length === 0
            ? isUk ? "Готовий" : "Ready"
            : isUk ? `${visibleItems.length} пункт(ів)` : `${visibleItems.length} item(s)`}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {(visibleItems.length > 0 ? visibleItems : items).map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border px-3 py-2 text-sm ${
              item.tone === "ready"
                ? "border-emerald-300/15 bg-emerald-300/5 text-emerald-100"
                : item.tone === "error"
                  ? "border-red-300/15 bg-red-300/5 text-red-100"
                  : "border-amber-300/15 bg-amber-300/5 text-amber-100"
            }`}
          >
            <div className="font-medium">{item.label}</div>
            <div className="mt-1 text-xs leading-5 text-white/50">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildTournamentHealth(
  tournament: AdminTournament,
  participants: AdminParticipant[],
  matches: AdminMatch[],
  registrations: AdminRegistration[],
  lang: string,
) {
  const isUk = lang === "uk"
  const items: TournamentHealthItem[] = []
  const definition = getTournamentFormatDefinition(tournament.tournament_format)
  const slots = tournament.team_count ?? 0
  const approvedRegistrations = registrations.filter((registration) => registration.status === "approved").length

  items.push({
    id: "active",
    tone: tournament.is_active ? "ready" : "warning",
    label: tournament.is_active
      ? isUk ? "Турнір активний" : "Tournament is active"
      : isUk ? "Турнір не активний" : "Tournament is not active",
    detail: tournament.is_active
      ? isUk ? "Він може показуватись у головних блоках сайту." : "It can be used by the main public site blocks."
      : isUk ? "Активуй його, якщо це головний поточний турнір." : "Activate it if this is the main current tournament.",
  })

  const slotTone: TournamentHealthTone =
    slots < definition.minParticipants ||
    (definition.maxParticipants !== null && slots > definition.maxParticipants) ||
    (definition.id === "single_elimination" && !isPowerOfTwo(slots))
      ? "error"
      : "ready"
  items.push({
    id: "slots",
    tone: slotTone,
    label: isUk ? "Слоти відповідають формату" : "Slots fit the format",
    detail: getSlotHealthDetail(definition, slots, isUk),
  })

  items.push({
    id: "participants",
    tone: slots > 0 && participants.length >= slots ? "ready" : "warning",
    label: isUk ? "Слоти заповнюються" : "Slots are being filled",
    detail: isUk
      ? `${participants.length}/${slots || "?"} учасник(ів) у participants, ${approvedRegistrations} approved registration.`
      : `${participants.length}/${slots || "?"} participant slot(s), ${approvedRegistrations} approved registration(s).`,
  })

  items.push({
    id: "matches",
    tone: matches.length > 0 ? "ready" : "warning",
    label: isUk ? "Матчі згенеровані" : "Matches generated",
    detail: matches.length > 0
      ? isUk ? `${matches.length} матч(ів) прив'язано до турніру.` : `${matches.length} match(es) linked to the tournament.`
      : isUk ? "Після додавання учасників згенеруй структуру/матчі." : "After adding participants, generate the structure/matches.",
  })

  const checkInTone: TournamentHealthTone =
    tournament.check_in_opens_at &&
    tournament.check_in_closes_at &&
    new Date(tournament.check_in_opens_at).getTime() > new Date(tournament.check_in_closes_at).getTime()
      ? "error"
      : tournament.check_in_opens_at && tournament.check_in_closes_at
        ? "ready"
        : "warning"
  items.push({
    id: "check-in",
    tone: checkInTone,
    label: isUk ? "Check-in налаштований" : "Check-in configured",
    detail: checkInTone === "error"
      ? isUk ? "Закриття check-in стоїть раніше за відкриття." : "Check-in closes before it opens."
      : tournament.check_in_opens_at && tournament.check_in_closes_at
        ? isUk ? "Вікно check-in має відкриття і закриття." : "The check-in window has open and close times."
        : isUk ? "Додай час відкриття і закриття check-in." : "Add check-in open and close times.",
  })

  items.push({
    id: "banner",
    tone: tournament.banner_url ? "ready" : "warning",
    label: isUk ? "Банер доданий" : "Banner added",
    detail: tournament.banner_url
      ? isUk ? "Банер буде використано на головній і сторінках турніру." : "The banner is used on the homepage and tournament pages."
      : isUk ? "Без банера сайт покаже стандартний фон." : "Without a banner, the site falls back to the default visual.",
  })

  const hasError = items.some((item) => item.tone === "error")
  const hasWarning = items.some((item) => item.tone === "warning")

  return {
    items,
    tone: hasError ? "error" : hasWarning ? "warning" : "ready",
    label: hasError
      ? isUk ? "Є помилки" : "Has errors"
      : hasWarning
        ? isUk ? "Потребує уваги" : "Needs attention"
        : isUk ? "Готовий" : "Ready",
  }
}

function getSlotHealthDetail(
  definition: ReturnType<typeof getTournamentFormatDefinition>,
  slots: number,
  isUk: boolean,
) {
  const range = definition.maxParticipants
    ? `${definition.minParticipants}-${definition.maxParticipants}`
    : `${definition.minParticipants}+`

  if (!slots) return isUk ? `Вкажи кількість слотів. Для цього формату потрібно ${range}.` : `Set slot count. This format needs ${range}.`
  if (slots < definition.minParticipants) return isUk ? `Замало слотів: потрібно мінімум ${definition.minParticipants}.` : `Too few slots: minimum is ${definition.minParticipants}.`
  if (definition.maxParticipants !== null && slots > definition.maxParticipants) return isUk ? `Забагато слотів: максимум ${definition.maxParticipants}.` : `Too many slots: maximum is ${definition.maxParticipants}.`
  if (definition.id === "single_elimination" && !isPowerOfTwo(slots)) return isUk ? "Для Single Elimination слоти мають бути 2/4/8/16." : "Single Elimination slots should be 2/4/8/16."
  return isUk ? `${slots} слотів підходить для ${definition.label}.` : `${slots} slots fit ${definition.label}.`
}

function isPowerOfTwo(value: number) {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0
}


function TournamentFormatConfigFields({
  definition,
  config,
  isUk,
}: {
  definition: ReturnType<typeof getTournamentFormatDefinition>
  config: ReturnType<typeof normalizeTournamentFormatConfig>
  isUk: boolean
}) {
  const fieldSet = new Set(definition.configurableFields)

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 xl:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            {isUk ? "Налаштування структури" : "Structure settings"}: {definition.label}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/55">{definition.description}</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/60">
          {definition.minParticipants}
          {definition.maxParticipants ? `-${definition.maxParticipants}` : "+"} {isUk ? "учасників" : "participants"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {fieldSet.has("matches_per_opponent") && (
          <AdminField
            label={isUk ? "Матчів проти кожного суперника" : "Matches per opponent"}
            hint={{
              title: isUk ? "1 = один круг, 2 = double round-robin." : "1 = single round, 2 = double round-robin.",
              example: "1 або 2",
            }}
          >
            <input
              name="config_matches_per_opponent"
              type="number"
              min={1}
              max={4}
              step={1}
              defaultValue={config.matches_per_opponent}
              className={inputClassName}
            />
          </AdminField>
        )}

        {fieldSet.has("swiss_rounds") && (
          <AdminField
            label={isUk ? "Кількість Swiss-раундів" : "Swiss rounds"}
            hint={{
              title: isUk ? "Порожньо = система сама порахує рекомендовану кількість." : "Empty = the engine will calculate a recommended round count.",
              example: "5",
            }}
          >
            <input
              name="config_swiss_rounds"
              type="number"
              min={1}
              max={20}
              step={1}
              defaultValue={config.swiss_rounds ?? ""}
              className={inputClassName}
            />
          </AdminField>
        )}

        {fieldSet.has("group_count") && (
          <AdminField
            label={isUk ? "Кількість груп" : "Group count"}
            hint={{
              title: isUk ? "На скільки груп розділити учасників перед плейофом." : "How many groups to split participants into before playoffs.",
              example: "2 або 4",
            }}
          >
            <input
              name="config_group_count"
              type="number"
              min={2}
              max={32}
              step={1}
              defaultValue={config.group_count ?? ""}
              className={inputClassName}
            />
          </AdminField>
        )}

        {fieldSet.has("advancing_per_group") && (
          <AdminField
            label={isUk ? "Виходять з групи" : "Advance per group"}
            hint={{
              title: isUk ? "Скільки найкращих учасників з кожної групи проходять у плейоф." : "How many top participants from each group advance to playoffs.",
              example: "2",
            }}
          >
            <input
              name="config_advancing_per_group"
              type="number"
              min={1}
              max={16}
              step={1}
              defaultValue={config.advancing_per_group}
              className={inputClassName}
            />
          </AdminField>
        )}

        {fieldSet.has("lobby_size") && (
          <AdminField
            label={isUk ? "Розмір лобі" : "Lobby size"}
            hint={{
              title: isUk ? "Скільки учасників одночасно грають в одному матчі/лобі." : "How many participants play in the same match/lobby.",
              example: "8, 16, 32",
            }}
          >
            <input
              name="config_lobby_size"
              type="number"
              min={2}
              max={512}
              step={1}
              defaultValue={config.lobby_size ?? ""}
              className={inputClassName}
            />
          </AdminField>
        )}

        {fieldSet.has("scoring_model") && (
          <AdminField
            label={isUk ? "Модель очок" : "Scoring model"}
            hint={{
              title: isUk ? "Як рахувати позиції у таблиці/лідерборді." : "How standings/leaderboards should calculate placements.",
              example: "Placement + kills",
            }}
          >
            <select name="config_scoring_model" defaultValue={config.scoring_model} className={inputClassName}>
              <option value="match_wins" className="bg-neutral-900 text-white">Match wins</option>
              <option value="points" className="bg-neutral-900 text-white">Points</option>
              <option value="placement" className="bg-neutral-900 text-white">Placement</option>
              <option value="kills_and_placement" className="bg-neutral-900 text-white">Kills + placement</option>
            </select>
          </AdminField>
        )}

        {(fieldSet.has("points_win") || fieldSet.has("points_draw") || fieldSet.has("points_loss")) && (
          <div className="grid gap-3 xl:col-span-2 xl:grid-cols-3">
            <AdminField label={isUk ? "Очки за перемогу" : "Win points"}>
              <input name="config_points_win" type="number" min={0} max={20} step={1} defaultValue={config.points_win} className={inputClassName} />
            </AdminField>
            <AdminField label={isUk ? "Очки за нічию" : "Draw points"}>
              <input name="config_points_draw" type="number" min={0} max={20} step={1} defaultValue={config.points_draw} className={inputClassName} />
            </AdminField>
            <AdminField label={isUk ? "Очки за поразку" : "Loss points"}>
              <input name="config_points_loss" type="number" min={0} max={20} step={1} defaultValue={config.points_loss} className={inputClassName} />
            </AdminField>
          </div>
        )}

        {fieldSet.has("third_place_match") && (
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70 xl:col-span-2">
            <input type="hidden" name="config_third_place_match" value="false" />
            <input
              name="config_third_place_match"
              type="checkbox"
              value="true"
              defaultChecked={config.third_place_match}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-white/85">{isUk ? "Матч за 3 місце" : "Third-place match"}</span>
              <span className="mt-1 block text-xs leading-5 text-white/45">
                {isUk ? "Зберегти цю опцію для майбутнього генератора плейофів." : "Save this option for the playoff generator."}
              </span>
            </span>
          </label>
        )}

        {fieldSet.has("grand_final_reset") && (
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70 xl:col-span-2">
            <input type="hidden" name="config_grand_final_reset" value="false" />
            <input
              name="config_grand_final_reset"
              type="checkbox"
              value="true"
              defaultChecked={config.grand_final_reset}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-white/85">{isUk ? "Grand Final Reset" : "Grand Final Reset"}</span>
              <span className="mt-1 block text-xs leading-5 text-white/45">
                {isUk ? "Якщо переможець нижньої сітки виграє гранд-фінал, створюється reset-фінал." : "If the lower-bracket winner takes grand final, create a reset final."}
              </span>
            </span>
          </label>
        )}

        {definition.configurableFields.length === 0 && (
          <p className="text-sm text-white/50 xl:col-span-2">
            {isUk ? "Для цього формату немає додаткових налаштувань." : "This format has no extra settings."}
          </p>
        )}
      </div>
    </div>
  )
}

function isUkLabel(lang: string, uk: string, en: string) {
  return lang === "uk" ? uk : en
}

function formatParticipantType(type: AdminTournament["participant_type"], lang: string, t: any) {
  return type === "team"
    ? t.admin.tournaments.teamTournamentOption
    : t.admin.tournaments.playerTournamentOption
}

function formatKyivDateTime(value: string | null) {
  return value ? formatKyivCheckInDateWithLabel(value) : "???"
}


function getFieldHints(isUk: boolean) {
  const uk = {
    name: { title: "Повна назва турніру, яку бачитимуть гравці.", example: "Eclyps Winter Cup 2026" },
    game: { title: "Гра, у якій проходитиме турнір. Від вибору залежать формати та конфігурація.", example: "Counter-Strike 2" },
    eventDate: { title: "Дата проведення турніру (день старту).", example: "14.02.2026" },
    format: { title: "Формат матчів — скільки карт/ігор у серії.", example: "BO1, BO3, BO5" },
    tournamentFormat: { title: "Структура турніру. На цьому етапі повністю працює Single Elimination; інші формати підготовлені для наступних engines.", example: "Single Elimination, Round Robin, Swiss" },
    participantType: { title: "Хто змагається: окремі гравці чи команди.", example: "Командний турнір" },
    participantSlots: { title: "Скільки всього місць (учасників) у турнірі.", example: "8, 16, 32" },
    matchDays: { title: "Скільки днів триватимуть матчі турніру.", example: "1, 2, 3" },
    prizePool: { title: "Призовий фонд турніру (текст, як показувати гравцям).", example: "$500 або 10 000 грн" },
    checkInOpens: { title: "Київський час, коли відкривається чек-ін (підтвердження участі).", example: "14.02.2026 12:00" },
    checkInCloses: { title: "Київський час, коли чек-ін закривається. Має бути пізніше за відкриття.", example: "14.02.2026 13:30" },
    arenaTitle: { title: "Назва «арени» — заголовок блоку турніру на сторінці події.", example: "Головна сцена Eclyps" },
    arenaTags: { title: "Короткі теги через кому — платформа, формат, тип. Показуються як мітки.", example: "PC Platform, 5v5 Format, Online" },
    arenaDescription: { title: "Опис арени/турніру: атмосфера, правила, що очікувати глядачам.", example: "Фінальна битва сезону за головний трофей Eclyps." },
    bracketTitle: { title: "Кінематографічний заголовок сітки — великий напис над турнірним деревом.", example: "Live Bracket" },
    bracketSubtitle: { title: "Підзаголовок під назвою сітки — короткий опис.", example: "Tournament Tree" },
    bracketStage: { title: "Мітка поточного етапу сітки.", example: "Grand Final" },
    bracketParticipant: { title: "Як називати учасника у візуалі сітки.", example: "Finalist" },
    bracketArena: { title: "Підпис арени у блоці сітки.", example: "Eclyps Arena" },
  }
  const en = {
    name: { title: "Full tournament name players will see.", example: "Eclyps Winter Cup 2026" },
    game: { title: "Game the tournament runs in. Affects formats and configuration.", example: "Counter-Strike 2" },
    eventDate: { title: "Tournament date (start day).", example: "2026-02-14" },
    format: { title: "Match format — number of maps/games per series.", example: "BO1, BO3, BO5" },
    tournamentFormat: { title: "Tournament structure. Single Elimination is fully working now; other formats are prepared for the next engines.", example: "Single Elimination, Round Robin, Swiss" },
    participantType: { title: "Who competes: individual players or teams.", example: "Team tournament" },
    participantSlots: { title: "Total number of participant slots.", example: "8, 16, 32" },
    matchDays: { title: "How many days the matches span.", example: "1, 2, 3" },
    prizePool: { title: "Prize pool text shown to players.", example: "$500" },
    checkInOpens: { title: "Kyiv time when check-in opens.", example: "2026-02-14 12:00" },
    checkInCloses: { title: "Kyiv time when check-in closes. Must be after it opens.", example: "2026-02-14 13:30" },
    arenaTitle: { title: "Arena name — heading of the tournament block on the event page.", example: "Eclyps Main Stage" },
    arenaTags: { title: "Short comma-separated tags — platform, format, type. Shown as chips.", example: "PC Platform, 5v5 Format, Online" },
    arenaDescription: { title: "Arena/tournament description: vibe, rules, what to expect.", example: "The season finale for the Eclyps trophy." },
    bracketTitle: { title: "Cinematic bracket title — big headline above the tournament tree.", example: "Live Bracket" },
    bracketSubtitle: { title: "Subtitle under the bracket title — short description.", example: "Tournament Tree" },
    bracketStage: { title: "Label for the current bracket stage.", example: "Grand Final" },
    bracketParticipant: { title: "How to label a participant in the bracket visuals.", example: "Finalist" },
    bracketArena: { title: "Arena caption in the bracket block.", example: "Eclyps Arena" },
  }
  return isUk ? uk : en
}
