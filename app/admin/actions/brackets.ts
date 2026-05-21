"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  createBracketTemplateMatches,
  isBracketSize,
  type BracketTemplateMatch,
} from "@/lib/brackets/template"
import { logMutationError } from "@/lib/admin/errors"
import { resolveMatchWinner } from "@/lib/matches/core"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  parseBracketMatchUpdateFormData,
  parseBracketSlotAssignmentFormData,
  parseBracketStatusFormData,
  parseBracketTemplateFormData,
} from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

const BRACKET_FINAL_RESULT_NOTE_PREFIX = "synced:bracket-final:"

export async function generateBracketTemplate(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketTemplateFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)
  if (!isBracketSize(parsed.data.bracket_size)) {
    redirect("/admin?matchError=invalid-bracket-size#matches")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const existingBracketMatches = await supabaseAdmin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", parsed.data.tournament_id)
    .or("bracket_id.not.is.null,bracket_status.not.is.null")

  if (existingBracketMatches.error) {
    logMutationError("count bracket matches before bracket generation", existingBracketMatches.error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  const existingBracketStatus = await getTournamentBracketEditBlocker(
    supabaseAdmin,
    parsed.data.tournament_id,
  )
  if (existingBracketStatus) redirect(`/admin?matchError=${existingBracketStatus}#matches`)

  if ((existingBracketMatches.count ?? 0) > 0 && !parsed.data.confirm_regenerate) {
    redirect("/admin?matchError=bracket-confirm-required#matches")
  }

  if (parsed.data.confirm_regenerate) {
    const deleteExistingBracket = await runSupabaseMutation("delete existing bracket template", () =>
      supabaseAdmin
        .from("matches")
        .delete()
        .eq("tournament_id", parsed.data.tournament_id)
        .not("bracket_id", "is", null),
    )

    if (deleteExistingBracket.error) {
      logMutationError("delete existing bracket template", deleteExistingBracket.error)
      redirect("/admin?matchError=mutation-failed#matches")
    }
  }

  const startingMatchOrder = await getNextMatchOrder(
    supabaseAdmin,
    parsed.data.tournament_id,
  )
  const { matches } = createBracketTemplateMatches({
    tournamentId: parsed.data.tournament_id,
    bracketSize: parsed.data.bracket_size,
    startingMatchOrder,
  })

  if (!hasValidNextMatchChain(matches)) {
    redirect("/admin?matchError=invalid-bracket-chain#matches")
  }

  const { error } = await runSupabaseMutation("generate bracket template", () =>
    supabaseAdmin.from("matches").insert(matches),
  )
  if (error) {
    logMutationError("generate bracket template", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=bracket-generated#matches")
}

export async function assignBracketSlot(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketSlotAssignmentFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, status, participant_type, bracket_id, bracket_status, participant_1_id, participant_2_id")
    .eq("id", parsed.data.match_id)
    .maybeSingle()

  if (matchError) {
    logMutationError("fetch bracket match for assignment", matchError)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  if (!match || match.tournament_id !== parsed.data.tournament_id) {
    redirect("/admin?matchError=bracket-match-not-found#matches")
  }

  if (!match.bracket_id) {
    redirect("/admin?matchError=not-bracket-match#matches")
  }

  if (match.status === "live" || match.status === "finished") {
    redirect("/admin?matchError=finished-match-locked#matches")
  }

  if (
    match.bracket_status === "locked" ||
    match.bracket_status === "active" ||
    match.bracket_status === "finished"
  ) {
    redirect("/admin?matchError=bracket-locked#matches")
  }

  if (await bracketHasActiveMatches(supabaseAdmin, match.bracket_id)) {
    redirect("/admin?matchError=bracket-active-locked#matches")
  }

  const participant = parsed.data.participant_id
    ? await getAssignableParticipant(
        supabaseAdmin,
        parsed.data.participant_id,
        parsed.data.tournament_id,
      )
    : null

  if (parsed.data.participant_id && !participant) {
    redirect("/admin?matchError=invalid-participant#matches")
  }

  if (participant) {
    const assignedParticipantTypes = await getAssignedParticipantTypesForBracket(
      supabaseAdmin,
      {
        bracketId: match.bracket_id,
        currentMatchId: match.id,
        currentSlot: parsed.data.slot,
      },
    )

    if (assignedParticipantTypes.some((type) => type !== participant.participant_type)) {
      redirect("/admin?matchError=invalid-participant-type#matches")
    }

    const duplicate = await findDuplicateBracketAssignment(supabaseAdmin, {
      bracketId: match.bracket_id,
      matchId: match.id,
      slot: parsed.data.slot,
      participantId: participant.id,
    })

    if (duplicate) {
      redirect("/admin?matchError=duplicate-bracket-participant#matches")
    }

    await updateBracketParticipantType(supabaseAdmin, {
      bracketId: match.bracket_id,
      participantType: participant.participant_type,
    })
  }

  const update =
    parsed.data.slot === 1
      ? {
          participant_1_id: participant?.id ?? null,
          team1: participant?.display_name ?? null,
          ...(participant ? { participant_type: participant.participant_type } : {}),
          winner_participant_id: null,
        }
      : {
          participant_2_id: participant?.id ?? null,
          team2: participant?.display_name ?? null,
          ...(participant ? { participant_type: participant.participant_type } : {}),
          winner_participant_id: null,
        }

  const { error } = await runSupabaseMutation("assign bracket slot", () =>
    supabaseAdmin.from("matches").update(update).eq("id", match.id),
  )
  if (error) {
    logMutationError("assign bracket slot", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=bracket-slot-updated#matches")
}

export async function updateBracketStatus(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketStatusFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, status, bracket_status")
    .eq("bracket_id", parsed.data.bracket_id)

  if (error) {
    logMutationError("fetch bracket for status update", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  const bracketMatches = matches ?? []
  if (
    bracketMatches.length === 0 ||
    bracketMatches.some((match) => match.tournament_id !== parsed.data.tournament_id)
  ) {
    redirect("/admin?matchError=bracket-match-not-found#matches")
  }

  const hasLiveOrFinished = bracketMatches.some(
    (match) => match.status === "live" || match.status === "finished",
  )

  if (parsed.data.action === "unlock") {
    if (hasLiveOrFinished) {
      redirect("/admin?matchError=bracket-unlock-blocked#matches")
    }

    const { error: updateError } = await runSupabaseMutation("unlock bracket", () =>
      supabaseAdmin
        .from("matches")
        .update({ bracket_status: "template" })
        .eq("bracket_id", parsed.data.bracket_id),
    )
    if (updateError) {
      logMutationError("unlock bracket", updateError)
      redirect("/admin?matchError=mutation-failed#matches")
    }

    revalidatePath("/admin")
    redirect("/admin?matchSuccess=bracket-unlocked#matches")
  }

  if (hasLiveOrFinished) {
    redirect("/admin?matchError=bracket-active-locked#matches")
  }

  const { error: updateError } = await runSupabaseMutation("lock bracket", () =>
    supabaseAdmin
      .from("matches")
      .update({ bracket_status: "locked" })
      .eq("bracket_id", parsed.data.bracket_id),
  )
  if (updateError) {
    logMutationError("lock bracket", updateError)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=bracket-locked#matches")
}

export async function updateBracketMatch(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketMatchUpdateFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, bracket_id, bracket_status, participant_type, participant_1_id, participant_2_id, team1, team2, status, winner_participant_id, next_match_id, next_match_slot")
    .eq("id", parsed.data.match_id)
    .maybeSingle()

  if (matchError) {
    logMutationError("fetch bracket match for result update", matchError)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  if (!match || match.tournament_id !== parsed.data.tournament_id) {
    redirect("/admin?matchError=bracket-match-not-found#matches")
  }

  if (!match.bracket_id) {
    redirect("/admin?matchError=not-bracket-match#matches")
  }

  if (
    match.bracket_status !== "locked" &&
    match.bracket_status !== "active" &&
    match.bracket_status !== "finished"
  ) {
    redirect("/admin?matchError=bracket-match-controls-locked#matches")
  }

  if (
    (parsed.data.status === "live" || parsed.data.status === "finished") &&
    (!match.participant_1_id || !match.participant_2_id)
  ) {
    redirect("/admin?matchError=bracket-match-incomplete#matches")
  }

  const winnerResult = resolveMatchWinner({
    status: parsed.data.status,
    score1: parsed.data.score1,
    score2: parsed.data.score2,
    participant1Id: match.participant_1_id,
    participant2Id: match.participant_2_id,
    winnerSelection: parsed.data.winner_selection,
  })

  if (!winnerResult.ok) {
    redirect(`/admin?matchError=${winnerResult.error}#matches`)
  }

  const { error: updateError } = await runSupabaseMutation("update bracket match", () =>
    supabaseAdmin
      .from("matches")
      .update({
        status: parsed.data.status,
        score1: parsed.data.score1,
        score2: parsed.data.score2,
        winner_participant_id: winnerResult.winnerParticipantId,
      })
      .eq("id", match.id)
      .not("bracket_id", "is", null),
  )

  if (updateError) {
    logMutationError("update bracket match", updateError)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  const propagationResult = await syncBracketWinnerPropagation(supabaseAdmin, {
    match: {
      id: match.id,
      bracketId: match.bracket_id,
      previousStatus: match.status,
      previousWinnerParticipantId: match.winner_participant_id,
      participant1Id: match.participant_1_id,
      participant2Id: match.participant_2_id,
      team1: match.team1,
      team2: match.team2,
      nextMatchId: match.next_match_id,
      nextMatchSlot: match.next_match_slot,
    },
    nextStatus: parsed.data.status,
    nextWinnerParticipantId: winnerResult.winnerParticipantId,
  })

  if (!propagationResult.ok) {
    redirect(`/admin?matchError=${propagationResult.error}#matches`)
  }

  const resultSync = await syncFinalBracketResults(supabaseAdmin, {
    id: match.id,
    tournamentId: match.tournament_id,
    participantType: match.participant_type === "team" ? "team" : "player",
    participant1Id: match.participant_1_id,
    participant2Id: match.participant_2_id,
    team1: match.team1,
    team2: match.team2,
    nextMatchId: match.next_match_id,
    status: parsed.data.status,
    score1: parsed.data.score1,
    score2: parsed.data.score2,
    winnerParticipantId: winnerResult.winnerParticipantId,
  })

  if (!resultSync.ok) {
    redirect(`/admin?matchError=${resultSync.error}#matches`)
  }

  const lifecycleStatus = await resolveBracketLifecycleStatus(
    supabaseAdmin,
    match.bracket_id,
  )

  if (!lifecycleStatus.ok) {
    redirect(`/admin?matchError=${lifecycleStatus.error}#matches`)
  }

  const { error: lifecycleError } = await runSupabaseMutation("update bracket lifecycle", () =>
    supabaseAdmin
      .from("matches")
      .update({ bracket_status: lifecycleStatus.status })
      .eq("bracket_id", match.bracket_id),
  )

  if (lifecycleError) {
    logMutationError("update bracket lifecycle", lifecycleError)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?matchSuccess=bracket-match-updated#matches")
}

async function getNextMatchOrder(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  tournamentId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("match_order")
    .eq("tournament_id", tournamentId)
    .order("match_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logMutationError("fetch next match order", error)
    return 1
  }

  return typeof data?.match_order === "number" ? data.match_order + 1 : 1
}

async function getTournamentBracketEditBlocker(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  tournamentId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("status, bracket_status")
    .eq("tournament_id", tournamentId)
    .not("bracket_id", "is", null)

  if (error) {
    logMutationError("fetch existing bracket status", error)
    return "mutation-failed"
  }

  if ((data ?? []).some((match) => match.status === "live" || match.status === "finished")) {
    return "bracket-active-locked"
  }

  if ((data ?? []).some((match) => match.bracket_status === "locked" || match.bracket_status === "active" || match.bracket_status === "finished")) {
    return "bracket-locked"
  }

  return null
}

async function bracketHasActiveMatches(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  bracketId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("bracket_id", bracketId)
    .in("status", ["live", "finished"])
    .limit(1)

  if (error) {
    logMutationError("check active bracket matches", error)
    return true
  }

  return (data ?? []).length > 0
}

type BracketPropagationMatch = {
  id: string
  bracketId: string
  previousStatus: string | null
  previousWinnerParticipantId: string | null
  participant1Id: string | null
  participant2Id: string | null
  team1: string | null
  team2: string | null
  nextMatchId: string | null
  nextMatchSlot: number | null
}

type BracketPropagationResult =
  | { ok: true }
  | { ok: false; error: string }

type BracketResultSyncMatch = {
  id: string
  tournamentId: string
  participantType: "team" | "player"
  participant1Id: string | null
  participant2Id: string | null
  team1: string | null
  team2: string | null
  nextMatchId: string | null
  status: "upcoming" | "live" | "finished"
  score1: number | null
  score2: number | null
  winnerParticipantId: string | null
}

type SyncedBracketResultRow = {
  tournament_id: string
  team: string
  placement: 1 | 2
  label: string
  mvp: string | null
  scoreline: string | null
  note: string
  participant_type: "team" | "player"
  participant_id: string
}

async function syncFinalBracketResults(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  match: BracketResultSyncMatch,
): Promise<BracketPropagationResult> {
  const note = getBracketFinalResultNote(match.id)

  if (match.nextMatchId) {
    return { ok: true }
  }

  if (match.status !== "finished" || !match.winnerParticipantId) {
    return deleteSyncedFinalResults(supabaseAdmin, {
      tournamentId: match.tournamentId,
      note,
    })
  }

  if (
    match.winnerParticipantId !== match.participant1Id &&
    match.winnerParticipantId !== match.participant2Id
  ) {
    return { ok: false, error: "invalid-winner" }
  }

  const loserParticipantId =
    match.winnerParticipantId === match.participant1Id
      ? match.participant2Id
      : match.participant1Id
  const winnerName =
    match.winnerParticipantId === match.participant1Id ? match.team1 : match.team2
  const loserName =
    match.winnerParticipantId === match.participant1Id ? match.team2 : match.team1

  if (!loserParticipantId || !winnerName || !loserName) {
    return { ok: false, error: "invalid-winner" }
  }

  const scoreline =
    match.score1 !== null && match.score2 !== null
      ? `${match.score1}-${match.score2}`
      : null

  const syncedResults: SyncedBracketResultRow[] = [
    {
      tournament_id: match.tournamentId,
      team: winnerName,
      placement: 1,
      label: "Bracket final",
      mvp: null,
      scoreline,
      note,
      participant_type: match.participantType,
      participant_id: match.winnerParticipantId,
    },
    {
      tournament_id: match.tournamentId,
      team: loserName,
      placement: 2,
      label: "Bracket final",
      mvp: null,
      scoreline,
      note,
      participant_type: match.participantType,
      participant_id: loserParticipantId,
    },
  ]

  const { data: existingResults, error: fetchError } = await supabaseAdmin
    .from("results")
    .select("id, placement")
    .eq("tournament_id", match.tournamentId)
    .eq("note", note)

  if (fetchError) {
    logMutationError("fetch synced bracket final results", fetchError)
    return { ok: false, error: "mutation-failed" }
  }

  const existingByPlacement = new Map(
    (existingResults ?? [])
      .filter((result) => result.placement === 1 || result.placement === 2)
      .map((result) => [result.placement as 1 | 2, result.id as string]),
  )
  const expectedPlacements = new Set([1, 2])
  const staleIds = (existingResults ?? [])
    .filter((result) => !expectedPlacements.has(Number(result.placement)))
    .map((result) => result.id)
    .filter((id): id is string => typeof id === "string")

  if (staleIds.length > 0) {
    const { error: deleteStaleError } = await runSupabaseMutation(
      "delete stale synced bracket final results",
      () => supabaseAdmin.from("results").delete().in("id", staleIds),
    )

    if (deleteStaleError) {
      logMutationError("delete stale synced bracket final results", deleteStaleError)
      return { ok: false, error: "mutation-failed" }
    }
  }

  for (const result of syncedResults) {
    const existingId = existingByPlacement.get(result.placement)

    if (existingId) {
      const { error } = await runSupabaseMutation("update synced bracket final result", () =>
        supabaseAdmin.from("results").update(result).eq("id", existingId),
      )

      if (error) {
        logMutationError("update synced bracket final result", error)
        return { ok: false, error: "mutation-failed" }
      }

      continue
    }

    const { error } = await runSupabaseMutation("create synced bracket final result", () =>
      supabaseAdmin.from("results").insert(result),
    )

    if (error) {
      logMutationError("create synced bracket final result", error)
      return { ok: false, error: "mutation-failed" }
    }
  }

  return { ok: true }
}

async function deleteSyncedFinalResults(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    tournamentId,
    note,
  }: {
    tournamentId: string
    note: string
  },
): Promise<BracketPropagationResult> {
  const { error } = await runSupabaseMutation("delete synced bracket final results", () =>
    supabaseAdmin
      .from("results")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("note", note),
  )

  if (error) {
    logMutationError("delete synced bracket final results", error)
    return { ok: false, error: "mutation-failed" }
  }

  return { ok: true }
}

function getBracketFinalResultNote(matchId: string) {
  return `${BRACKET_FINAL_RESULT_NOTE_PREFIX}${matchId}`
}

async function syncBracketWinnerPropagation(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    match,
    nextStatus,
    nextWinnerParticipantId,
  }: {
    match: BracketPropagationMatch
    nextStatus: "upcoming" | "live" | "finished"
    nextWinnerParticipantId: string | null
  },
): Promise<BracketPropagationResult> {
  const winnerChanged = match.previousWinnerParticipantId !== nextWinnerParticipantId
  const shouldClearPreviousWinner =
    winnerChanged &&
    Boolean(match.previousWinnerParticipantId) &&
    Boolean(match.nextMatchId)

  if (shouldClearPreviousWinner) {
    const clearResult = await clearPropagatedWinnerFromNextMatch(supabaseAdmin, {
      bracketId: match.bracketId,
      nextMatchId: match.nextMatchId,
      nextMatchSlot: match.nextMatchSlot,
      participantId: match.previousWinnerParticipantId,
    })

    if (!clearResult.ok) return clearResult
  }

  if (nextStatus !== "finished" || !nextWinnerParticipantId || !match.nextMatchId) {
    return { ok: true }
  }

  if (
    nextWinnerParticipantId !== match.participant1Id &&
    nextWinnerParticipantId !== match.participant2Id
  ) {
    return { ok: false, error: "invalid-winner" }
  }

  if (match.nextMatchSlot !== 1 && match.nextMatchSlot !== 2) {
    return { ok: false, error: "invalid-bracket-chain" }
  }

  const winnerName =
    nextWinnerParticipantId === match.participant1Id ? match.team1 : match.team2

  if (!winnerName) {
    return { ok: false, error: "invalid-winner" }
  }

  return advanceWinnerToNextMatch(supabaseAdmin, {
    bracketId: match.bracketId,
    nextMatchId: match.nextMatchId,
    nextMatchSlot: match.nextMatchSlot,
    participantId: nextWinnerParticipantId,
    participantName: winnerName,
  })
}

async function advanceWinnerToNextMatch(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    bracketId,
    nextMatchId,
    nextMatchSlot,
    participantId,
    participantName,
  }: {
    bracketId: string
    nextMatchId: string
    nextMatchSlot: 1 | 2
    participantId: string
    participantName: string
  },
): Promise<BracketPropagationResult> {
  const { data: nextMatch, error } = await supabaseAdmin
    .from("matches")
    .select("id, bracket_id, status, participant_1_id, participant_2_id")
    .eq("id", nextMatchId)
    .maybeSingle()

  if (error) {
    logMutationError("fetch next bracket match for propagation", error)
    return { ok: false, error: "mutation-failed" }
  }

  if (!nextMatch || nextMatch.bracket_id !== bracketId) {
    return { ok: false, error: "invalid-bracket-chain" }
  }

  const currentSlotParticipant =
    nextMatchSlot === 1 ? nextMatch.participant_1_id : nextMatch.participant_2_id
  const otherSlotParticipant =
    nextMatchSlot === 1 ? nextMatch.participant_2_id : nextMatch.participant_1_id

  if (currentSlotParticipant === participantId) {
    return { ok: true }
  }

  if (nextMatch.status === "live" || nextMatch.status === "finished") {
    return { ok: false, error: "bracket-propagation-target-locked" }
  }

  if (currentSlotParticipant && currentSlotParticipant !== participantId) {
    return { ok: false, error: "bracket-propagation-conflict" }
  }

  if (otherSlotParticipant === participantId) {
    return { ok: false, error: "duplicate-bracket-participant" }
  }

  const update =
    nextMatchSlot === 1
      ? { participant_1_id: participantId, team1: participantName }
      : { participant_2_id: participantId, team2: participantName }

  const { error: updateError } = await runSupabaseMutation("advance bracket winner", () =>
    supabaseAdmin.from("matches").update(update).eq("id", nextMatchId),
  )

  if (updateError) {
    logMutationError("advance bracket winner", updateError)
    return { ok: false, error: "mutation-failed" }
  }

  return { ok: true }
}

async function clearPropagatedWinnerFromNextMatch(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    bracketId,
    nextMatchId,
    nextMatchSlot,
    participantId,
  }: {
    bracketId: string
    nextMatchId: string | null
    nextMatchSlot: number | null
    participantId: string | null
  },
): Promise<BracketPropagationResult> {
  if (!nextMatchId || !participantId) return { ok: true }

  if (nextMatchSlot !== 1 && nextMatchSlot !== 2) {
    return { ok: false, error: "invalid-bracket-chain" }
  }

  const { data: nextMatch, error } = await supabaseAdmin
    .from("matches")
    .select("id, bracket_id, status, participant_1_id, participant_2_id, winner_participant_id, next_match_id, next_match_slot")
    .eq("id", nextMatchId)
    .maybeSingle()

  if (error) {
    logMutationError("fetch next bracket match for propagation cleanup", error)
    return { ok: false, error: "mutation-failed" }
  }

  if (!nextMatch || nextMatch.bracket_id !== bracketId) {
    return { ok: false, error: "invalid-bracket-chain" }
  }

  const currentSlotParticipant =
    nextMatchSlot === 1 ? nextMatch.participant_1_id : nextMatch.participant_2_id

  if (currentSlotParticipant !== participantId) {
    return { ok: true }
  }

  if (nextMatch.status === "live" || nextMatch.status === "finished") {
    return { ok: false, error: "bracket-propagation-target-locked" }
  }

  if (nextMatch.winner_participant_id === participantId) {
    const clearDownstreamResult = await clearPropagatedWinnerFromNextMatch(supabaseAdmin, {
      bracketId,
      nextMatchId: nextMatch.next_match_id,
      nextMatchSlot: nextMatch.next_match_slot,
      participantId,
    })

    if (!clearDownstreamResult.ok) return clearDownstreamResult
  }

  const update =
    nextMatchSlot === 1
      ? {
          participant_1_id: null,
          team1: null,
          winner_participant_id:
            nextMatch.winner_participant_id === participantId
              ? null
              : nextMatch.winner_participant_id,
        }
      : {
          participant_2_id: null,
          team2: null,
          winner_participant_id:
            nextMatch.winner_participant_id === participantId
              ? null
              : nextMatch.winner_participant_id,
        }

  const { error: updateError } = await runSupabaseMutation("clear propagated bracket winner", () =>
    supabaseAdmin.from("matches").update(update).eq("id", nextMatchId),
  )

  if (updateError) {
    logMutationError("clear propagated bracket winner", updateError)
    return { ok: false, error: "mutation-failed" }
  }

  return { ok: true }
}

async function resolveBracketLifecycleStatus(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  bracketId: string,
): Promise<
  | { ok: true; status: "locked" | "active" | "finished" }
  | { ok: false; error: string }
> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("status")
    .eq("bracket_id", bracketId)

  if (error) {
    logMutationError("fetch bracket lifecycle status", error)
    return { ok: false, error: "mutation-failed" }
  }

  const statuses = (data ?? []).map((match) => match.status)
  if (statuses.length === 0) {
    return { ok: false, error: "bracket-match-not-found" }
  }

  if (statuses.every((status) => status === "finished")) {
    return { ok: true, status: "finished" }
  }

  if (statuses.some((status) => status === "live" || status === "finished")) {
    return { ok: true, status: "active" }
  }

  return { ok: true, status: "locked" }
}

function hasValidNextMatchChain(matches: BracketTemplateMatch[]) {
  const ids = new Set(matches.map((match) => match.id))

  return matches.every((match) => {
    if (!match.next_match_id && match.next_match_slot === null) return true

    return (
      typeof match.next_match_id === "string" &&
      ids.has(match.next_match_id) &&
      (match.next_match_slot === 1 || match.next_match_slot === 2)
    )
  })
}

async function getAssignableParticipant(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  participantId: string,
  tournamentId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("participants")
    .select("id, tournament_id, participant_type, display_name")
    .eq("id", participantId)
    .maybeSingle()

  if (error) {
    logMutationError("fetch participant for bracket assignment", error)
    return null
  }

  if (
    !data ||
    data.tournament_id !== tournamentId ||
    (data.participant_type !== "team" && data.participant_type !== "player") ||
    typeof data.display_name !== "string" ||
    data.display_name.trim().length === 0
  ) {
    return null
  }

  return {
    id: data.id as string,
    participant_type: data.participant_type as "team" | "player",
    display_name: data.display_name.trim(),
  }
}

async function getAssignedParticipantTypesForBracket(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    bracketId,
    currentMatchId,
    currentSlot,
  }: {
    bracketId: string
    currentMatchId: string
    currentSlot: 1 | 2
  },
) {
  const { data: matches, error: matchesError } = await supabaseAdmin
    .from("matches")
    .select("id, participant_1_id, participant_2_id")
    .eq("bracket_id", bracketId)

  if (matchesError) {
    logMutationError("fetch bracket participant types", matchesError)
    return []
  }

  const participantIds = new Set<string>()

  ;(matches ?? []).forEach((row) => {
    if (!(row.id === currentMatchId && currentSlot === 1) && typeof row.participant_1_id === "string") {
      participantIds.add(row.participant_1_id)
    }

    if (!(row.id === currentMatchId && currentSlot === 2) && typeof row.participant_2_id === "string") {
      participantIds.add(row.participant_2_id)
    }
  })

  if (participantIds.size === 0) return []

  const { data: participants, error: participantsError } = await supabaseAdmin
    .from("participants")
    .select("participant_type")
    .in("id", Array.from(participantIds))

  if (participantsError) {
    logMutationError("fetch assigned participants for bracket type check", participantsError)
    return []
  }

  return (participants ?? [])
    .map((row) => row.participant_type)
    .filter((type): type is "team" | "player" => type === "team" || type === "player")
}

async function updateBracketParticipantType(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    bracketId,
    participantType,
  }: {
    bracketId: string
    participantType: "team" | "player"
  },
) {
  const { error } = await runSupabaseMutation("sync bracket participant type", () =>
    supabaseAdmin
      .from("matches")
      .update({ participant_type: participantType })
      .eq("bracket_id", bracketId),
  )

  if (error) {
    logMutationError("sync bracket participant type", error)
  }
}

async function findDuplicateBracketAssignment(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    bracketId,
    matchId,
    slot,
    participantId,
  }: {
    bracketId: string
    matchId: string
    slot: 1 | 2
    participantId: string
  },
) {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("id, participant_1_id, participant_2_id")
    .eq("bracket_id", bracketId)

  if (error) {
    logMutationError("fetch bracket assignments", error)
    return true
  }

  return (data ?? []).some((row) => {
    if (row.id === matchId) {
      return slot === 1
        ? row.participant_2_id === participantId
        : row.participant_1_id === participantId
    }

    return row.participant_1_id === participantId || row.participant_2_id === participantId
  })
}
