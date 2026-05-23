import type { AdminFeedback, AdminSearchParams } from "@/lib/admin/types"

export function getTournamentFeedback(searchParams?: Pick<AdminSearchParams, "crudError" | "crudSuccess">): AdminFeedback | null {
  if (searchParams?.crudSuccess === "created") return { tone: "success", message: "Tournament created." }
  if (searchParams?.crudSuccess === "updated") return { tone: "success", message: "Tournament updated." }
  if (searchParams?.crudSuccess === "deleted") return { tone: "success", message: "Tournament deleted." }
  if (!searchParams?.crudError) return null

  const message =
    {
      "invalid-name": "Name must not be empty.",
      "invalid-game": "Game must not be empty.",
      "invalid-participant-type": "Participant type must be player or team.",
      "invalid-team-count": "Team count must be a number greater than 0.",
      "invalid-match-days": "Match days must be a number greater than 0.",
      "invalid-status": "Status must be upcoming, live, or finished.",
      "missing-id": "Tournament id is missing.",
      "admin-client-unavailable":
        "Tournament mutations require a server-only Supabase admin client.",
      "mutation-failed": "Tournament change could not be saved. Please try again.",
      "dependent-cleanup-failed": "Tournament could not be deleted because dependent cleanup failed.",
    }[searchParams.crudError] ?? "Tournament change could not be saved."

  return { tone: "error", message }
}

export function getActiveTournamentFeedback(searchParams?: Pick<AdminSearchParams, "activeError" | "activeSuccess">): AdminFeedback | null {
  if (searchParams?.activeSuccess === "updated") return { tone: "success", message: "Active tournament updated." }
  if (!searchParams?.activeError) return null

  const message =
    {
      "missing-id": "Tournament id is missing.",
      "not-found": "Tournament could not be found.",
      "admin-client-unavailable":
        "Active tournament changes require a server-only Supabase admin client.",
      "mutation-failed": "Active tournament could not be updated. Please try again.",
    }[searchParams.activeError] ?? "Active tournament could not be updated."

  return { tone: "error", message }
}

export function getTeamFeedback(searchParams?: Pick<AdminSearchParams, "teamError" | "teamSuccess">): AdminFeedback | null {
  if (searchParams?.teamSuccess === "created") return { tone: "success", message: "Team created." }
  if (searchParams?.teamSuccess === "updated") return { tone: "success", message: "Team updated." }
  if (searchParams?.teamSuccess === "deleted") return { tone: "success", message: "Team deleted." }
  if (!searchParams?.teamError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-team-name": "Team name must not be empty.",
      "invalid-seed": "Seed must be a positive integer.",
      "invalid-wins": "Wins must be an integer greater than or equal to 0.",
      "invalid-losses": "Losses must be an integer greater than or equal to 0.",
      "missing-id": "Team id is missing.",
      "admin-client-unavailable":
        "Team mutations require a server-only Supabase admin client.",
      "mutation-failed": "Team change could not be saved. Please try again.",
    }[searchParams.teamError] ?? "Team change could not be saved."

  return { tone: "error", message }
}

export function getPlayerFeedback(searchParams?: Pick<AdminSearchParams, "playerError" | "playerSuccess">): AdminFeedback | null {
  if (searchParams?.playerSuccess === "created") return { tone: "success", message: "Player created." }
  if (searchParams?.playerSuccess === "updated") return { tone: "success", message: "Player updated." }
  if (searchParams?.playerSuccess === "deleted") return { tone: "success", message: "Player deleted." }
  if (searchParams?.playerSuccess === "approved") return { tone: "success", message: "Player profile approved." }
  if (searchParams?.playerSuccess === "rejected") return { tone: "success", message: "Player profile rejected." }
  if (searchParams?.playerSuccess === "pending") return { tone: "success", message: "Player profile restored to pending." }
  if (!searchParams?.playerError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-player-name": "Player name must not be empty.",
      "invalid-player-seed": "Seed must be a positive integer when provided.",
      "invalid-wins": "Wins must be an integer greater than or equal to 0.",
      "invalid-losses": "Losses must be an integer greater than or equal to 0.",
      "missing-id": "Player id is missing.",
      "admin-client-unavailable": "Player mutations require a server-only Supabase admin client.",
      "mutation-failed": "Player change could not be saved. Please try again.",
    }[searchParams.playerError] ?? "Player change could not be saved."

  return { tone: "error", message }
}

export function getMatchFeedback(searchParams?: Pick<AdminSearchParams, "matchError" | "matchSuccess">): AdminFeedback | null {
  if (searchParams?.matchSuccess === "created") return { tone: "success", message: "Match created." }
  if (searchParams?.matchSuccess === "updated") return { tone: "success", message: "Match updated." }
  if (searchParams?.matchSuccess === "deleted") return { tone: "success", message: "Match deleted." }
  if (searchParams?.matchSuccess === "bracket-generated") return { tone: "success", message: "Bracket template generated." }
  if (searchParams?.matchSuccess === "bracket-slot-updated") return { tone: "success", message: "Bracket slot updated." }
  if (searchParams?.matchSuccess === "bracket-locked") return { tone: "success", message: "Bracket locked." }
  if (searchParams?.matchSuccess === "bracket-unlocked") return { tone: "success", message: "Bracket unlocked." }
  if (searchParams?.matchSuccess === "bracket-match-updated") return { tone: "success", message: "Bracket match updated." }
  if (!searchParams?.matchError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-team1": "Team 1 must not be empty.",
      "invalid-team2": "Team 2 must not be empty.",
      "duplicate-match-teams": "Team 1 and Team 2 must be different.",
      "invalid-score": "Scores must be whole numbers or left empty.",
      "invalid-status": "Status must be upcoming, live, or finished.",
      "invalid-match-order": "Match order must be a positive integer.",
      "invalid-participant-type": "Participant type must be team or player.",
      "invalid-winner": "Winner must be one of the match participants.",
      "finished-match-requires-scores": "Finished matches require both scores.",
      "finished-match-requires-participants":
        "Finished matches require matched participant records.",
      "tie-match-requires-winner": "Tied finished matches require a selected winner.",
      "winner-score-mismatch": "Winner must match the higher score.",
      "invalid-schedule": "Schedule date and time must both be valid or both be empty.",
      "invalid-timezone": "Timezone must be a valid IANA timezone.",
      "invalid-bracket-size": "Bracket size must be 2, 4, 8, or 16 participants.",
      "invalid-bracket": "Bracket id is missing.",
      "invalid-bracket-status": "Bracket status action is invalid.",
      "bracket-confirm-required":
        "This tournament already has a bracket. Confirm regeneration to replace the bracket template.",
      "invalid-bracket-chain": "Bracket template links could not be generated safely.",
      "invalid-bracket-slot": "Bracket slot must be 1 or 2.",
      "invalid-participant": "Participant must belong to this tournament and match type.",
      "bracket-match-not-found": "Bracket match could not be found for this tournament.",
      "not-bracket-match": "Only generated bracket matches can use slot assignment.",
      "finished-match-locked": "Finished matches cannot have bracket slots changed.",
      "bracket-locked": "This bracket is locked and cannot be edited.",
      "bracket-active-locked":
        "This bracket has live or finished matches and cannot be structurally edited.",
      "bracket-unlock-blocked":
        "Brackets cannot be unlocked after matches are live or finished.",
      "bracket-match-controls-locked":
        "Lock the bracket before editing bracket match status or scores.",
      "bracket-match-incomplete":
        "Assign both bracket slots before starting or finishing the match.",
      "duplicate-bracket-participant":
        "A participant cannot be assigned twice in the same bracket.",
      "bracket-propagation-target-locked":
        "Winner could not advance because the next bracket match has already started.",
      "bracket-propagation-conflict":
        "Winner could not advance because the next bracket slot already has a different participant.",
      "missing-id": "Match id is missing.",
      "admin-client-unavailable":
        "Match mutations require a server-only Supabase admin client.",
      "mutation-failed": "Match change could not be saved. Please try again.",
    }[searchParams.matchError] ?? "Match change could not be saved."

  return { tone: "error", message }
}

export function getResultFeedback(searchParams?: Pick<AdminSearchParams, "resultError" | "resultSuccess">): AdminFeedback | null {
  if (searchParams?.resultSuccess === "created") return { tone: "success", message: "Result created." }
  if (searchParams?.resultSuccess === "updated") return { tone: "success", message: "Result updated." }
  if (searchParams?.resultSuccess === "deleted") return { tone: "success", message: "Result deleted." }
  if (!searchParams?.resultError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-result-team": "Team must not be empty.",
      "invalid-placement": "Placement must be a positive integer.",
      "invalid-participant-type": "Participant type must be team or player.",
      "missing-id": "Result id is missing.",
      "admin-client-unavailable":
        "Result mutations require a server-only Supabase admin client.",
      "mutation-failed": "Result change could not be saved. Please try again.",
    }[searchParams.resultError] ?? "Result change could not be saved."

  return { tone: "error", message }
}

export function getPlayerApplicationFeedback(searchParams?: Pick<AdminSearchParams, "playerApplicationError" | "playerApplicationSuccess">): AdminFeedback | null {
  if (searchParams?.playerApplicationSuccess === "approved") return { tone: "success", message: "Player application approved." }
  if (searchParams?.playerApplicationSuccess === "rejected") return { tone: "success", message: "Player application rejected." }
  if (!searchParams?.playerApplicationError) return null

  const message =
    {
      "missing-id": "Player application id is missing.",
      "invalid-status": "Player application decision must be approve or reject.",
      "already-reviewed": "This player application has already been reviewed.",
      "admin-client-unavailable":
        "Player application review requires a server-only Supabase admin client.",
      "mutation-failed": "Player application review could not be saved. Please try again.",
    }[searchParams.playerApplicationError] ?? "Player application review could not be saved."

  return { tone: "error", message }
}

export function getRegistrationFeedback(searchParams?: Pick<AdminSearchParams, "registrationError" | "registrationSuccess">): AdminFeedback | null {
  if (searchParams?.registrationSuccess === "approved") return { tone: "success", message: "Registration approved and added to participants." }
  if (searchParams?.registrationSuccess === "rejected") return { tone: "success", message: "Registration rejected." }
  if (!searchParams?.registrationError) return null

  const message =
    {
      "missing-id": "Registration id is missing.",
      "invalid-status": "Registration decision must be approve or reject.",
      "already-reviewed": "This registration has already been reviewed.",
      "invalid-participant-type": "Tournament participant type is invalid.",
      "wrong-participant-type": "This registration does not match the tournament participant type.",
      "invalid-tournament-id": "Registration tournament could not be found.",
      "registration-closed": "This tournament is closed.",
      "registration-full": "This tournament is full.",
      "duplicate-registration": "This participant is already approved for the tournament.",
      "admin-client-unavailable":
        "Registration review requires a server-only Supabase admin client.",
      "mutation-failed": "Registration review could not be saved. Please try again.",
    }[searchParams.registrationError] ?? "Registration review could not be saved."

  return { tone: "error", message }
}

export function getDisputeFeedback(searchParams?: Pick<AdminSearchParams, "disputeError" | "disputeSuccess">): AdminFeedback | null {
  if (searchParams?.disputeSuccess === "under_review") return { tone: "success", message: "Dispute marked under review." }
  if (searchParams?.disputeSuccess === "resolved") return { tone: "success", message: "Dispute resolved." }
  if (searchParams?.disputeSuccess === "rejected") return { tone: "success", message: "Dispute rejected." }
  if (searchParams?.disputeSuccess === "open") return { tone: "success", message: "Dispute reopened." }
  if (!searchParams?.disputeError) return null

  const message =
    {
      "missing-id": "Dispute id is missing.",
      "invalid-status": "Dispute status is invalid.",
      "admin-client-unavailable":
        "Dispute review requires a server-only Supabase admin client.",
      "mutation-failed": "Dispute review could not be saved. Please try again.",
    }[searchParams.disputeError] ?? "Dispute review could not be saved."

  return { tone: "error", message }
}
