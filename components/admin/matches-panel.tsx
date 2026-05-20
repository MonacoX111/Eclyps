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
import { assignBracketSlot, createMatch, deleteMatch, generateBracketTemplate, updateMatch } from "@/app/admin/actions"
import { MatchParticipantFields } from "@/components/admin-participant-fields"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, StatusSelect, SubmitButton, TournamentSelect } from "@/components/admin/admin-form-fields"

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
          <h3 className="text-lg font-medium">Bracket template</h3>
          <BracketTemplateForm tournaments={tournaments} />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Bracket editor</h3>
          <BracketEditor
            matches={matches}
            participants={participants}
            tournamentNames={tournamentNames}
          />
        </article>

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

function BracketTemplateForm({
  tournaments,
}: {
  tournaments: AdminTournament[]
}) {
  return (
    <form action={generateBracketTemplate} className="mt-4 grid gap-3 sm:grid-cols-2">
      <TournamentSelect tournaments={tournaments} />
      <AdminField label="Bracket size">
        <select name="bracket_size" defaultValue="8" className={inputClassName}>
          <option value="2">2 participants</option>
          <option value="4">4 participants</option>
          <option value="8">8 participants</option>
          <option value="16">16 participants</option>
        </select>
      </AdminField>
      <label className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/65 sm:col-span-2">
        <input
          name="confirm_regenerate"
          type="checkbox"
          className="mt-1 h-4 w-4 accent-emerald-300"
        />
        <span>
          Regenerate if bracket matches already exist for this tournament.
          Existing non-bracket matches are preserved.
        </span>
      </label>
      <SubmitButton label="Generate bracket template" disabled={tournaments.length === 0} />
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
  const bracketMatches = matches.filter((match) => match.bracket_id)

  if (bracketMatches.length === 0) {
    return <AdminEmptyState>No generated bracket template exists yet.</AdminEmptyState>
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
                  {tournamentNames.get(bracket.tournamentId) ?? "Unknown tournament"}
                </h4>
                <p className="mt-1 text-sm text-white/50">
                  {formatStatus(bracket.status)} bracket
                </p>
              </div>
              <span className={pillClassName}>{bracket.matches.length} matches</span>
            </div>

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

function ParticipantPool({
  participants,
  assignedIds,
}: {
  participants: AdminParticipant[]
  assignedIds: Set<string>
}) {
  if (participants.length === 0) {
    return <p className="mt-4 text-sm text-white/45">No participants exist for this tournament yet.</p>
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {participants.map((participant) => (
        <span
          key={participant.id}
          className={`${pillClassName} ${assignedIds.has(participant.id) ? "opacity-50" : ""}`}
        >
          {participant.display_name}
          {assignedIds.has(participant.id) ? " (assigned)" : ""}
        </span>
      ))}
    </div>
  )
}

function BracketMatchCard({
  match,
  participants,
  assignedIds,
}: {
  match: AdminMatch
  participants: AdminParticipant[]
  assignedIds: Set<string>
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>{match.round ?? match.bracket_round ?? "Bracket round"}</span>
        <span>Position {match.bracket_position ?? "???"}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BracketSlotForm
          match={match}
          slot={1}
          value={match.participant_1_id}
          label={match.team1 ?? "Empty slot"}
          participants={participants}
          assignedIds={assignedIds}
        />
        <BracketSlotForm
          match={match}
          slot={2}
          value={match.participant_2_id}
          label={match.team2 ?? "Empty slot"}
          participants={participants}
          assignedIds={assignedIds}
        />
      </div>
    </div>
  )
}

function BracketSlotForm({
  match,
  slot,
  value,
  label,
  participants,
  assignedIds,
}: {
  match: AdminMatch
  slot: 1 | 2
  value: string | null
  label: string
  participants: AdminParticipant[]
  assignedIds: Set<string>
}) {
  const disabled = match.status === "finished" || isLockedBracketStatus(match.bracket_status)

  return (
    <form action={assignBracketSlot} className="space-y-2">
      <input type="hidden" name="tournament_id" value={match.tournament_id ?? ""} />
      <input type="hidden" name="match_id" value={match.id} />
      <input type="hidden" name="slot" value={slot} />
      <label className="block space-y-2 text-sm text-white/75">
        <span className="block">Slot {slot}: {label}</span>
        <select
          name="participant_id"
          defaultValue={value ?? ""}
          disabled={disabled}
          className={inputClassName}
        >
          <option value="">Empty slot</option>
          {participants.map((participant) => {
            const assignedElsewhere = assignedIds.has(participant.id) && participant.id !== value

            return (
              <option
                key={participant.id}
                value={participant.id}
                disabled={assignedElsewhere}
              >
                {participant.display_name}
                {assignedElsewhere ? " (assigned)" : ""}
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
        Save slot
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
      <AdminField label="Schedule date">
        <input
          name="schedule_date"
          type="date"
          defaultValue={getScheduleDateInputValue(match?.scheduled_at)}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Schedule time">
        <input
          name="schedule_time"
          type="time"
          defaultValue={getScheduleTimeInputValue(match?.scheduled_at)}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Timezone">
        <input
          name="timezone"
          defaultValue={match?.timezone ?? DEFAULT_MATCH_TIMEZONE}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Schedule note">
        <input
          name="schedule_note"
          defaultValue={match?.schedule_note ?? ""}
          placeholder="Time TBA"
          className={inputClassName}
        />
      </AdminField>
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
      status: sortedMatches.find((match) => match.bracket_status)?.bracket_status ?? "template",
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
  return status === "locked" || status === "completed" || status === "finished"
}
