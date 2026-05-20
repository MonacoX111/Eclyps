export const MATCH_STATUSES = ["upcoming", "live", "finished"] as const

export type MatchStatus = (typeof MATCH_STATUSES)[number]
export type WinnerSelection = "" | "participant_1" | "participant_2"

export type MatchWinnerResolution =
  | { ok: true; winnerParticipantId: string | null }
  | { ok: false; error: string }

export function isWinnerSelection(value: unknown): value is WinnerSelection {
  return value === "" || value === "participant_1" || value === "participant_2"
}

export function getWinnerSelectionFromParticipantId({
  winnerParticipantId,
  participant1Id,
  participant2Id,
}: {
  winnerParticipantId: string | null
  participant1Id: string | null
  participant2Id: string | null
}): WinnerSelection {
  if (winnerParticipantId && winnerParticipantId === participant1Id) return "participant_1"
  if (winnerParticipantId && winnerParticipantId === participant2Id) return "participant_2"

  return ""
}

export function resolveMatchWinner({
  status,
  score1,
  score2,
  participant1Id,
  participant2Id,
  winnerSelection,
}: {
  status: MatchStatus
  score1: number | null
  score2: number | null
  participant1Id: string | null
  participant2Id: string | null
  winnerSelection: WinnerSelection
}): MatchWinnerResolution {
  if (status !== "finished") {
    return { ok: true, winnerParticipantId: null }
  }

  if (score1 === null || score2 === null) {
    return { ok: false, error: "finished-match-requires-scores" }
  }

  if (!participant1Id || !participant2Id) {
    return { ok: false, error: "finished-match-requires-participants" }
  }

  if (score1 === score2) {
    if (!winnerSelection) {
      return { ok: false, error: "tie-match-requires-winner" }
    }

    return {
      ok: true,
      winnerParticipantId:
        winnerSelection === "participant_1" ? participant1Id : participant2Id,
    }
  }

  const automaticSelection = score1 > score2 ? "participant_1" : "participant_2"

  if (winnerSelection && winnerSelection !== automaticSelection) {
    return { ok: false, error: "winner-score-mismatch" }
  }

  return {
    ok: true,
    winnerParticipantId: automaticSelection === "participant_1" ? participant1Id : participant2Id,
  }
}
