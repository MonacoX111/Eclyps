"use client"

import { useState } from "react"

type ParticipantType = "team" | "player"

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none transition focus:border-emerald-300/60"

function getInitialType(value?: string | null): ParticipantType {
  return value === "player" ? "player" : "team"
}

export function MatchParticipantFields({
  initialType,
  teamNames,
  playerNames,
  team1,
  team2,
}: {
  initialType?: string | null
  teamNames: string[]
  playerNames: string[]
  team1?: string | null
  team2?: string | null
}) {
  const [participantType, setParticipantType] = useState<ParticipantType>(
    getInitialType(initialType),
  )
  const names = participantType === "player" ? playerNames : teamNames
  const listId = `match-${participantType}-names`

  return (
    <>
      <ParticipantTypeField value={participantType} onChange={setParticipantType} />
      <NameField label={participantType === "player" ? "Player 1" : "Team 1"} name="team1" listId={listId} value={team1} />
      <NameField label={participantType === "player" ? "Player 2" : "Team 2"} name="team2" listId={listId} value={team2} />
      <NameList id={listId} names={names} />
    </>
  )
}

export function ResultParticipantFields({
  initialType,
  teamNames,
  playerNames,
  team,
}: {
  initialType?: string | null
  teamNames: string[]
  playerNames: string[]
  team?: string | null
}) {
  const [participantType, setParticipantType] = useState<ParticipantType>(
    getInitialType(initialType),
  )
  const names = participantType === "player" ? playerNames : teamNames
  const listId = `result-${participantType}-names`

  return (
    <>
      <ParticipantTypeField value={participantType} onChange={setParticipantType} />
      <NameField label={participantType === "player" ? "Player" : "Team"} name="team" listId={listId} value={team} />
      <NameList id={listId} names={names} />
    </>
  )
}

function ParticipantTypeField({
  value,
  onChange,
}: {
  value: ParticipantType
  onChange: (value: ParticipantType) => void
}) {
  return (
    <label className="space-y-2 text-sm text-white/75">
      <span className="block">Participant type</span>
      <select
        name="participant_type"
        value={value}
        onChange={(event) => onChange(event.target.value as ParticipantType)}
        className={inputClassName}
      >
        <option value="team">Team</option>
        <option value="player">Player</option>
      </select>
    </label>
  )
}

function NameField({
  label,
  name,
  listId,
  value,
}: {
  label: string
  name: string
  listId: string
  value?: string | null
}) {
  return (
    <label className="space-y-2 text-sm text-white/75">
      <span className="block">{label}</span>
      <input name={name} list={listId} defaultValue={value ?? ""} required className={inputClassName} />
    </label>
  )
}

function NameList({ id, names }: { id: string; names: string[] }) {
  return (
    <datalist id={id}>
      {names.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  )
}
