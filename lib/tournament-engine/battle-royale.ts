import { randomUUID } from "node:crypto"
import { orderParticipants, type SeedableParticipant } from "@/lib/brackets/seeding"
import type { TournamentFormat, TournamentFormatConfig } from "@/lib/tournament-formats"
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

const BATTLE_ROYALE_BRACKET_TYPE = "battle_royale"
const FREE_FOR_ALL_BRACKET_TYPE = "free_for_all"
const BRACKET_STATUS_TEMPLATE = "template"
const DEFAULT_BR_LOBBY_SIZE = 16
const DEFAULT_FFA_LOBBY_SIZE = 8

export type BattleRoyaleFormat = "battle_royale" | "free_for_all"

export type BattleRoyaleLobby = {
  roundOrder: number
  lobbyOrder: number
  label: string
  participants: SeedableParticipant[]
}

export type BattleRoyaleResultRecord = {
  participantId: string
  roundOrder: number
  lobbyOrder: number
  placement: number | null
  kills?: number | null
  points?: number | null
}

export type BattleRoyaleLeaderboardRow = {
  participantId: string
  name: string
  seed: number | null
  played: number
  wins: number
  averagePlacement: number | null
  kills: number
  placementPoints: number
  killPoints: number
  points: number
}

export type BattleRoyaleMatchRecord = {
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

export const battleRoyaleEngine: TournamentEngine = createLobbyEngine("battle_royale")
export const freeForAllEngine: TournamentEngine = createLobbyEngine("free_for_all")

export function buildBattleRoyaleLobbies({
  participants,
  format,
  config,
  seedMethod,
}: {
  participants: SeedableParticipant[]
  format: BattleRoyaleFormat
  config?: TournamentFormatConfig
  seedMethod: TournamentSeededRequest["seedMethod"]
}): TournamentEngineResult<{ lobbies: BattleRoyaleLobby[]; lobbySize: number; rounds: number }> {
  const minParticipants = format === "battle_royale" ? 8 : 3
  if (participants.length < minParticipants) {
    return { ok: false, error: "not-enough-participants" }
  }

  const lobbySize = getLobbySize(format, config, participants.length)
  if (lobbySize < 2 || lobbySize > participants.length) {
    return { ok: false, error: "invalid-lobby-size" }
  }

  const rounds = getRoundCount(config)
  const ordered = orderParticipants(participants, seedMethod)
  const lobbies: BattleRoyaleLobby[] = []

  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    const roundOrder = roundIndex + 1
    const roundParticipants = rotateParticipants(ordered, roundIndex)
    const buckets = distributeIntoLobbies(roundParticipants, lobbySize, roundIndex)

    buckets.forEach((bucket, lobbyIndex) => {
      const lobbyOrder = lobbyIndex + 1
      lobbies.push({
        roundOrder,
        lobbyOrder,
        label: `Round ${roundOrder} - Lobby ${lobbyOrder}`,
        participants: bucket,
      })
    })
  }

  return { ok: true, data: { lobbies, lobbySize, rounds } }
}

export function getBattleRoyaleLeaderboard(
  participants: SeedableParticipant[],
  results: BattleRoyaleResultRecord[],
  config?: TournamentFormatConfig,
): BattleRoyaleLeaderboardRow[] {
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]))
  const rows = new Map<string, BattleRoyaleLeaderboardRow>()

  for (const participant of participants) {
    rows.set(participant.id, {
      participantId: participant.id,
      name: participant.displayName,
      seed: participant.seed,
      played: 0,
      wins: 0,
      averagePlacement: null,
      kills: 0,
      placementPoints: 0,
      killPoints: 0,
      points: 0,
    })
  }

  const placementTotals = new Map<string, number>()

  for (const result of results) {
    const participant = participantMap.get(result.participantId)
    const row = rows.get(result.participantId)
    if (!participant || !row) continue

    const placement = sanitizePositiveInteger(result.placement)
    const kills = sanitizeNonNegativeInteger(result.kills)
    const placementPoints = getPlacementPoints(placement, config)
    const killPoints = getKillPoints(kills, config)
    const totalPoints = getResultPoints({
      explicitPoints: result.points,
      placementPoints,
      killPoints,
      config,
    })

    row.played += placement ? 1 : 0
    row.wins += placement === 1 ? 1 : 0
    row.kills += kills
    row.placementPoints += placementPoints
    row.killPoints += killPoints
    row.points += totalPoints
    if (placement) placementTotals.set(row.participantId, (placementTotals.get(row.participantId) ?? 0) + placement)
  }

  for (const row of rows.values()) {
    row.averagePlacement = row.played > 0 ? (placementTotals.get(row.participantId) ?? 0) / row.played : null
  }

  return Array.from(rows.values()).sort(compareLeaderboardRows)
}

function createLobbyEngine(format: BattleRoyaleFormat): TournamentEngine {
  return {
    format,
    createTemplate(_request: TournamentTemplateRequest): TournamentEngineResult<TournamentTemplateStructure> {
      return { ok: false, error: "unsupported-tournament-format" }
    },
    generateSeeded(request: TournamentSeededRequest): TournamentEngineResult<TournamentSeededStructure> {
      const lobbies = buildBattleRoyaleLobbies({
        participants: request.participants,
        format,
        config: request.config,
        seedMethod: request.seedMethod,
      })

      if (!lobbies.ok) return lobbies

      const bracketId = randomUUID()
      const matches = createLobbyMatches({
        tournamentId: request.tournamentId,
        bracketId,
        lobbies: lobbies.data.lobbies,
        startingMatchOrder: request.startingMatchOrder,
        participantType: request.participantType,
        bracketType: getBracketType(format),
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
}

function createLobbyMatches({
  tournamentId,
  bracketId,
  lobbies,
  startingMatchOrder,
  participantType,
  bracketType,
}: {
  tournamentId: string
  bracketId: string
  lobbies: BattleRoyaleLobby[]
  startingMatchOrder: number
  participantType: ParticipantType
  bracketType: string
}): GeneratedTournamentMatch[] {
  let matchOrder = startingMatchOrder
  return lobbies.map((lobby) => ({
    id: randomUUID(),
    tournament_id: tournamentId,
    round: lobby.label,
    match_order: matchOrder++,
    team1: `Lobby ${lobby.lobbyOrder}`,
    team2: `${lobby.participants.length} participants`,
    score1: null,
    score2: null,
    status: "upcoming",
    participant_type: participantType,
    participant_1_id: null,
    participant_2_id: null,
    winner_participant_id: null,
    bracket_id: bracketId,
    bracket_type: bracketType,
    bracket_status: BRACKET_STATUS_TEMPLATE,
    round_order: lobby.roundOrder,
    bracket_round: lobby.label,
    bracket_position: lobby.lobbyOrder,
    next_match_id: null,
    next_match_slot: null,
    loser_next_match_id: null,
    loser_next_match_slot: null,
  }))
}

function distributeIntoLobbies(participants: SeedableParticipant[], lobbySize: number, roundIndex: number) {
  const lobbyCount = Math.ceil(participants.length / lobbySize)
  const buckets: SeedableParticipant[][] = Array.from({ length: lobbyCount }, () => [])

  participants.forEach((participant, index) => {
    const block = Math.floor(index / lobbyCount)
    const positionInBlock = index % lobbyCount
    const shouldSnake = (block + roundIndex) % 2 === 1
    const lobbyIndex = shouldSnake ? lobbyCount - 1 - positionInBlock : positionInBlock
    buckets[lobbyIndex].push(participant)
  })

  return buckets
}

function rotateParticipants(participants: SeedableParticipant[], roundIndex: number) {
  if (participants.length === 0) return participants
  const offset = roundIndex % participants.length
  return [...participants.slice(offset), ...participants.slice(0, offset)]
}

function getLobbySize(format: BattleRoyaleFormat, config: TournamentFormatConfig | undefined, participantCount: number) {
  const fallback = format === "battle_royale" ? DEFAULT_BR_LOBBY_SIZE : DEFAULT_FFA_LOBBY_SIZE
  const size = config?.lobby_size ?? fallback
  return Math.min(size, participantCount)
}

function getRoundCount(config: TournamentFormatConfig | undefined) {
  return Math.min(Math.max(config?.matches_per_opponent ?? 1, 1), 4)
}

function getPlacementPoints(placement: number | null, config: TournamentFormatConfig | undefined) {
  if (!placement) return 0
  const base = Math.max(0, 21 - placement)
  if (config?.scoring_model === "kills_and_placement" || config?.scoring_model === "placement") return base
  return 0
}

function getKillPoints(kills: number, config: TournamentFormatConfig | undefined) {
  return config?.scoring_model === "kills_and_placement" ? kills : 0
}

function getResultPoints({
  explicitPoints,
  placementPoints,
  killPoints,
  config,
}: {
  explicitPoints?: number | null
  placementPoints: number
  killPoints: number
  config?: TournamentFormatConfig
}) {
  if (config?.scoring_model === "points" && typeof explicitPoints === "number" && Number.isFinite(explicitPoints)) {
    return explicitPoints
  }
  return placementPoints + killPoints
}

function sanitizePositiveInteger(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  const integer = Math.trunc(value)
  return integer > 0 ? integer : null
}

function sanitizeNonNegativeInteger(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function compareLeaderboardRows(left: BattleRoyaleLeaderboardRow, right: BattleRoyaleLeaderboardRow) {
  if (left.points !== right.points) return right.points - left.points
  if (left.wins !== right.wins) return right.wins - left.wins
  if (left.kills !== right.kills) return right.kills - left.kills
  if (left.averagePlacement !== right.averagePlacement) {
    if (left.averagePlacement === null) return 1
    if (right.averagePlacement === null) return -1
    return left.averagePlacement - right.averagePlacement
  }
  const leftSeed = left.seed ?? Number.POSITIVE_INFINITY
  const rightSeed = right.seed ?? Number.POSITIVE_INFINITY
  if (leftSeed !== rightSeed) return leftSeed - rightSeed
  return left.name.localeCompare(right.name)
}

function getBracketType(format: TournamentFormat) {
  return format === "free_for_all" ? FREE_FOR_ALL_BRACKET_TYPE : BATTLE_ROYALE_BRACKET_TYPE
}
