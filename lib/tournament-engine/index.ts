import { normalizeTournamentFormat } from "@/lib/tournament-formats"
import { singleEliminationEngine } from "@/lib/tournament-engine/single-elimination"
import { roundRobinEngine } from "@/lib/tournament-engine/round-robin"
import { doubleEliminationEngine } from "@/lib/tournament-engine/double-elimination"
import { swissEngine } from "@/lib/tournament-engine/swiss"
import { groupsPlayoffsEngine } from "@/lib/tournament-engine/groups-playoffs"
import { battleRoyaleEngine, freeForAllEngine } from "@/lib/tournament-engine/battle-royale"
import type {
  TournamentEngine,
  TournamentEngineErrorCode,
  TournamentEngineResult,
  TournamentSeededRequest,
  TournamentSeededStructure,
  TournamentTemplateRequest,
  TournamentTemplateStructure,
} from "@/lib/tournament-engine/types"

const ENGINES: Partial<Record<string, TournamentEngine>> = {
  single_elimination: singleEliminationEngine,
  round_robin: roundRobinEngine,
  double_elimination: doubleEliminationEngine,
  swiss: swissEngine,
  groups_then_playoffs: groupsPlayoffsEngine,
  battle_royale: battleRoyaleEngine,
  free_for_all: freeForAllEngine,
}

export function getTournamentEngine(formatValue: unknown): TournamentEngine | null {
  const format = normalizeTournamentFormat(formatValue)
  return ENGINES[format] ?? null
}

export function isTournamentEngineAvailable(formatValue: unknown) {
  return getTournamentEngine(formatValue) !== null
}

export function createTournamentTemplate(
  request: TournamentTemplateRequest,
): TournamentEngineResult<TournamentTemplateStructure> {
  return withEngine(request.tournamentFormat, (engine) => engine.createTemplate(request))
}

export function generateTournamentStructure(
  request: TournamentSeededRequest,
): TournamentEngineResult<TournamentSeededStructure> {
  return withEngine(request.tournamentFormat, (engine) => engine.generateSeeded(request))
}

function withEngine<T>(
  formatValue: unknown,
  callback: (engine: TournamentEngine) => TournamentEngineResult<T>,
): TournamentEngineResult<T> {
  const engine = getTournamentEngine(formatValue)
  if (!engine) return { ok: false, error: "unsupported-tournament-format" }
  return callback(engine)
}

export type {
  TournamentEngine,
  TournamentEngineErrorCode,
  TournamentEngineResult,
  TournamentSeededRequest,
  TournamentSeededStructure,
  TournamentTemplateRequest,
  TournamentTemplateStructure,
}

export {
  generateNextSwissRound,
  getSwissStandings,
  type GenerateNextSwissRoundRequest,
  type GenerateNextSwissRoundResult,
  type SwissMatchRecord,
  type SwissStanding,
} from "@/lib/tournament-engine/swiss"

export {
  generateGroupsPlayoffsBracket,
  getGroupStandings,
  type GenerateGroupsPlayoffsRequest,
  type GenerateGroupsPlayoffsResult,
  type GroupsPlayoffsMatchRecord,
  type GroupStanding,
} from "@/lib/tournament-engine/groups-playoffs"

export {
  buildBattleRoyaleLobbies,
  getBattleRoyaleLeaderboard,
  type BattleRoyaleFormat,
  type BattleRoyaleLeaderboardRow,
  type BattleRoyaleLobby,
  type BattleRoyaleMatchRecord,
  type BattleRoyaleResultRecord,
} from "@/lib/tournament-engine/battle-royale"
