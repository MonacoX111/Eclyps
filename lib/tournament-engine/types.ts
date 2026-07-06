import type { TournamentFormat, TournamentFormatConfig } from "@/lib/tournament-formats"
import type { BracketSize, BracketTemplateMatch } from "@/lib/brackets/template"
import type { FilledBracketMatch, SeedMethod, SeedableParticipant } from "@/lib/brackets/seeding"

export type ParticipantType = "team" | "player"

export type TournamentEngineErrorCode =
  | "unsupported-tournament-format"
  | "not-enough-participants"
  | "too-many-participants"
  | "invalid-bracket-size"
  | "invalid-bracket-chain"
  | "swiss-round-incomplete"
  | "swiss-round-limit-reached"
  | "swiss-pairing-failed"
  | "groups-incomplete"
  | "invalid-format-config"
  | "invalid-lobby-size"

export type TournamentEngineResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TournamentEngineErrorCode }

export type TournamentTemplateRequest = {
  tournamentId: string
  tournamentFormat: TournamentFormat
  bracketSize: BracketSize
  startingMatchOrder: number
  participantType: ParticipantType
  config?: TournamentFormatConfig
}

export type TournamentSeededRequest = {
  tournamentId: string
  tournamentFormat: TournamentFormat
  participants: SeedableParticipant[]
  startingMatchOrder: number
  participantType: ParticipantType
  seedMethod: SeedMethod
  config?: TournamentFormatConfig
}

export type TournamentTemplateStructure = {
  bracketId: string
  matches: BracketTemplateMatch[]
}

export type GeneratedTournamentMatch = Omit<FilledBracketMatch, "bracket_type"> & {
  bracket_type: string
  loser_next_match_id?: string | null
  loser_next_match_slot?: number | null
}

export type TournamentSeededStructure = {
  bracketId: string
  matches: GeneratedTournamentMatch[]
  byeCount: number
  bracketSize: number
}

export type TournamentEngine = {
  format: TournamentFormat
  createTemplate(request: TournamentTemplateRequest): TournamentEngineResult<TournamentTemplateStructure>
  generateSeeded(request: TournamentSeededRequest): TournamentEngineResult<TournamentSeededStructure>
}
