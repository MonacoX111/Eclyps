import { createBracketTemplateMatches, isBracketSize } from "@/lib/brackets/template"
import { nextBracketSize, seedRoundOne } from "@/lib/brackets/seeding"
import type {
  TournamentEngine,
  TournamentEngineResult,
  TournamentSeededRequest,
  TournamentTemplateRequest,
  TournamentTemplateStructure,
} from "@/lib/tournament-engine/types"

export const singleEliminationEngine: TournamentEngine = {
  format: "single_elimination",
  createTemplate: createSingleEliminationTemplate,
  generateSeeded(request: TournamentSeededRequest) {
    if (request.participants.length < 2) {
      return { ok: false, error: "not-enough-participants" }
    }

    const bracketSize = nextBracketSize(request.participants.length)
    if (!bracketSize) {
      return { ok: false, error: "too-many-participants" }
    }

    const template = createSingleEliminationTemplate({
      tournamentId: request.tournamentId,
      tournamentFormat: request.tournamentFormat,
      bracketSize,
      startingMatchOrder: request.startingMatchOrder,
      participantType: request.participantType,
      config: request.config,
    })

    if (!template.ok) return template

    const seeded = seedRoundOne(
      template.data.matches,
      request.participants,
      request.seedMethod,
      bracketSize,
    )

    return {
      ok: true,
      data: {
        bracketId: template.data.bracketId,
        matches: seeded.matches,
        byeCount: seeded.byeCount,
        bracketSize,
      },
    }
  },
}

function createSingleEliminationTemplate(
  request: TournamentTemplateRequest,
): TournamentEngineResult<TournamentTemplateStructure> {
  if (!isBracketSize(request.bracketSize)) {
    return { ok: false, error: "invalid-bracket-size" }
  }

  const structure = createBracketTemplateMatches({
    tournamentId: request.tournamentId,
    bracketSize: request.bracketSize,
    startingMatchOrder: request.startingMatchOrder,
    participantType: request.participantType,
  })

  return { ok: true, data: structure }
}
