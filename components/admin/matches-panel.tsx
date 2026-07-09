"use client"

import { useState } from "react"
import type { AdminMatch } from "@/lib/admin/matches"
import type { AdminParticipant } from "@/lib/admin/participants"
import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { formatStatus } from "@/lib/admin/formatters"
import { createTournamentNameMap, getPlayerNames, getTeamNames } from "@/lib/admin/view-helpers"
import { getWinnerSelectionFromParticipantId } from "@/lib/matches/core"
import {
  getCanonicalMatches,
  getHiddenManualDuplicateMatches,
} from "@/lib/matches/deduplicate"
import {
  DEFAULT_MATCH_TIMEZONE,
  formatMatchScheduleTime,
  getScheduleDateInputValueForTimeZone,
  getScheduleTimeInputValueForTimeZone,
} from "@/lib/matches/schedule"
import {
  assignBracketSlot,
  autoGenerateBracket,
  createMatch,
  deleteMatch,
  generateBracketTemplate,
  generateGroupsPlayoffsAction,
  generateNextSwissRoundAction,
  updateBracketMatch,
  updateBracketStatus,
  updateMatch,
} from "@/app/admin/actions"
import { MatchParticipantFields } from "@/components/admin-participant-fields"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import {
  AdminField,
  DeleteForm,
  inputClassName,
  StatusSelect,
  SubmitButton,
  TournamentSelect,
} from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"
import { getAdminFieldHints } from "@/components/admin/admin-field-hints"

const adminFormGridClassName =
  "mt-4 grid gap-x-4 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]"
const adminWideFieldClassName = "[grid-column:1/-1]"

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
  const { t, lang } = useLanguage()
  const tournamentNames = createTournamentNameMap(tournaments)
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)
  const visibleMatches = getCanonicalMatches(matches)
  const hiddenManualDuplicates = getHiddenManualDuplicateMatches(matches)
  const matchFlowIssues = getMatchFlowIssues(visibleMatches, lang)

  return (
    <AdminSection
      id="matches"
      title={t.admin.matches.title}
      description={t.admin.matches.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="matches"
    >
      <MatchFlowMonitor
        matches={visibleMatches}
        issues={matchFlowIssues}
        lang={lang}
      />

      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.matches.createMatch}</h3>
          <MatchForm
            action={createMatch}
            submitLabel={t.admin.matches.createMatch}
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
          />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.matches.existingMatches}</h3>
          {hiddenManualDuplicates.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-100/80">
              {getHiddenDuplicateLabel(hiddenManualDuplicates.length, lang)}
            </div>
          ) : null}
          {visibleMatches.length === 0 ? (
            <AdminEmptyState>{t.admin.matches.noMatchesDb}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {visibleMatches.map((match) => (
                <MatchRecord
                  key={match.id}
                  match={match}
                  tournaments={tournaments}
                  teamNames={teamNames}
                  playerNames={playerNames}
                  tournamentName={
                    match.tournament_id
                      ? tournamentNames.get(match.tournament_id) ?? t.admin.matches.unknownTournament
                      : t.admin.matches.unassigned
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

export function BracketPanel({
  matches,
  tournaments,
  participants,
  fetchError,
  feedback,
}: {
  matches: AdminMatch[]
  tournaments: AdminTournament[]
  participants: AdminParticipant[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t, lang } = useLanguage()
  const tournamentNames = createTournamentNameMap(tournaments)
  const bracketMatches = matches.filter((match) => match.bracket_id)

  return (
    <AdminSection
      id="bracket"
      title={t.admin.tabs.bracket}
      description={t.admin.matches.bracketPanelDescription}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="bracket"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.matches.bracketTemplate}</h3>
          <BracketTemplateForm tournaments={tournaments} matches={bracketMatches} />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.matches.bracketEditor}</h3>
          <BracketEditor
            matches={bracketMatches}
            participants={participants}
            tournamentNames={tournamentNames}
          />
        </article>
      </div>
    </AdminSection>
  )
}

function getHiddenDuplicateLabel(count: number, lang: "uk" | "en") {
  return lang === "uk"
    ? `Приховано ручні дублікати: ${count}. Для турнірної сітки основним є bracket-матч.`
    : `Hidden manual duplicates: ${count}. The bracket match is the canonical match for bracket tournaments.`
}

type MatchFlowIssue = {
  id: string
  matchId: string
  title: string
  description: string
  tone: "error" | "warning"
}

function MatchFlowMonitor({
  matches,
  issues,
  lang,
}: {
  matches: AdminMatch[]
  issues: MatchFlowIssue[]
  lang: "uk" | "en"
}) {
  const isUk = lang === "uk"
  const liveMatches = matches.filter((match) => match.status === "live")
  const upcomingMatches = matches.filter((match) => match.status === "upcoming")
  const finishedMatches = matches.filter((match) => isFinishedMatchStatus(match.status))
  const errorCount = issues.filter((issue) => issue.tone === "error").length

  return (
    <article className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/75">
            {isUk ? "Контроль матчів" : "Match control"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {isUk ? "Стан проведення матчів" : "Match flow state"}
          </h3>
          <p className="mt-1 text-sm text-white/55">
            {isUk
              ? "Швидка перевірка live/upcoming/finished і помилкових станів перед публікацією результатів."
              : "Quick check for live/upcoming/finished and invalid states before publishing results."}
          </p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
          errorCount > 0
            ? "border-red-300/25 bg-red-300/10 text-red-100"
            : issues.length > 0
              ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
              : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
        }`}>
          {errorCount > 0
            ? isUk ? `${errorCount} помилок` : `${errorCount} errors`
            : issues.length > 0
              ? isUk ? `${issues.length} попереджень` : `${issues.length} warnings`
              : isUk ? "Стан чистий" : "Clean"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MatchFlowStat label="Live" value={liveMatches.length} tone={liveMatches.length > 0 ? "ok" : undefined} />
        <MatchFlowStat label={isUk ? "Майбутні" : "Upcoming"} value={upcomingMatches.length} />
        <MatchFlowStat label={isUk ? "Завершені" : "Finished"} value={finishedMatches.length} tone="ok" />
        <MatchFlowStat
          label={isUk ? "Проблеми" : "Issues"}
          value={issues.length}
          tone={errorCount > 0 ? "error" : issues.length > 0 ? "warning" : "ok"}
        />
      </div>

      {issues.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {issues.slice(0, 6).map((issue) => {
            const match = matches.find((item) => item.id === issue.matchId)
            return (
              <a
                key={issue.id}
                href={`/matches/${issue.matchId}`}
                className={`rounded-xl border px-4 py-3 transition hover:bg-white/[0.03] ${
                  issue.tone === "error"
                    ? "border-red-300/20 bg-red-300/10"
                    : "border-amber-300/20 bg-amber-300/10"
                }`}
              >
                <span className="block text-sm font-bold text-white">{issue.title}</span>
                <span className="mt-1 block text-xs leading-5 text-white/60">
                  {match ? `${getMatchLabel(match)} · ` : ""}
                  {issue.description}
                </span>
              </a>
            )
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          {isUk
            ? "Очевидних проблем у матчах не знайдено."
            : "No obvious match flow issues were found."}
        </div>
      )}
    </article>
  )
}

function MatchFlowStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "ok" | "warning" | "error"
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${
      tone === "ok"
        ? "border-emerald-300/20 bg-emerald-300/10"
        : tone === "warning"
          ? "border-amber-300/20 bg-amber-300/10"
          : tone === "error"
            ? "border-red-300/20 bg-red-300/10"
            : "border-white/10 bg-black/20"
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function BracketTemplateForm({
  tournaments,
  matches,
}: {
  tournaments: AdminTournament[]
  matches: AdminMatch[]
}) {
  const { t, lang } = useLanguage()
  const fh = getAdminFieldHints(lang === "uk")
  const [selectedTournamentId, setSelectedTournamentId] = useState("")
  const selectedBracketMatches = selectedTournamentId
    ? matches.filter((match) => match.tournament_id === selectedTournamentId)
    : []
  const selectedBracketStatus = resolveBracketStatus(selectedBracketMatches)
  const hasExistingBracket = selectedBracketMatches.length > 0
  const blocksRegeneration =
    hasExistingBracket &&
    (isLockedBracketStatus(selectedBracketStatus) ||
      selectedBracketMatches.some((match) => match.status === "live" || match.status === "finished"))

  return (
    <>
    <form action={generateBracketTemplate} className={adminFormGridClassName}>
      <AdminField label={t.admin.extra.tournamentLabel}>
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
            <option key={tournament.id} value={tournament.id}>
              {tournament.name ?? t.admin.extra.untitledTournament}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label={t.admin.matches.bracketSizeField} hint={fh.matches.bracketSize}>
        <select name="bracket_size" defaultValue="8" className={inputClassName}>
          <option value="2">{t.admin.extra.participantsSelect.participants2}</option>
          <option value="4">{t.admin.extra.participantsSelect.participants4}</option>
          <option value="8">{t.admin.extra.participantsSelect.participants8}</option>
          <option value="16">{t.admin.extra.participantsSelect.participants16}</option>
        </select>
      </AdminField>
      <label className={`${adminWideFieldClassName} flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/65`}>
        <input
          name="confirm_regenerate"
          type="checkbox"
          disabled={blocksRegeneration}
          className="mt-1 h-4 w-4 accent-emerald-300 animate-none shrink-0"
        />
        <span>
          {t.admin.matches.regenerateDesc}
        </span>
      </label>
      {hasExistingBracket ? (
        <div className={`${adminWideFieldClassName} rounded-xl border px-4 py-3 text-sm leading-6 ${
          blocksRegeneration
            ? "border-red-300/20 bg-red-300/10 text-red-100"
            : "border-amber-300/20 bg-amber-300/10 text-amber-100"
        }`}>
          {blocksRegeneration
            ? getBracketRegenerationBlockedLabel(lang)
            : getBracketRegenerationWarningLabel(lang)}
        </div>
      ) : null}
      <SubmitButton
        label={t.admin.matches.generateBracket}
        disabled={tournaments.length === 0 || blocksRegeneration}
      />
    </form>

    <form action={autoGenerateBracket} className={adminFormGridClassName}>
      <input type="hidden" name="tournament_id" value={selectedTournamentId} />
      <div className={`${adminWideFieldClassName} rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-6 text-emerald-100/90`}>
        {lang === "uk"
          ? "Авто-генерація: розмір сітки та посів учасників визначаться автоматично за обраним методом. Учасникам, яким не вистачило пари, буде надано прохід (bye)."
          : "Auto-generation: bracket size and seeding are determined automatically by the chosen method. Unpaired participants receive a bye."}
      </div>
      <AdminField label={lang === "uk" ? "Метод посіву" : "Seeding method"}>
        <select name="seed_method" defaultValue="rating" className={inputClassName}>
          <option value="rating">{lang === "uk" ? "За рейтингом (посівом)" : "By rating (seed)"}</option>
          <option value="random">{lang === "uk" ? "Випадково (жеребкування)" : "Random draw"}</option>
        </select>
      </AdminField>
      <label className={`${adminWideFieldClassName} flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/65`}>
        <input
          name="confirm_regenerate"
          type="checkbox"
          value="true"
          disabled={blocksRegeneration}
          className="mt-1 h-4 w-4 accent-emerald-300 animate-none shrink-0"
        />
        <span>{t.admin.matches.regenerateDesc}</span>
      </label>
      <SubmitButton
        label={lang === "uk" ? "Згенерувати сітку автоматично" : "Auto-generate bracket"}
        disabled={!selectedTournamentId || tournaments.length === 0 || blocksRegeneration}
      />
    </form>
    </>
  )
}

function BracketEditor({
  matches,
  participants,
  tournamentNames,
}: {
  matches: AdminMatch[]
  participants: AdminParticipant[]
  tournamentNames: Map<string, string>
}) {
  const { t, lang } = useLanguage()
  const bracketMatches = matches.filter((match) => match.bracket_id)

  if (bracketMatches.length === 0) {
    return <AdminEmptyState>{t.admin.matches.noBracketTemplate}</AdminEmptyState>
  }

  const getDisplayBracketStatus = (statusStr: BracketLifecycleStatus) => {
    return statusStr === "template"
      ? t.admin.extra.bracketLabels.template
      : statusStr === "locked"
      ? t.admin.extra.bracketLabels.locked
      : statusStr === "active"
      ? t.admin.extra.bracketLabels.active
      : t.admin.extra.bracketLabels.finished
  }

  return (
    <div className="mt-4 space-y-5">
      {groupBracketMatches(bracketMatches).map((bracket) => {
        const bracketParticipants = participants.filter(
          (participant) => participant.tournament_id === bracket.tournamentId,
        )
        const assignedIds = getAssignedParticipantIds(bracket.matches)
        const bracketIssues = getBracketIssues(bracket.matches, bracketParticipants, lang)

        return (
          <div key={bracket.bracketId} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-medium">
                  {tournamentNames.get(bracket.tournamentId) ?? t.admin.matches.unknownTournament}
                </h4>
                <p className="mt-1 text-sm text-white/50">
                  {getDisplayBracketStatus(bracket.status)} {t.admin.extra.bracketLabels.bracket}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={pillClassName}>{getDisplayBracketStatus(bracket.status)}</span>
                <span className={pillClassName}>{bracket.matches.length}{t.admin.matches.matchesCount}</span>
              </div>
            </div>

            {bracketIssues.length > 0 ? (
              <div className="mt-4 space-y-2">
                {bracketIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
                      issue.tone === "error"
                        ? "border-red-300/20 bg-red-300/10 text-red-100"
                        : "border-amber-300/20 bg-amber-300/10 text-amber-100"
                    }`}
                  >
                    <span className="font-bold">{issue.title}</span>
                    <span className="block text-white/60">{issue.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                {getBracketLooksOkLabel(lang)}
              </div>
            )}

            <BracketStatusControls
              bracketId={bracket.bracketId}
              tournamentId={bracket.tournamentId}
              status={bracket.status}
            />
            <BracketFormatControls
              bracketId={bracket.bracketId}
              tournamentId={bracket.tournamentId}
              bracketType={bracket.type}
              matches={bracket.matches}
            />

            <ParticipantPool
              participants={bracketParticipants}
              assignedIds={assignedIds}
            />

            <div className="mt-4 space-y-4">
              {bracket.rounds.map((round) => (
                <div key={`${bracket.bracketId}-${round.label}`} className="space-y-3">
                  <h5 className="text-sm font-medium text-emerald-300">{round.label}</h5>
                  <div className="grid gap-3">
                    {round.matches.map((match) => (
                      <BracketMatchCard
                        key={match.id}
                        match={match}
                        bracketStatus={bracket.status}
                        participants={bracketParticipants}
                        assignedIds={assignedIds}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BracketStatusControls({
  bracketId,
  tournamentId,
  status,
}: {
  bracketId: string
  tournamentId: string
  status: string
}) {
  const { t } = useLanguage()
  const isLocked = isLockedBracketStatus(status)
  const statusLabel = isLocked
    ? t.admin.matches.bracketLockedStatus
    : t.admin.matches.bracketEditableStatus
  const statusDescription = isLocked
    ? t.admin.matches.bracketLockedDesc
    : t.admin.matches.bracketUnlockedDesc

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
        <span className="font-medium text-white">{statusLabel}</span>
        <p className="mt-1 text-xs leading-5 text-white/50">{statusDescription}</p>
      </div>
      {!isLocked ? (
      <form action={updateBracketStatus}>
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="bracket_id" value={bracketId} />
        <input type="hidden" name="action" value="lock" />
        <button
          type="submit"
          disabled={isLocked}
          className="w-full rounded-xl bg-emerald-300 px-3 py-2 text-sm font-medium text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
        >
          {t.admin.matches.lockBracket}
        </button>
      </form>
      ) : (
      <form
        action={updateBracketStatus}
        onSubmit={(event) => {
          if (!window.confirm(t.admin.matches.unlockBracketWarning)) {
            event.preventDefault()
          }
        }}
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="bracket_id" value={bracketId} />
        <input type="hidden" name="action" value="unlock" />
        <button
          type="submit"
          disabled={!isLocked}
          className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/35"
        >
          {t.admin.matches.unlockBracket}
        </button>
      </form>
      )}
    </div>
  )
}

function BracketFormatControls({
  bracketId,
  tournamentId,
  bracketType,
  matches,
}: {
  bracketId: string
  tournamentId: string
  bracketType: string | null
  matches: AdminMatch[]
}) {
  const { lang } = useLanguage()

  if (bracketType === "swiss") {
    const latestRound = Math.max(...matches.map((match) => match.round_order ?? 0))
    const latestRoundMatches = matches.filter((match) => (match.round_order ?? 0) === latestRound)
    const canGenerate = latestRound > 0 && latestRoundMatches.length > 0 && latestRoundMatches.every((match) => match.status === "finished")

    return (
      <form action={generateNextSwissRoundAction} className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="bracket_id" value={bracketId} />
        <p className="mb-3 text-xs leading-5 text-white/55">
          {lang === "uk"
            ? "Створює наступний Swiss round після завершення поточного раунду."
            : "Creates the next Swiss round after the current round is finished."}
        </p>
        <button
          type="submit"
          disabled={!canGenerate}
          className="w-full rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/50 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35"
        >
          {lang === "uk" ? "Згенерувати наступний Swiss round" : "Generate next Swiss round"}
        </button>
      </form>
    )
  }

  if (bracketType === "groups_then_playoffs") {
    const hasPlayoffs = matches.some((match) => !isGroupStageRoundLabel(match.bracket_round ?? match.round))
    const groupMatches = matches.filter((match) => isGroupStageRoundLabel(match.bracket_round ?? match.round))
    const canGenerate = !hasPlayoffs && groupMatches.length > 0 && groupMatches.every((match) => match.status === "finished")

    return (
      <form action={generateGroupsPlayoffsAction} className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="bracket_id" value={bracketId} />
        <p className="mb-3 text-xs leading-5 text-white/55">
          {lang === "uk"
            ? "Створює playoff bracket після завершення всіх групових матчів."
            : "Creates the playoff bracket after all group matches are finished."}
        </p>
        <button
          type="submit"
          disabled={!canGenerate}
          className="w-full rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/50 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35"
        >
          {lang === "uk" ? "Згенерувати playoffs" : "Generate playoffs"}
        </button>
      </form>
    )
  }

  return null
}

function ParticipantPool({
  participants,
  assignedIds,
}: {
  participants: AdminParticipant[]
  assignedIds: Set<string>
}) {
  const { t } = useLanguage()
  if (participants.length === 0) {
    return <p className="mt-4 text-sm text-white/45">{t.admin.matches.noParticipants}</p>
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {participants.map((participant) => (
        <span
          key={participant.id}
          className={`${pillClassName} ${assignedIds.has(participant.id) ? "opacity-50" : ""}`}
        >
          {participant.display_name}
          {assignedIds.has(participant.id) ? t.admin.matches.assigned : ""}
        </span>
      ))}
    </div>
  )
}

function BracketMatchCard({
  match,
  bracketStatus,
  participants,
  assignedIds,
}: {
  match: AdminMatch
  bracketStatus: BracketLifecycleStatus
  participants: AdminParticipant[]
  assignedIds: Set<string>
}) {
  const { t } = useLanguage()
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>{match.round ?? match.bracket_round ?? t.admin.matches.bracketRound}</span>
        <span>{t.admin.matches.positionLabel}{match.bracket_position ?? "???"}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BracketSlotForm
          match={match}
          slot={1}
          value={match.participant_1_id}
          label={match.team1 ?? t.admin.matches.emptySlot}
          bracketStatus={bracketStatus}
          participants={participants}
          assignedIds={assignedIds}
        />
        <BracketSlotForm
          match={match}
          slot={2}
          value={match.participant_2_id}
          label={match.team2 ?? t.admin.matches.emptySlot}
          bracketStatus={bracketStatus}
          participants={participants}
          assignedIds={assignedIds}
        />
      </div>
      <BracketMatchResultForm match={match} bracketStatus={bracketStatus} />
    </div>
  )
}

function BracketMatchResultForm({
  match,
  bracketStatus,
}: {
  match: AdminMatch
  bracketStatus: BracketLifecycleStatus
}) {
  const { t, lang } = useLanguage()
  const fh = getAdminFieldHints(lang === "uk")
  const isBracketFinished = bracketStatus === "finished"
  const hasParticipants = Boolean(match.participant_1_id && match.participant_2_id)
  const disabled = isBracketFinished || !hasParticipants

  return (
    <form action={updateBracketMatch} className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
      <input type="hidden" name="tournament_id" value={match.tournament_id ?? ""} />
      <input type="hidden" name="match_id" value={match.id} />
      {isBracketFinished && (
        <p className="text-xs text-white/45 sm:col-span-2">
          {t.admin.matches.bracketLockedDesc}
        </p>
      )}
      {!isBracketFinished && !hasParticipants && (
        <p className="text-xs text-white/45 sm:col-span-2">
          {t.admin.matches.bracketMatchIncompleteDesc}
        </p>
      )}
      <StatusSelect value={match.status} disabled={disabled} />
      <WinnerSelect match={match} disabled={disabled} />
      <AdminField label={t.admin.matches.score1Field} hint={fh.matches.score1}>
        <input
          name="score1"
          type="number"
          min={0}
          step={1}
          defaultValue={match.score1 ?? ""}
          disabled={disabled}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.score2Field} hint={fh.matches.score2}>
        <input
          name="score2"
          type="number"
          min={0}
          step={1}
          defaultValue={match.score2 ?? ""}
          disabled={disabled}
          className={inputClassName}
        />
      </AdminField>
      <SubmitButton label={t.admin.matches.saveMatch} disabled={disabled} />
    </form>
  )
}

function BracketSlotForm({
  match,
  slot,
  value,
  label,
  bracketStatus,
  participants,
  assignedIds,
}: {
  match: AdminMatch
  slot: 1 | 2
  value: string | null
  label: string
  bracketStatus: BracketLifecycleStatus
  participants: AdminParticipant[]
  assignedIds: Set<string>
}) {
  const { t } = useLanguage()
  const disabled =
    match.status === "live" || match.status === "finished" || isLockedBracketStatus(bracketStatus)

  return (
    <form action={assignBracketSlot} className="space-y-2">
      <input type="hidden" name="tournament_id" value={match.tournament_id ?? ""} />
      <input type="hidden" name="match_id" value={match.id} />
      <input type="hidden" name="slot" value={slot} />
      <label className="block space-y-2 text-sm text-white/75">
        <span className="block">{t.admin.matches.slotLabel} {slot}: {label}</span>
        <select
          name="participant_id"
          defaultValue={value ?? ""}
          disabled={disabled}
          className={inputClassName}
        >
          <option value="">{t.admin.matches.emptySlot}</option>
          {participants.map((participant) => {
            const assignedElsewhere = assignedIds.has(participant.id) && participant.id !== value

            return (
              <option
                key={participant.id}
                value={participant.id}
                disabled={assignedElsewhere}
              >
                {participant.display_name}
                {assignedElsewhere ? t.admin.matches.assigned : ""}
              </option>
            )
          })}
        </select>
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-xl bg-emerald-300 px-3 py-2 text-sm font-medium text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
      >
        {t.admin.matches.saveSlot}
      </button>
    </form>
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
  const { t, lang } = useLanguage()
  const isBracketMatch = Boolean(match.bracket_id)
  const matchIssues = getSingleMatchFlowIssues(match, lang)

  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">
              {match.team1 ?? "TBD"} vs {match.team2 ?? "TBD"}
            </h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {tournamentName} {"\u2022"} {match.round ?? match.bracket_round ?? t.admin.matches.noRound}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs items-center">
            <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
              isBracketMatch
                ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}>
              {isBracketMatch ? t.admin.matches.bracketType : t.admin.matches.manualType}
            </span>
            <span className={pillClassName}>{formatStatus(match.status)}</span>
            <span className={pillClassName}>
              {match.score1 ?? "???"} : {match.score2 ?? "???"}
            </span>
            {matchIssues.length > 0 ? (
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                matchIssues.some((issue) => issue.tone === "error")
                  ? "border-red-300/25 bg-red-300/10 text-red-100"
                  : "border-amber-300/25 bg-amber-300/10 text-amber-100"
              }`}>
                {lang === "uk" ? "Потребує уваги" : "Needs review"}
              </span>
            ) : null}
            {match.match_order !== null && (
              <span className={pillClassName}>{t.admin.matches.orderLabel}{match.match_order}</span>
            )}
            <span className={pillClassName}>
              {formatMatchScheduleTime({
                scheduledAt: match.scheduled_at,
                timezone: match.timezone,
                scheduleNote: match.schedule_note,
              })}
            </span>
            <a
              href={`/matches/${match.id}`}
              className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 transition hover:border-emerald-300/45"
            >
              {t.admin.matches.viewPublicMatch}
            </a>
          </div>
        </div>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-4">
        {isBracketMatch && (
          <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-950/40 p-4 text-sm text-indigo-200 leading-relaxed">
            <p className="font-semibold text-white">{t.admin.matches.bracketDetailsTitle}</p>
            <p className="mt-2 text-xs text-white/60">
              {t.admin.matches.bracketDetailsDesc}
            </p>
          </div>
        )}
        {matchIssues.length > 0 ? (
          <div className="mb-4 space-y-2">
            {matchIssues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
                  issue.tone === "error"
                    ? "border-red-300/20 bg-red-300/10 text-red-100"
                    : "border-amber-300/20 bg-amber-300/10 text-amber-100"
                }`}
              >
                <span className="font-bold">{issue.title}</span>
                <span className="block text-white/60">{issue.description}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <MatchForm
            action={updateMatch}
            submitLabel={t.admin.matches.saveChanges}
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
            match={match}
            mode={isBracketMatch ? "bracket" : "standard"}
          />
          {!isBracketMatch && <DeleteForm action={deleteMatch} id={match.id} />}
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
  mode = "standard",
}: {
  action: AdminFormAction
  submitLabel: string
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  match?: AdminMatch
  mode?: "standard" | "bracket"
}) {
  const { t, lang } = useLanguage()
  const fh = getAdminFieldHints(lang === "uk")
  const isBracket = mode === "bracket"

  return (
    <form action={action} className={adminFormGridClassName}>
      {match && <input type="hidden" name="id" value={match.id} />}
      {isBracket ? (
        <>
          <input type="hidden" name="tournament_id" value={match?.tournament_id ?? ""} />
          <input type="hidden" name="participant_type" value={match?.participant_type ?? ""} />
          <input type="hidden" name="team1" value={match?.team1 ?? "TBD"} />
          <input type="hidden" name="team2" value={match?.team2 ?? "TBD"} />
          <input type="hidden" name="round" value={match?.round ?? match?.bracket_round ?? ""} />

          <div className={`${adminWideFieldClassName} rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm space-y-2`}>
            <div>
              <span className="text-white/45 font-medium">{t.admin.matches.tournamentField}: </span>
              <span className="text-white/80">{
                match?.tournament_id
                  ? tournaments.find(tItem => tItem.id === match.tournament_id)?.name ?? t.admin.matches.unknownTournament
                  : t.admin.matches.unassigned
              }</span>
            </div>
            <div>
              <span className="text-white/45 font-medium">{t.admin.matches.roundField}: </span>
              <span className="text-white/80">{match?.round ?? match?.bracket_round ?? t.admin.matches.bracketRound}</span>
            </div>
            <div>
              <span className="text-white/45 font-medium">{t.admin.matches.participant1Field}: </span>
              <span className="text-emerald-300 font-semibold">{match?.team1 ?? "TBD"}</span>
            </div>
            <div>
              <span className="text-white/45 font-medium">{t.admin.matches.participant2Field}: </span>
              <span className="text-emerald-300 font-semibold">{match?.team2 ?? "TBD"}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <TournamentSelect tournaments={tournaments} value={match?.tournament_id} />
          <AdminField label={t.admin.matches.roundField} hint={fh.matches.round}>
            <input name="round" defaultValue={match?.round ?? ""} className={inputClassName} />
          </AdminField>
          <MatchParticipantFields
            initialType={match?.participant_type}
            teamNames={teamNames}
            playerNames={playerNames}
            team1={match?.team1}
            team2={match?.team2}
          />
        </>
      )}
      <AdminField label={t.admin.matches.score1Field} hint={fh.matches.score1}>
        <input name="score1" type="number" defaultValue={match?.score1 ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.matches.score2Field} hint={fh.matches.score2}>
        <input name="score2" type="number" defaultValue={match?.score2 ?? ""} className={inputClassName} />
      </AdminField>
      <StatusSelect value={match?.status} />
      <WinnerSelect match={match} />
      <AdminField label={t.admin.matches.scheduleDateField} hint={fh.matches.scheduleDate}>
        <input
          name="schedule_date"
          type="date"
          defaultValue={getScheduleDateInputValueForTimeZone(
            match?.scheduled_at,
            match?.timezone,
          )}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.scheduleTimeField} hint={fh.matches.scheduleTime}>
        <input
          name="schedule_time"
          type="time"
          defaultValue={getScheduleTimeInputValueForTimeZone(
            match?.scheduled_at,
            match?.timezone,
          )}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.timezoneField} hint={fh.matches.timezone}>
        <input
          name="timezone"
          defaultValue={match?.timezone ?? DEFAULT_MATCH_TIMEZONE}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.scheduleNoteField} hint={fh.matches.scheduleNote}>
        <input
          name="schedule_note"
          defaultValue={match?.schedule_note ?? ""}
          placeholder="Time TBA"
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.channelTypeField} hint={fh.matches.channelType}>
        <select
          name="broadcast_type"
          defaultValue={match?.broadcast_type ?? "other"}
          className={inputClassName}
        >
          <option value="twitch">Twitch</option>
          <option value="youtube">YouTube</option>
          <option value="kick">Kick</option>
          <option value="discord">{t.admin.matches.discordVoiceChannel}</option>
          <option value="other">{t.admin.matches.otherChannelLink}</option>
        </select>
      </AdminField>
      <AdminField label={t.admin.matches.channelUrlField} hint={fh.matches.channelUrl}>
        <input
          name="broadcast_url"
          type="url"
          inputMode="url"
          defaultValue={match?.broadcast_url ?? ""}
          placeholder="https://"
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.channelLabelField} hint={fh.matches.channelLabel}>
        <input
          name="broadcast_label"
          defaultValue={match?.broadcast_label ?? ""}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.matchOrderField} hint={fh.matches.matchOrder}>
        <input name="match_order" type="number" min={1} step={1} defaultValue={match?.match_order ?? ""} required className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}

function WinnerSelect({ match, disabled = false }: { match?: AdminMatch; disabled?: boolean }) {
  const { t, lang } = useLanguage()
  const fh = getAdminFieldHints(lang === "uk")
  return (
    <AdminField label={t.admin.matches.winnerField} hint={fh.matches.winner}>
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
        disabled={disabled}
        className={inputClassName}
      >
        <option value="">{t.admin.matches.autoNone}</option>
        <option value="participant_1">{match?.team1 ?? t.admin.matches.participant1}</option>
        <option value="participant_2">{match?.team2 ?? t.admin.matches.participant2}</option>
      </select>
    </AdminField>
  )
}

type BracketLifecycleStatus = "template" | "locked" | "active" | "finished"

type BracketIssue = {
  id: string
  title: string
  description: string
  tone: "error" | "warning"
}

function groupBracketMatches(matches: AdminMatch[]) {
  const bracketMap = new Map<string, AdminMatch[]>()

  matches.forEach((match) => {
    if (!match.bracket_id || !match.tournament_id) return

    const key = `${match.tournament_id}:${match.bracket_id}`
    bracketMap.set(key, [...(bracketMap.get(key) ?? []), match])
  })

  return Array.from(bracketMap.entries()).map(([key, bracketMatches]) => {
    const [tournamentId, bracketId] = key.split(":")
    const sortedMatches = [...bracketMatches].sort(compareBracketMatches)
    const roundMap = new Map<string, AdminMatch[]>()

    sortedMatches.forEach((match) => {
      const label = match.bracket_round ?? match.round ?? "Bracket round"
      roundMap.set(label, [...(roundMap.get(label) ?? []), match])
    })

    return {
      tournamentId,
      bracketId,
      type: sortedMatches.find((match) => match.bracket_type)?.bracket_type ?? null,
      status: resolveBracketStatus(sortedMatches),
      hasActiveMatches: sortedMatches.some(
        (match) => match.status === "live" || match.status === "finished",
      ),
      matches: sortedMatches,
      rounds: Array.from(roundMap.entries()).map(([label, roundMatches]) => ({
        label,
        matches: roundMatches,
      })),
    }
  })
}

function compareBracketMatches(left: AdminMatch, right: AdminMatch) {
  return (
    (left.round_order ?? Number.MAX_SAFE_INTEGER) -
      (right.round_order ?? Number.MAX_SAFE_INTEGER) ||
    (left.bracket_position ?? Number.MAX_SAFE_INTEGER) -
      (right.bracket_position ?? Number.MAX_SAFE_INTEGER) ||
    (left.match_order ?? Number.MAX_SAFE_INTEGER) -
      (right.match_order ?? Number.MAX_SAFE_INTEGER)
  )
}

function getAssignedParticipantIds(matches: AdminMatch[]) {
  const ids = new Set<string>()

  matches.forEach((match) => {
    if (match.participant_1_id) ids.add(match.participant_1_id)
    if (match.participant_2_id) ids.add(match.participant_2_id)
  })

  return ids
}

function isLockedBracketStatus(status: string | null) {
  return status === "locked" || status === "active" || status === "finished"
}

function resolveBracketStatus(matches: AdminMatch[]): BracketLifecycleStatus {
  const matchStatuses = matches.map((match) => match.status)
  if (matchStatuses.length > 0 && matchStatuses.every((status) => status === "finished")) {
    return "finished"
  }

  if (matchStatuses.some((status) => status === "live" || status === "finished")) {
    return "active"
  }

  const storedStatuses = matches.map((match) => normalizeBracketStatus(match.bracket_status))
  if (storedStatuses.includes("locked")) return "locked"
  if (storedStatuses.includes("active")) return "active"
  if (storedStatuses.includes("finished")) return "finished"

  return "template"
}

function normalizeBracketStatus(status: string | null): BracketLifecycleStatus {
  if (status === "locked" || status === "active" || status === "finished") {
    return status
  }

  return "template"
}

function isGroupStageRoundLabel(label: string | null | undefined) {
  if (!label) return false
  return /^(Group\s+([A-Z]+|\d+))\s+-\s+Round\s+\d+$/i.test(label)
}

function getBracketIssues(
  matches: AdminMatch[],
  participants: AdminParticipant[],
  lang: "uk" | "en",
): BracketIssue[] {
  const issues: BracketIssue[] = []
  const isUk = lang === "uk"
  const initialMatches = getInitialRoundMatches(matches)
  const initialSlotCount = initialMatches.length * 2
  const assignedInitialSlotCount = initialMatches.reduce((count, match) => {
    return count + (match.participant_1_id ? 1 : 0) + (match.participant_2_id ? 1 : 0)
  }, 0)

  if (initialSlotCount > 0 && participants.length < initialSlotCount) {
    issues.push({
      id: "not-enough-participants",
      title: isUk ? "Недостатньо учасників для сітки" : "Not enough participants for this bracket",
      description: isUk
        ? `У турнірі є ${participants.length} учасник(ів), а стартова сітка має ${initialSlotCount} слот(ів).`
        : `The tournament has ${participants.length} participant(s), but the first round has ${initialSlotCount} slot(s).`,
      tone: "warning",
    })
  }

  if (initialSlotCount > 0 && assignedInitialSlotCount < Math.min(participants.length, initialSlotCount)) {
    issues.push({
      id: "unassigned-initial-slots",
      title: isUk ? "Не всі учасники розставлені в сітці" : "Not all participants are assigned",
      description: isUk
        ? `У стартовому раунді заповнено ${assignedInitialSlotCount} з ${Math.min(participants.length, initialSlotCount)} доступних місць.`
        : `The first round has ${assignedInitialSlotCount} of ${Math.min(participants.length, initialSlotCount)} available slots filled.`,
      tone: "warning",
    })
  }

  const activeIncompleteMatches = matches.filter(
    (match) =>
      (match.status === "live" || isFinishedMatchStatus(match.status)) &&
      (!match.participant_1_id || !match.participant_2_id),
  )

  if (activeIncompleteMatches.length > 0) {
    issues.push({
      id: "active-incomplete-matches",
      title: isUk ? "Активний/завершений матч без учасника" : "Active or finished match missing a participant",
      description: isUk
        ? `${activeIncompleteMatches.length} матч(ів) вже мають статус live/finished, але слот учасника порожній.`
        : `${activeIncompleteMatches.length} match(es) are live/finished but still have an empty participant slot.`,
      tone: "error",
    })
  }

  const finishedWithoutWinnerCount = matches.filter(
    (match) => isFinishedMatchStatus(match.status) && !match.winner_participant_id,
  ).length

  if (finishedWithoutWinnerCount > 0) {
    issues.push({
      id: "finished-without-winner",
      title: isUk ? "Завершений матч без переможця" : "Finished match missing winner",
      description: isUk
        ? `${finishedWithoutWinnerCount} завершений матч(і) не мають переможця.`
        : `${finishedWithoutWinnerCount} finished match(es) do not have a winner.`,
      tone: "error",
    })
  }

  const finishedWithoutScoreCount = matches.filter(
    (match) => isFinishedMatchStatus(match.status) && (match.score1 === null || match.score2 === null),
  ).length

  if (finishedWithoutScoreCount > 0) {
    issues.push({
      id: "finished-without-score",
      title: isUk ? "Завершений матч без повного рахунку" : "Finished match missing score",
      description: isUk
        ? `${finishedWithoutScoreCount} завершений матч(і) не мають повного рахунку.`
        : `${finishedWithoutScoreCount} finished match(es) do not have a complete score.`,
      tone: "error",
    })
  }

  const scoreWithoutFinishedStatusCount = matches.filter(
    (match) =>
      !isFinishedMatchStatus(match.status) &&
      match.score1 !== null &&
      match.score2 !== null,
  ).length

  if (scoreWithoutFinishedStatusCount > 0) {
    issues.push({
      id: "score-without-finished-status",
      title: isUk ? "Є рахунок, але матч не завершений" : "Score is set but match is not finished",
      description: isUk
        ? `${scoreWithoutFinishedStatusCount} матч(ів) мають рахунок, але статус ще не finished.`
        : `${scoreWithoutFinishedStatusCount} match(es) have a score, but the status is not finished.`,
      tone: "warning",
    })
  }

  const winnerMismatchCount = matches.filter(hasWinnerScoreMismatch).length

  if (winnerMismatchCount > 0) {
    issues.push({
      id: "winner-score-mismatch",
      title: isUk ? "Переможець не відповідає рахунку" : "Winner does not match the score",
      description: isUk
        ? `${winnerMismatchCount} матч(ів) мають переможця, який не збігається з рахунком.`
        : `${winnerMismatchCount} match(es) have a winner that does not match the score.`,
      tone: "error",
    })
  }

  return issues
}

function getMatchFlowIssues(matches: AdminMatch[], lang: "uk" | "en"): MatchFlowIssue[] {
  return matches.flatMap((match) => getSingleMatchFlowIssues(match, lang))
}

function getSingleMatchFlowIssues(match: AdminMatch, lang: "uk" | "en"): MatchFlowIssue[] {
  const isUk = lang === "uk"
  const issues: MatchFlowIssue[] = []
  const label = getMatchLabel(match)

  if (
    (match.status === "live" || isFinishedMatchStatus(match.status)) &&
    (!hasFirstParticipant(match) || !hasSecondParticipant(match))
  ) {
    issues.push({
      id: `${match.id}:missing-participant`,
      matchId: match.id,
      title: isUk ? "Матч без учасника" : "Match missing participant",
      description: isUk
        ? `${label}: live/finished матч має порожній слот учасника.`
        : `${label}: live/finished match has an empty participant slot.`,
      tone: "error",
    })
  }

  if (isFinishedMatchStatus(match.status) && (match.score1 === null || match.score2 === null)) {
    issues.push({
      id: `${match.id}:missing-score`,
      matchId: match.id,
      title: isUk ? "Немає повного рахунку" : "Missing complete score",
      description: isUk
        ? "Finished матч має мати обидва значення рахунку."
        : "Finished match must have both score values.",
      tone: "error",
    })
  }

  if (isFinishedMatchStatus(match.status) && !match.winner_participant_id) {
    issues.push({
      id: `${match.id}:missing-winner`,
      matchId: match.id,
      title: isUk ? "Немає переможця" : "Missing winner",
      description: isUk
        ? "Finished матч має мати визначеного переможця."
        : "Finished match must have a resolved winner.",
      tone: "error",
    })
  }

  if (
    !isFinishedMatchStatus(match.status) &&
    match.score1 !== null &&
    match.score2 !== null
  ) {
    issues.push({
      id: `${match.id}:score-before-finished`,
      matchId: match.id,
      title: isUk ? "Рахунок без finished" : "Score without finished status",
      description: isUk
        ? "Якщо рахунок фінальний, зміни статус матчу на finished."
        : "If this score is final, change the match status to finished.",
      tone: "warning",
    })
  }

  if (hasWinnerScoreMismatch(match)) {
    issues.push({
      id: `${match.id}:winner-score-mismatch`,
      matchId: match.id,
      title: isUk ? "Winner не відповідає рахунку" : "Winner does not match score",
      description: isUk
        ? "Обраний переможець не збігається з більшим рахунком."
        : "Selected winner does not match the higher score.",
      tone: "error",
    })
  }

  return issues
}

function hasFirstParticipant(match: AdminMatch) {
  return Boolean(match.participant_1_id || match.team1)
}

function hasSecondParticipant(match: AdminMatch) {
  return Boolean(match.participant_2_id || match.team2)
}

function getMatchLabel(match: AdminMatch) {
  return `${match.team1 ?? "TBD"} vs ${match.team2 ?? "TBD"}`
}

function getInitialRoundMatches(matches: AdminMatch[]) {
  const roundOrder = Math.min(
    ...matches.map((match) => match.round_order ?? Number.MAX_SAFE_INTEGER),
  )

  if (!Number.isFinite(roundOrder)) {
    return []
  }

  return matches.filter((match) => (match.round_order ?? Number.MAX_SAFE_INTEGER) === roundOrder)
}

function hasWinnerScoreMismatch(match: AdminMatch) {
  if (
    !match.winner_participant_id ||
    !match.participant_1_id ||
    !match.participant_2_id ||
    match.score1 === null ||
    match.score2 === null ||
    match.score1 === match.score2
  ) {
    return false
  }

  const expectedWinnerId =
    match.score1 > match.score2 ? match.participant_1_id : match.participant_2_id

  return match.winner_participant_id !== expectedWinnerId
}

function isFinishedMatchStatus(status: string | null) {
  return status === "finished" || status === "completed" || status === "final"
}

function getBracketRegenerationWarningLabel(lang: "uk" | "en") {
  return lang === "uk"
    ? "У цього турніру вже є сітка. Перегенерація видалить поточні bracket-матчі, тому підтвердження нижче обов'язкове."
    : "This tournament already has a bracket. Regeneration deletes current bracket matches, so the confirmation below is required."
}

function getBracketRegenerationBlockedLabel(lang: "uk" | "en") {
  return lang === "uk"
    ? "Цю сітку не можна перегенерувати: вона locked, active або вже має live/finished матчі."
    : "This bracket cannot be regenerated: it is locked, active, or already has live/finished matches."
}

function getBracketLooksOkLabel(lang: "uk" | "en") {
  return lang === "uk"
    ? "Очевидних проблем у цій сітці не знайдено."
    : "No obvious issues were found in this bracket."
}
