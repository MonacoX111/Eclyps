import { randomUUID } from "node:crypto"
import { createBracketTemplateMatches } from "@/lib/brackets/template"
import { nextBracketSize, orderParticipants, seedRoundOne, type SeedableParticipant } from "@/lib/brackets/seeding"
import type { TournamentFormatConfig } from "@/lib/tournament-formats"
import type {
  GeneratedTournamentMatch,
  ParticipantType,
  TournamentEngine,
  TournamentEngineResult,
  TournamentSeededRequest,
  TournamentSeededStructure,
  TournamentTemplateRequest,
  TournamentTemplateStructure,
} from "@/lib/tournament-engine/types"

const GROUPS_PLAYOFFS_BRACKET_TYPE = "groups_then_playoffs"
const GROUP_STAGE_STATUS = "template"
const PLAYOFF_STATUS = "template"
const DEFAULT_POINTS_WIN = 3
const DEFAULT_POINTS_DRAW = 1
const DEFAULT_POINTS_LOSS = 0

type GroupSlot = {
  id: string
  displayName: string
  seed: number | null
} | null

type GroupAssignment = {
  key: string
  label: string
  participants: SeedableParticipant[]
}

export type GroupsPlayoffsMatchRecord = {
  id?: string
  tournament_id?: string
  round?: string | null
  match_order?: number | null
  team1?: string | null
  team2?: string | null
  score1?: number | null
  score2?: number | null
  status: "upcoming" | "live" | "finished"
  participant_type?: ParticipantType
  participant_1_id: string | null
  participant_2_id: string | null
  winner_participant_id?: string | null
  bracket_id?: string | null
  bracket_type?: string | null
  bracket_status?: string | null
  round_order?: number | null
  bracket_round?: string | null
  bracket_position?: number | null
  next_match_id?: string | null
  next_match_slot?: number | null
  loser_next_match_id?: string | null
  loser_next_match_slot?: number | null
}

export type GroupStanding = {
  groupKey: string
  groupLabel: string
  participantId: string
  name: string
  seed: number | null
  played: number
  wins: number
  draws: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  scoreDiff: number
  points: number
  rank: number
}

export type GenerateGroupsPlayoffsRequest = {
  tournamentId: string
  participants: SeedableParticipant[]
  matches: GroupsPlayoffsMatchRecord[]
  startingMatchOrder: number
  participantType: ParticipantType
  config?: TournamentFormatConfig
  bracketId?: string | null
}

export type GenerateGroupsPlayoffsResult = {
  bracketId: string
  matches: GeneratedTournamentMatch[]
  standings: GroupStanding[]
  advancers: SeedableParticipant[]
  bracketSize: number
  byeCount: number
}

export const groupsPlayoffsEngine: TournamentEngine = {
  format: "groups_then_playoffs",
  createTemplate(_request: TournamentTemplateRequest): TournamentEngineResult<TournamentTemplateStructure> {
    return { ok: false, error: "unsupported-tournament-format" }
  },
  generateSeeded(request: TournamentSeededRequest): TournamentEngineResult<TournamentSeededStructure> {
    if (request.participants.length < 8) {
      return { ok: false, error: "not-enough-participants" }
    }

    const groupCount = getGroupCount(request.config, request.participants.length)
    const advancingPerGroup = getAdvancingPerGroup(request.config)
    if (!isValidGroupSetup(request.participants.length, groupCount, advancingPerGroup)) {
      return { ok: false, error: "invalid-format-config" }
    }

    const ordered = orderParticipants(request.participants, request.seedMethod)
    const groups = assignGroups(ordered, groupCount)
    const matchesPerOpponent = clampMatchesPerOpponent(request.config?.matches_per_opponent)
    const bracketId = randomUUID()
    const matches = createGroupStageMatches({
      tournamentId: request.tournamentId,
      bracketId,
      groups,
      matchesPerOpponent,
      startingMatchOrder: request.startingMatchOrder,
      participantType: request.participantType,
    })

    return {
      ok: true,
      data: {
        bracketId,
        matches,
        byeCount: 0,
        bracketSize: request.participants.length,
      },
    }
  },
}

export function generateGroupsPlayoffsBracket(
  request: GenerateGroupsPlayoffsRequest,
): TournamentEngineResult<GenerateGroupsPlayoffsResult> {
  const groupCount = getGroupCount(request.config, request.participants.length)
  const advancingPerGroup = getAdvancingPerGroup(request.config)
  if (!isValidGroupSetup(request.participants.length, groupCount, advancingPerGroup)) {
    return { ok: false, error: "invalid-format-config" }
  }

  const groupMatches = request.matches.filter(isGroupStageMatch)
  if (groupMatches.length === 0) {
    return { ok: false, error: "groups-incomplete" }
  }

  if (groupMatches.some((match) => match.status !== "finished")) {
    return { ok: false, error: "groups-incomplete" }
  }

  const standings = getGroupStandings(request.participants, groupMatches, request.config)
  const groupedStandings = groupStandingsByGroup(standings)
  if (groupedStandings.length !== groupCount) {
    return { ok: false, error: "groups-incomplete" }
  }

  const advancers = getPlayoffAdvancers(groupedStandings, advancingPerGroup)
  const bracketSize = nextBracketSize(advancers.length)
  if (!bracketSize) {
    return { ok: false, error: "too-many-participants" }
  }

  const template = createBracketTemplateMatches({
    tournamentId: request.tournamentId,
    bracketSize,
    startingMatchOrder: request.startingMatchOrder,
    participantType: request.participantType,
  })
  const bracketId = request.bracketId ?? groupMatches.find((match) => match.bracket_id)?.bracket_id ?? template.bracketId
  const seeded = seedRoundOne(template.matches, seedPlayoffAdvancers(advancers), "rating", bracketSize)
  const playoffRoundOffset = getMaxRoundOrder(groupMatches)
  const matches = seeded.matches.map((match): GeneratedTournamentMatch => ({
    ...match,
    bracket_id: bracketId,
    bracket_type: GROUPS_PLAYOFFS_BRACKET_TYPE,
    bracket_status: PLAYOFF_STATUS,
    round: `Playoffs - ${match.round}`,
    bracket_round: `Playoffs - ${match.bracket_round}`,
    round_order: playoffRoundOffset + match.round_order,
  }))

  return {
    ok: true,
    data: {
      bracketId,
      matches,
      standings,
      advancers,
      bracketSize,
      byeCount: seeded.byeCount,
    },
  }
}

export function getGroupStandings(
  participants: SeedableParticipant[],
  matches: GroupsPlayoffsMatchRecord[],
  config?: TournamentFormatConfig,
): GroupStanding[] {
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]))
  const scoring = getScoring(config)
  const table = new Map<string, GroupStanding>()

  const ensureRow = (group: ParsedGroupLabel, participantId: string | null, fallbackName: string | null) => {
    if (!participantId) return null
    const participant = participantMap.get(participantId)
    const key = `${group.key}:${participantId}`
    const existing = table.get(key)
    if (existing) return existing

    const row: GroupStanding = {
      groupKey: group.key,
      groupLabel: group.label,
      participantId,
      name: participant?.displayName ?? fallbackName ?? "TBD",
      seed: participant?.seed ?? null,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      scoreDiff: 0,
      points: 0,
      rank: 0,
    }
    table.set(key, row)
    return row
  }

  for (const match of matches) {
    if (!isGroupStageMatch(match)) continue
    const group = parseGroupLabel(match.bracket_round ?? match.round)
    if (!group) continue

    const left = ensureRow(group, match.participant_1_id, match.team1 ?? null)
    const right = ensureRow(group, match.participant_2_id, match.team2 ?? null)
    if (!left || !right || match.status !== "finished") continue
    if (typeof match.score1 !== "number" || typeof match.score2 !== "number") continue

    left.played += 1
    right.played += 1
    left.pointsFor += match.score1
    left.pointsAgainst += match.score2
    right.pointsFor += match.score2
    right.pointsAgainst += match.score1
    left.scoreDiff = left.pointsFor - left.pointsAgainst
    right.scoreDiff = right.pointsFor - right.pointsAgainst

    const winnerId = resolveWinnerId(match)
    if (winnerId === left.participantId) {
      left.wins += 1
      right.losses += 1
      left.points += scoring.win
      right.points += scoring.loss
    } else if (winnerId === right.participantId) {
      right.wins += 1
      left.losses += 1
      right.points += scoring.win
      left.points += scoring.loss
    } else {
      left.draws += 1
      right.draws += 1
      left.points += scoring.draw
      right.points += scoring.draw
    }
  }

  return groupStandingsByGroup(Array.from(table.values()))
    .flatMap((group) => group.map((row, index) => ({ ...row, rank: index + 1 })))
}

function createGroupStageMatches({
  tournamentId,
  bracketId,
  groups,
  matchesPerOpponent,
  startingMatchOrder,
  participantType,
}: {
  tournamentId: string
  bracketId: string
  groups: GroupAssignment[]
  matchesPerOpponent: number
  startingMatchOrder: number
  participantType: ParticipantType
}) {
  let matchOrder = startingMatchOrder
  const matches: GeneratedTournamentMatch[] = []
  const groupRounds = groups.map((group) => ({
    group,
    rounds: buildRoundRobinRounds(group.participants),
  }))
  const maxRounds = Math.max(...groupRounds.map((group) => group.rounds.length))

  for (let cycleIndex = 0; cycleIndex < matchesPerOpponent; cycleIndex += 1) {
    const shouldFlipCycle = cycleIndex % 2 === 1
    for (let roundIndex = 0; roundIndex < maxRounds; roundIndex += 1) {
      let bracketPosition = 1
      const roundOrder = cycleIndex * maxRounds + roundIndex + 1

      for (const groupRound of groupRounds) {
        const roundPairings = groupRound.rounds[roundIndex] ?? []
        const groupRoundLabel = `${groupRound.group.label} - Round ${roundIndex + 1}`

        roundPairings.forEach(([left, right], pairingIndex) => {
          if (!left || !right) return

          const shouldFlipPairing = shouldFlipCycle || (cycleIndex === 0 && pairingIndex % 2 === 1)
          const participant1 = shouldFlipPairing ? right : left
          const participant2 = shouldFlipPairing ? left : right

          matches.push({
            id: randomUUID(),
            tournament_id: tournamentId,
            round: groupRoundLabel,
            match_order: matchOrder++,
            team1: participant1.displayName,
            team2: participant2.displayName,
            score1: null,
            score2: null,
            status: "upcoming",
            participant_type: participantType,
            participant_1_id: participant1.id,
            participant_2_id: participant2.id,
            winner_participant_id: null,
            bracket_id: bracketId,
            bracket_type: GROUPS_PLAYOFFS_BRACKET_TYPE,
            bracket_status: GROUP_STAGE_STATUS,
            round_order: roundOrder,
            bracket_round: groupRoundLabel,
            bracket_position: bracketPosition++,
            next_match_id: null,
            next_match_slot: null,
            loser_next_match_id: null,
            loser_next_match_slot: null,
          })
        })
      }
    }
  }

  return matches
}

function assignGroups(participants: SeedableParticipant[], groupCount: number): GroupAssignment[] {
  const groups: GroupAssignment[] = Array.from({ length: groupCount }, (_, index) => ({
    key: getGroupKey(index),
    label: getGroupLabel(index),
    participants: [],
  }))

  participants.forEach((participant, index) => {
    const block = Math.floor(index / groupCount)
    const positionInBlock = index % groupCount
    const groupIndex = block % 2 === 0 ? positionInBlock : groupCount - 1 - positionInBlock
    groups[groupIndex].participants.push(participant)
  })

  return groups
}

function buildRoundRobinRounds(participants: SeedableParticipant[]) {
  const slots: GroupSlot[] = participants.length % 2 === 0 ? [...participants] : [...participants, null]
  const rounds: [GroupSlot, GroupSlot][][] = []
  const roundCount = slots.length - 1
  const pairingsPerRound = slots.length / 2

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const pairings: [GroupSlot, GroupSlot][] = []

    for (let pairingIndex = 0; pairingIndex < pairingsPerRound; pairingIndex += 1) {
      pairings.push([slots[pairingIndex] ?? null, slots[slots.length - 1 - pairingIndex] ?? null])
    }

    rounds.push(pairings)

    const fixed = slots[0] ?? null
    const rotated = [fixed, slots[slots.length - 1] ?? null, ...slots.slice(1, slots.length - 1)]
    slots.splice(0, slots.length, ...rotated)
  }

  return rounds
}

function groupStandingsByGroup(standings: GroupStanding[]) {
  const groups = new Map<string, GroupStanding[]>()
  for (const row of standings) {
    groups.set(row.groupKey, [...(groups.get(row.groupKey) ?? []), row])
  }

  return Array.from(groups.values())
    .map((group) => [...group].sort(compareGroupStandings))
    .sort((left, right) => left[0]?.groupKey.localeCompare(right[0]?.groupKey ?? "") ?? 0)
}

function getPlayoffAdvancers(groupedStandings: GroupStanding[][], advancingPerGroup: number): SeedableParticipant[] {
  const advancers: SeedableParticipant[] = []
  for (let rank = 0; rank < advancingPerGroup; rank += 1) {
    for (const group of groupedStandings) {
      const row = group[rank]
      if (!row) continue
      advancers.push({
        id: row.participantId,
        displayName: row.name,
        seed: advancers.length + 1,
      })
    }
  }
  return advancers
}

function seedPlayoffAdvancers(advancers: SeedableParticipant[]) {
  return advancers.map((participant, index) => ({
    ...participant,
    seed: index + 1,
  }))
}

function getGroupCount(config: TournamentFormatConfig | undefined, participantCount: number) {
  return config?.group_count ?? Math.max(2, Math.floor(participantCount / 4))
}

function getAdvancingPerGroup(config: TournamentFormatConfig | undefined) {
  return config?.advancing_per_group ?? 2
}

function isValidGroupSetup(participantCount: number, groupCount: number, advancingPerGroup: number) {
  if (groupCount < 2 || groupCount > participantCount) return false
  if (Math.floor(participantCount / groupCount) < 3) return false
  if (advancingPerGroup < 1) return false
  if (advancingPerGroup * groupCount > participantCount) return false
  return true
}

function isGroupStageMatch(match: GroupsPlayoffsMatchRecord) {
  if (match.bracket_type !== GROUPS_PLAYOFFS_BRACKET_TYPE) return false
  const label = match.bracket_round ?? match.round ?? ""
  return label.startsWith("Group ")
}

type ParsedGroupLabel = {
  key: string
  label: string
}

function parseGroupLabel(label: string | null | undefined): ParsedGroupLabel | null {
  if (!label) return null
  const match = /^(Group\s+([A-Z]+|\d+))\s+-\s+Round\s+\d+$/i.exec(label)
  if (!match) return null
  return {
    key: match[2].toUpperCase(),
    label: match[1],
  }
}

function resolveWinnerId(match: GroupsPlayoffsMatchRecord) {
  if (match.winner_participant_id) return match.winner_participant_id
  if (typeof match.score1 !== "number" || typeof match.score2 !== "number") return null
  if (match.score1 > match.score2) return match.participant_1_id
  if (match.score2 > match.score1) return match.participant_2_id
  return null
}

function getScoring(config: TournamentFormatConfig | undefined) {
  return {
    win: config?.points_win ?? DEFAULT_POINTS_WIN,
    draw: config?.points_draw ?? DEFAULT_POINTS_DRAW,
    loss: config?.points_loss ?? DEFAULT_POINTS_LOSS,
  }
}

function getMaxRoundOrder(matches: GroupsPlayoffsMatchRecord[]) {
  return matches.reduce((max, match) => Math.max(max, match.round_order ?? 0), 0)
}

function compareGroupStandings(left: GroupStanding, right: GroupStanding) {
  if (left.points !== right.points) return right.points - left.points
  if (left.scoreDiff !== right.scoreDiff) return right.scoreDiff - left.scoreDiff
  if (left.pointsFor !== right.pointsFor) return right.pointsFor - left.pointsFor
  if (left.wins !== right.wins) return right.wins - left.wins
  const leftSeed = left.seed ?? Number.POSITIVE_INFINITY
  const rightSeed = right.seed ?? Number.POSITIVE_INFINITY
  if (leftSeed !== rightSeed) return leftSeed - rightSeed
  return left.name.localeCompare(right.name)
}

function clampMatchesPerOpponent(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) return 1
  return Math.min(Math.max(value, 1), 4)
}

function getGroupLabel(index: number) {
  return `Group ${getGroupKey(index)}`
}

function getGroupKey(index: number) {
  if (index < 26) return String.fromCharCode(65 + index)
  return String(index + 1)
}
