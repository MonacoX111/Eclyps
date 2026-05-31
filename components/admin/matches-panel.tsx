"use client"

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
  DEFAULT_MATCH_TIMEZONE,
  formatMatchScheduleTime,
  getScheduleDateInputValue,
  getScheduleTimeInputValue,
} from "@/lib/matches/schedule"
import { assignBracketSlot, createMatch, deleteMatch, generateBracketTemplate, updateBracketMatch, updateBracketStatus, updateMatch } from "@/app/admin/actions"
import { MatchParticipantFields } from "@/components/admin-participant-fields"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, StatusSelect, SubmitButton, TournamentSelect } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"

export function MatchesPanel({
  matches,
  tournaments,
  teams,
  players,
  participants,
  fetchError,
  feedback,
}: {
  matches: AdminMatch[]
  tournaments: AdminTournament[]
  teams: AdminTeam[]
  players: AdminPlayer[]
  participants: AdminParticipant[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t, lang } = useLanguage()
  const tournamentNames = createTournamentNameMap(tournaments)
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)
  const bracketMatches = matches.filter((match) => match.bracket_id)

  return (
    <AdminSection
      id="matches"
      title={t.admin.matches.title}
      description={t.admin.matches.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="matches"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.matches.bracketTemplate}</h3>
          <BracketTemplateForm tournaments={tournaments} />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.matches.bracketEditor}</h3>
          <BracketEditor
            matches={bracketMatches}
            participants={participants}
            tournamentNames={tournamentNames}
          />
        </article>

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
          {matches.length === 0 ? (
            <AdminEmptyState>{t.admin.matches.noMatchesDb}</AdminEmptyState>
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

function BracketTemplateForm({
  tournaments,
}: {
  tournaments: AdminTournament[]
}) {
  const { t, lang } = useLanguage()
  return (
    <form action={generateBracketTemplate} className="mt-4 grid gap-3 sm:grid-cols-2">
      <TournamentSelect tournaments={tournaments} />
      <AdminField label={t.admin.matches.bracketSizeField}>
        <select name="bracket_size" defaultValue="8" className={inputClassName}>
          <option value="2">{t.admin.extra.participantsSelect.participants2}</option>
          <option value="4">{t.admin.extra.participantsSelect.participants4}</option>
          <option value="8">{t.admin.extra.participantsSelect.participants8}</option>
          <option value="16">{t.admin.extra.participantsSelect.participants16}</option>
        </select>
      </AdminField>
      <label className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/65 sm:col-span-2">
        <input
          name="confirm_regenerate"
          type="checkbox"
          className="mt-1 h-4 w-4 accent-emerald-300 animate-none shrink-0"
        />
        <span>
          {t.admin.matches.regenerateDesc}
        </span>
      </label>
      <SubmitButton label={t.admin.matches.generateBracket} disabled={tournaments.length === 0} />
    </form>
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

            <BracketStatusControls
              bracketId={bracket.bracketId}
              tournamentId={bracket.tournamentId}
              status={bracket.status}
              hasActiveMatches={bracket.hasActiveMatches}
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
  hasActiveMatches,
}: {
  bracketId: string
  tournamentId: string
  status: string
  hasActiveMatches: boolean
}) {
  const { t } = useLanguage()
  const isLocked = isLockedBracketStatus(status)

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <form action={updateBracketStatus}>
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="bracket_id" value={bracketId} />
        <input type="hidden" name="action" value="lock" />
        <button
          type="submit"
          disabled={isLocked || hasActiveMatches}
          className="w-full rounded-xl bg-emerald-300 px-3 py-2 text-sm font-medium text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
        >
          {t.admin.matches.lockBracket}
        </button>
      </form>
      <form action={updateBracketStatus}>
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="bracket_id" value={bracketId} />
        <input type="hidden" name="action" value="unlock" />
        <button
          type="submit"
          disabled={status !== "locked" || hasActiveMatches}
          className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/35"
        >
          {t.admin.matches.unlockBracket}
        </button>
      </form>
    </div>
  )
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
  const { t } = useLanguage()
  const isTemplateBracket = bracketStatus === "template"
  const isBracketEditable = isLockedBracketStatus(bracketStatus)
  const hasParticipants = Boolean(match.participant_1_id && match.participant_2_id)
  const disabled = !isBracketEditable || !hasParticipants

  return (
    <form action={updateBracketMatch} className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
      <input type="hidden" name="tournament_id" value={match.tournament_id ?? ""} />
      <input type="hidden" name="match_id" value={match.id} />
      {isTemplateBracket && (
        <p className="text-xs text-white/45 sm:col-span-2">
          {t.admin.matches.lockDesc}
        </p>
      )}
      <StatusSelect value={match.status} disabled={disabled} />
      <WinnerSelect match={match} disabled={disabled} />
      <AdminField label={t.admin.matches.score1Field}>
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
      <AdminField label={t.admin.matches.score2Field}>
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
  const disabled = match.status === "finished" || isLockedBracketStatus(bracketStatus)

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
  const { t } = useLanguage()
  const isBracketMatch = Boolean(match.bracket_id)

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
  const { t } = useLanguage()
  const isBracket = mode === "bracket"

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {match && <input type="hidden" name="id" value={match.id} />}
      {isBracket ? (
        <>
          <input type="hidden" name="tournament_id" value={match?.tournament_id ?? ""} />
          <input type="hidden" name="participant_type" value={match?.participant_type ?? ""} />
          <input type="hidden" name="team1" value={match?.team1 ?? "TBD"} />
          <input type="hidden" name="team2" value={match?.team2 ?? "TBD"} />
          <input type="hidden" name="round" value={match?.round ?? match?.bracket_round ?? ""} />

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:col-span-2 text-sm space-y-2">
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
          <AdminField label={t.admin.matches.roundField}>
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
      <AdminField label={t.admin.matches.score1Field}>
        <input name="score1" type="number" defaultValue={match?.score1 ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.matches.score2Field}>
        <input name="score2" type="number" defaultValue={match?.score2 ?? ""} className={inputClassName} />
      </AdminField>
      <StatusSelect value={match?.status} />
      <WinnerSelect match={match} />
      <AdminField label={t.admin.matches.scheduleDateField}>
        <input
          name="schedule_date"
          type="date"
          defaultValue={getScheduleDateInputValue(match?.scheduled_at)}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.scheduleTimeField}>
        <input
          name="schedule_time"
          type="time"
          defaultValue={getScheduleTimeInputValue(match?.scheduled_at)}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.timezoneField}>
        <input
          name="timezone"
          defaultValue={match?.timezone ?? DEFAULT_MATCH_TIMEZONE}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.scheduleNoteField}>
        <input
          name="schedule_note"
          defaultValue={match?.schedule_note ?? ""}
          placeholder="Time TBA"
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.matches.matchOrderField}>
        <input name="match_order" type="number" min={1} step={1} defaultValue={match?.match_order ?? ""} required className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}

function WinnerSelect({ match, disabled = false }: { match?: AdminMatch; disabled?: boolean }) {
  const { t } = useLanguage()
  return (
    <AdminField label={t.admin.matches.winnerField}>
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

function formatBracketStatus(status: BracketLifecycleStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
