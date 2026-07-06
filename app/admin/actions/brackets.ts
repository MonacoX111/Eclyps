"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isBracketSize } from "@/lib/brackets/template"
import { type SeedMethod, type SeedableParticipant } from "@/lib/brackets/seeding"
import { normalizeTournamentFormat, normalizeTournamentFormatConfig } from "@/lib/tournament-formats"
import {
  createTournamentTemplate,
  generateGroupsPlayoffsBracket,
  generateNextSwissRound,
  generateTournamentStructure,
} from "@/lib/tournament-engine"
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
  if (!parsed.ok) redirect(`/admin?tab=bracket&matchError=${parsed.error}#bracket`)
  if (!isBracketSize(parsed.data.bracket_size)) {
    redirect("/admin?tab=bracket&matchError=invalid-bracket-size#bracket")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?tab=bracket&matchError=admin-client-unavailable#bracket")

  const existingBracketMatches = await supabaseAdmin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", parsed.data.tournament_id)
    .or("bracket_id.not.is.null,bracket_status.not.is.null")

  if (existingBracketMatches.error) {
    logMutationError("count bracket matches before bracket generation", existingBracketMatches.error)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  const existingBracketStatus = await getTournamentBracketEditBlocker(
    supabaseAdmin,
    parsed.data.tournament_id,
  )
  if (existingBracketStatus) redirect(`/admin?tab=bracket&matchError=${existingBracketStatus}#bracket`)

  if ((existingBracketMatches.count ?? 0) > 0 && !parsed.data.confirm_regenerate) {
    redirect("/admin?tab=bracket&matchError=bracket-confirm-required#bracket")
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
      redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
    }
  }

  const { data: tournament, error: tournamentErr } = await supabaseAdmin
    .from("tournaments")
    .select("id, participant_type, tournament_format, format_config")
    .eq("id", parsed.data.tournament_id)
    .maybeSingle()

  if (tournamentErr || !tournament) {
    redirect("/admin?tab=bracket&matchError=tournament-not-found#bracket")
  }

  const tournamentFormat = normalizeTournamentFormat(tournament.tournament_format)
  const startingMatchOrder = await getNextMatchOrder(
    supabaseAdmin,
    parsed.data.tournament_id,
  )
  const generated = createTournamentTemplate({
    tournamentId: parsed.data.tournament_id,
    tournamentFormat,
    bracketSize: parsed.data.bracket_size,
    startingMatchOrder,
    participantType: tournament.participant_type as "team" | "player",
    config: normalizeTournamentFormatConfig(tournamentFormat, tournament.format_config),
  })

  if (!generated.ok) {
    redirect(`/admin?tab=bracket&matchError=${generated.error}#bracket`)
  }

  const { matches } = generated.data

  if (!hasValidNextMatchChain(matches)) {
    redirect("/admin?tab=bracket&matchError=invalid-bracket-chain#bracket")
  }

  const { error } = await runSupabaseMutation("generate bracket template", () =>
    supabaseAdmin.from("matches").insert(matches),
  )
  if (error) {
    logMutationError("generate bracket template", error)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  revalidatePath("/admin")
  redirect("/admin?tab=bracket&matchSuccess=bracket-generated#bracket")
}

export async function assignBracketSlot(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketSlotAssignmentFormData(formData)
  if (!parsed.ok) redirect(`/admin?tab=bracket&matchError=${parsed.error}#bracket`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?tab=bracket&matchError=admin-client-unavailable#bracket")

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, status, participant_type, bracket_id, bracket_status, participant_1_id, participant_2_id")
    .eq("id", parsed.data.match_id)
    .maybeSingle()

  if (matchError) {
    logMutationError("fetch bracket match for assignment", matchError)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  if (!match || match.tournament_id !== parsed.data.tournament_id) {
    redirect("/admin?tab=bracket&matchError=bracket-match-not-found#bracket")
  }

  if (!match.bracket_id) {
    redirect("/admin?tab=bracket&matchError=not-bracket-match#bracket")
  }

  if (match.status === "live" || match.status === "finished") {
    redirect("/admin?tab=bracket&matchError=finished-match-locked#bracket")
  }

  if (
    match.bracket_status === "locked" ||
    match.bracket_status === "active" ||
    match.bracket_status === "finished"
  ) {
    redirect("/admin?tab=bracket&matchError=bracket-locked#bracket")
  }

  if (await bracketHasActiveMatches(supabaseAdmin, match.bracket_id)) {
    redirect("/admin?tab=bracket&matchError=bracket-active-locked#bracket")
  }

  const participant = parsed.data.participant_id
    ? await getAssignableParticipant(
        supabaseAdmin,
        parsed.data.participant_id,
        parsed.data.tournament_id,
      )
    : null

  if (parsed.data.participant_id && !participant) {
    redirect("/admin?tab=bracket&matchError=invalid-participant#bracket")
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
      redirect("/admin?tab=bracket&matchError=invalid-participant-type#bracket")
    }

    const duplicate = await findDuplicateBracketAssignment(supabaseAdmin, {
      bracketId: match.bracket_id,
      matchId: match.id,
      slot: parsed.data.slot,
      participantId: participant.id,
    })

    if (duplicate) {
      redirect("/admin?tab=bracket&matchError=duplicate-bracket-participant#bracket")
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
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  revalidatePath("/admin")
  redirect("/admin?tab=bracket&matchSuccess=bracket-slot-updated#bracket")
}

export async function updateBracketStatus(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketStatusFormData(formData)
  if (!parsed.ok) redirect(`/admin?tab=bracket&matchError=${parsed.error}#bracket`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?tab=bracket&matchError=admin-client-unavailable#bracket")

  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, status, bracket_status")
    .eq("bracket_id", parsed.data.bracket_id)

  if (error) {
    logMutationError("fetch bracket for status update", error)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  const bracketMatches = matches ?? []
  if (
    bracketMatches.length === 0 ||
    bracketMatches.some((match) => match.tournament_id !== parsed.data.tournament_id)
  ) {
    redirect("/admin?tab=bracket&matchError=bracket-match-not-found#bracket")
  }

  if (parsed.data.action === "unlock") {
    const { error: updateError } = await runSupabaseMutation("unlock bracket", () =>
      supabaseAdmin
        .from("matches")
        .update({ bracket_status: "template" })
        .eq("bracket_id", parsed.data.bracket_id),
    )
    if (updateError) {
      logMutationError("unlock bracket", updateError)
      redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
    }

    revalidatePath("/admin")
    redirect("/admin?tab=bracket&matchSuccess=bracket-unlocked#bracket")
  }

  const { error: updateError } = await runSupabaseMutation("lock bracket", () =>
    supabaseAdmin
      .from("matches")
      .update({ bracket_status: "locked" })
      .eq("bracket_id", parsed.data.bracket_id),
  )
  if (updateError) {
    logMutationError("lock bracket", updateError)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  revalidatePath("/admin")
  redirect("/admin?tab=bracket&matchSuccess=bracket-locked#bracket")
}

export async function updateBracketMatch(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketMatchUpdateFormData(formData)
  if (!parsed.ok) redirect(`/admin?tab=bracket&matchError=${parsed.error}#bracket`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?tab=bracket&matchError=admin-client-unavailable#bracket")

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, bracket_id, bracket_status, participant_type, participant_1_id, participant_2_id, team1, team2, status, winner_participant_id, next_match_id, next_match_slot, bracket_type, bracket_round, loser_next_match_id, loser_next_match_slot")
    .eq("id", parsed.data.match_id)
    .maybeSingle()

  if (matchError) {
    logMutationError("fetch bracket match for result update", matchError)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  if (!match || match.tournament_id !== parsed.data.tournament_id) {
    redirect("/admin?tab=bracket&matchError=bracket-match-not-found#bracket")
  }

  if (!match.bracket_id) {
    redirect("/admin?tab=bracket&matchError=not-bracket-match#bracket")
  }

  if (
    (parsed.data.status === "live" || parsed.data.status === "finished") &&
    (!match.participant_1_id || !match.participant_2_id)
  ) {
    redirect("/admin?tab=bracket&matchError=bracket-match-incomplete#bracket")
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
    redirect(`/admin?tab=bracket&matchError=${winnerResult.error}#bracket`)
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
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
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
      bracketType: match.bracket_type,
      bracketRound: match.bracket_round,
      loserNextMatchId: match.loser_next_match_id,
      loserNextMatchSlot: match.loser_next_match_slot,
    },
    nextStatus: parsed.data.status,
    nextWinnerParticipantId: winnerResult.winnerParticipantId,
  })

  if (!propagationResult.ok) {
    redirect(`/admin?tab=bracket&matchError=${propagationResult.error}#bracket`)
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
    redirect(`/admin?tab=bracket&matchError=${resultSync.error}#bracket`)
  }

  const lifecycleStatus = await resolveBracketLifecycleStatus(
    supabaseAdmin,
    match.bracket_id,
  )

  if (!lifecycleStatus.ok) {
    redirect(`/admin?tab=bracket&matchError=${lifecycleStatus.error}#bracket`)
  }

  const { error: lifecycleError } = await runSupabaseMutation("update bracket lifecycle", () =>
    supabaseAdmin
      .from("matches")
      .update({ bracket_status: lifecycleStatus.status })
      .eq("bracket_id", match.bracket_id),
  )

  if (lifecycleError) {
    logMutationError("update bracket lifecycle", lifecycleError)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?tab=bracket&matchSuccess=bracket-match-updated#bracket")
}

export async function generateNextSwissRoundAction(formData: FormData) {
  await requireAdminSession()

  const tournamentId = String(formData.get("tournament_id") ?? "").trim()
  const bracketId = String(formData.get("bracket_id") ?? "").trim()
  if (!tournamentId || !bracketId) {
    redirect("/admin?tab=bracket&matchError=invalid-bracket#bracket")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?tab=bracket&matchError=admin-client-unavailable#bracket")

  const context = await loadTournamentGenerationContext(supabaseAdmin, tournamentId)
  if (!context.ok) redirect(`/admin?tab=bracket&matchError=${context.error}#bracket`)
  if (context.tournamentFormat !== "swiss") {
    redirect("/admin?tab=bracket&matchError=wrong-tournament-engine#bracket")
  }

  const matchesResult = await loadBracketMatches(supabaseAdmin, tournamentId, bracketId)
  if (!matchesResult.ok) redirect(`/admin?tab=bracket&matchError=${matchesResult.error}#bracket`)
  if (matchesResult.matches.some((match) => match.bracket_type !== "swiss")) {
    redirect("/admin?tab=bracket&matchError=wrong-tournament-engine#bracket")
  }

  const startingMatchOrder = await getNextMatchOrder(supabaseAdmin, tournamentId)
  const generated = generateNextSwissRound({
    tournamentId,
    participants: context.participants,
    matches: matchesResult.matches,
    startingMatchOrder,
    participantType: context.participantType,
    config: context.config,
    bracketId,
  })

  if (!generated.ok) {
    redirect(`/admin?tab=bracket&matchError=${generated.error}#bracket`)
  }

  const { error } = await runSupabaseMutation("generate next Swiss round", () =>
    supabaseAdmin.from("matches").insert(generated.data.matches),
  )
  if (error) {
    logMutationError("generate next Swiss round", error)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?tab=bracket&matchSuccess=swiss-round-generated#bracket")
}

export async function generateGroupsPlayoffsAction(formData: FormData) {
  await requireAdminSession()

  const tournamentId = String(formData.get("tournament_id") ?? "").trim()
  const bracketId = String(formData.get("bracket_id") ?? "").trim()
  if (!tournamentId || !bracketId) {
    redirect("/admin?tab=bracket&matchError=invalid-bracket#bracket")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?tab=bracket&matchError=admin-client-unavailable#bracket")

  const context = await loadTournamentGenerationContext(supabaseAdmin, tournamentId)
  if (!context.ok) redirect(`/admin?tab=bracket&matchError=${context.error}#bracket`)
  if (context.tournamentFormat !== "groups_then_playoffs") {
    redirect("/admin?tab=bracket&matchError=wrong-tournament-engine#bracket")
  }

  const matchesResult = await loadBracketMatches(supabaseAdmin, tournamentId, bracketId)
  if (!matchesResult.ok) redirect(`/admin?tab=bracket&matchError=${matchesResult.error}#bracket`)
  if (matchesResult.matches.some((match) => match.bracket_type !== "groups_then_playoffs")) {
    redirect("/admin?tab=bracket&matchError=wrong-tournament-engine#bracket")
  }
  if (matchesResult.matches.some((match) => !isGroupStageRound(match.bracket_round ?? match.round))) {
    redirect("/admin?tab=bracket&matchError=playoffs-already-generated#bracket")
  }

  const startingMatchOrder = await getNextMatchOrder(supabaseAdmin, tournamentId)
  const generated = generateGroupsPlayoffsBracket({
    tournamentId,
    participants: context.participants,
    matches: matchesResult.matches,
    startingMatchOrder,
    participantType: context.participantType,
    config: context.config,
    bracketId,
  })

  if (!generated.ok) {
    redirect(`/admin?tab=bracket&matchError=${generated.error}#bracket`)
  }

  if (!hasValidNextMatchChain(generated.data.matches)) {
    redirect("/admin?tab=bracket&matchError=invalid-bracket-chain#bracket")
  }

  const { error } = await runSupabaseMutation("generate groups playoffs", () =>
    supabaseAdmin.from("matches").insert(generated.data.matches),
  )
  if (error) {
    logMutationError("generate groups playoffs", error)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?tab=bracket&matchSuccess=playoffs-generated#bracket")
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
  bracketType: string | null
  bracketRound: string | null
  loserNextMatchId: string | null
  loserNextMatchSlot: number | null
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

  if (winnerChanged && match.previousWinnerParticipantId && match.loserNextMatchId) {
    const previousLoserId = resolveLoserParticipantId(match, match.previousWinnerParticipantId)
    if (previousLoserId) {
      const clearLoserResult = await clearPropagatedWinnerFromNextMatch(supabaseAdmin, {
        bracketId: match.bracketId,
        nextMatchId: match.loserNextMatchId,
        nextMatchSlot: match.loserNextMatchSlot,
        participantId: previousLoserId,
      })

      if (!clearLoserResult.ok) return clearLoserResult
    }
  }

  if (nextStatus !== "finished" || !nextWinnerParticipantId) {
    return { ok: true }
  }

  if (
    nextWinnerParticipantId !== match.participant1Id &&
    nextWinnerParticipantId !== match.participant2Id
  ) {
    return { ok: false, error: "invalid-winner" }
  }

  if (match.nextMatchId) {
    if (match.nextMatchSlot !== 1 && match.nextMatchSlot !== 2) {
      return { ok: false, error: "invalid-bracket-chain" }
    }

    const winnerName =
      nextWinnerParticipantId === match.participant1Id ? match.team1 : match.team2

    if (!winnerName) {
      return { ok: false, error: "invalid-winner" }
    }

    const winnerAdvanceResult = await advanceWinnerToNextMatch(supabaseAdmin, {
      bracketId: match.bracketId,
      nextMatchId: match.nextMatchId,
      nextMatchSlot: match.nextMatchSlot,
      participantId: nextWinnerParticipantId,
      participantName: winnerName,
    })

    if (!winnerAdvanceResult.ok) return winnerAdvanceResult
  }

  if (!match.loserNextMatchId) return { ok: true }

  if (match.loserNextMatchSlot !== 1 && match.loserNextMatchSlot !== 2) {
    return { ok: false, error: "invalid-bracket-chain" }
  }

  if (match.bracketType === "double_elimination" && match.bracketRound === "Grand Final") {
    if (nextWinnerParticipantId !== match.participant2Id) return { ok: true }
  }

  const loserId = resolveLoserParticipantId(match, nextWinnerParticipantId)
  const loserName = loserId === match.participant1Id ? match.team1 : match.team2

  if (!loserId || !loserName) {
    return { ok: false, error: "invalid-winner" }
  }

  return advanceWinnerToNextMatch(supabaseAdmin, {
    bracketId: match.bracketId,
    nextMatchId: match.loserNextMatchId,
    nextMatchSlot: match.loserNextMatchSlot,
    participantId: loserId,
    participantName: loserName,
  })
}

function resolveLoserParticipantId(match: BracketPropagationMatch, winnerParticipantId: string) {
  if (winnerParticipantId === match.participant1Id) return match.participant2Id
  if (winnerParticipantId === match.participant2Id) return match.participant1Id
  return null
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
  | { ok: true; status: "template" | "locked" | "active" | "finished" }
  | { ok: false; error: string }
> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("status, bracket_status")
    .eq("bracket_id", bracketId)

  if (error) {
    logMutationError("fetch bracket lifecycle status", error)
    return { ok: false, error: "mutation-failed" }
  }

  const statuses = (data ?? []).map((match) => match.status)
  const storedStatuses = (data ?? []).map((match) => match.bracket_status)
  if (statuses.length === 0) {
    return { ok: false, error: "bracket-match-not-found" }
  }

  if (statuses.every((status) => status === "finished")) {
    return { ok: true, status: "finished" }
  }

  if (statuses.some((status) => status === "live" || status === "finished")) {
    return { ok: true, status: "active" }
  }

  if (storedStatuses.some((status) => status === "locked")) {
    return { ok: true, status: "locked" }
  }

  return { ok: true, status: "template" }
}

function hasValidNextMatchChain(
  matches: {
    id: string
    next_match_id: string | null
    next_match_slot: number | null
    loser_next_match_id?: string | null
    loser_next_match_slot?: number | null
  }[],
) {
  const ids = new Set(matches.map((match) => match.id))

  return matches.every((match) => {
    const winnerPathValid = isValidMatchPath(ids, match.next_match_id, match.next_match_slot)
    const loserPathValid = isValidMatchPath(
      ids,
      match.loser_next_match_id ?? null,
      match.loser_next_match_slot ?? null,
    )

    return winnerPathValid && loserPathValid
  })
}

function isValidMatchPath(ids: Set<string>, nextMatchId: string | null, nextMatchSlot: number | null) {
  if (!nextMatchId && nextMatchSlot === null) return true

  return (
    typeof nextMatchId === "string" &&
    ids.has(nextMatchId) &&
    (nextMatchSlot === 1 || nextMatchSlot === 2)
  )
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

async function loadTournamentGenerationContext(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  tournamentId: string,
) {
  const { data: tournament, error: tournamentErr } = await supabaseAdmin
    .from("tournaments")
    .select("id, participant_type, tournament_format, format_config")
    .eq("id", tournamentId)
    .maybeSingle()

  if (tournamentErr || !tournament) {
    return { ok: false as const, error: "tournament-not-found" }
  }

  const tournamentFormat = normalizeTournamentFormat(tournament.tournament_format)

  const { data: participantRows, error: participantsErr } = await supabaseAdmin
    .from("participants")
    .select("id, display_name, seed")
    .eq("tournament_id", tournamentId)

  if (participantsErr) {
    logMutationError("load participants for tournament engine", participantsErr)
    return { ok: false as const, error: "mutation-failed" }
  }

  const participants: SeedableParticipant[] = (participantRows ?? [])
    .filter((row) => typeof row.display_name === "string" && row.display_name.trim().length > 0)
    .map((row) => ({
      id: String(row.id),
      displayName: String(row.display_name).trim(),
      seed: typeof row.seed === "number" ? row.seed : null,
    }))

  return {
    ok: true as const,
    tournamentFormat,
    participantType: tournament.participant_type === "player" ? "player" as const : "team" as const,
    config: normalizeTournamentFormatConfig(tournamentFormat, tournament.format_config),
    participants,
  }
}

async function loadBracketMatches(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  tournamentId: string,
  bracketId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("id, tournament_id, round, match_order, team1, team2, score1, score2, status, participant_type, participant_1_id, participant_2_id, winner_participant_id, bracket_id, bracket_type, bracket_status, round_order, bracket_round, bracket_position, next_match_id, next_match_slot, loser_next_match_id, loser_next_match_slot")
    .eq("tournament_id", tournamentId)
    .eq("bracket_id", bracketId)
    .order("round_order", { ascending: true, nullsFirst: false })
    .order("bracket_position", { ascending: true, nullsFirst: false })
    .order("match_order", { ascending: true, nullsFirst: false })

  if (error) {
    logMutationError("load bracket matches for tournament engine", error)
    return { ok: false as const, error: "mutation-failed" }
  }

  const matches = (data ?? []).map((match) => ({
    ...match,
    status: match.status === "live" || match.status === "finished" ? match.status : "upcoming" as const,
    participant_type: match.participant_type === "player" ? "player" as const : "team" as const,
    score1: typeof match.score1 === "number" ? match.score1 : null,
    score2: typeof match.score2 === "number" ? match.score2 : null,
    match_order: typeof match.match_order === "number" ? match.match_order : null,
    round_order: typeof match.round_order === "number" ? match.round_order : null,
    bracket_position: typeof match.bracket_position === "number" ? match.bracket_position : null,
    next_match_slot: typeof match.next_match_slot === "number" ? match.next_match_slot : null,
    loser_next_match_slot: typeof match.loser_next_match_slot === "number" ? match.loser_next_match_slot : null,
  }))

  if (matches.length === 0) {
    return { ok: false as const, error: "bracket-match-not-found" }
  }

  return { ok: true as const, matches }
}

function isGroupStageRound(label: string | null | undefined) {
  if (!label) return false
  return /^(Group\s+([A-Z]+|\d+))\s+-\s+Round\s+\d+$/i.test(label)
}


export async function autoGenerateBracket(formData: FormData) {
  await requireAdminSession()

  const tournamentId = String(formData.get("tournament_id") ?? "").trim()
  const methodRaw = String(formData.get("seed_method") ?? "rating").trim()
  const method: SeedMethod = methodRaw === "random" ? "random" : "rating"
  const confirmRegenerate = String(formData.get("confirm_regenerate") ?? "") === "true"

  if (!tournamentId) {
    redirect("/admin?tab=bracket&matchError=invalid-tournament#bracket")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?tab=bracket&matchError=admin-client-unavailable#bracket")

  // Load the tournament (for participant type).
  const { data: tournament, error: tournamentErr } = await supabaseAdmin
    .from("tournaments")
    .select("id, participant_type, tournament_format, format_config")
    .eq("id", tournamentId)
    .maybeSingle()

  if (tournamentErr || !tournament) {
    redirect("/admin?tab=bracket&matchError=tournament-not-found#bracket")
  }

  const tournamentFormat = normalizeTournamentFormat(tournament.tournament_format)

  // Load confirmed participants for this tournament.
  const { data: participantRows, error: participantsErr } = await supabaseAdmin
    .from("participants")
    .select("id, display_name, seed, participant_type")
    .eq("tournament_id", tournamentId)

  if (participantsErr) {
    logMutationError("load participants for auto bracket", participantsErr)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  const participants: SeedableParticipant[] = (participantRows ?? [])
    .filter((row) => typeof row.display_name === "string" && row.display_name.trim().length > 0)
    .map((row) => ({
      id: String(row.id),
      displayName: String(row.display_name).trim(),
      seed: typeof row.seed === "number" ? row.seed : null,
    }))

  if (participants.length < 2) {
    redirect("/admin?tab=bracket&matchError=not-enough-participants#bracket")
  }

  // Block / confirm when a bracket already exists (mirror manual generation).
  const existingBracketStatus = await getTournamentBracketEditBlocker(supabaseAdmin, tournamentId)
  if (existingBracketStatus) redirect(`/admin?tab=bracket&matchError=${existingBracketStatus}#bracket`)

  const existingBracketMatches = await supabaseAdmin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .or("bracket_id.not.is.null,bracket_status.not.is.null")

  if (existingBracketMatches.error) {
    logMutationError("count bracket matches before auto generation", existingBracketMatches.error)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  if ((existingBracketMatches.count ?? 0) > 0 && !confirmRegenerate) {
    redirect("/admin?tab=bracket&matchError=bracket-confirm-required#bracket")
  }

  if (confirmRegenerate) {
    const deleteExistingBracket = await runSupabaseMutation("delete existing bracket before auto", () =>
      supabaseAdmin.from("matches").delete().eq("tournament_id", tournamentId).not("bracket_id", "is", null),
    )
    if (deleteExistingBracket.error) {
      logMutationError("delete existing bracket before auto", deleteExistingBracket.error)
      redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
    }
  }

  const startingMatchOrder = await getNextMatchOrder(supabaseAdmin, tournamentId)
  const generated = generateTournamentStructure({
    tournamentId,
    tournamentFormat,
    participants,
    startingMatchOrder,
    participantType: tournament.participant_type as "team" | "player",
    seedMethod: method,
    config: normalizeTournamentFormatConfig(tournamentFormat, tournament.format_config),
  })

  if (!generated.ok) {
    redirect(`/admin?tab=bracket&matchError=${generated.error}#bracket`)
  }

  if (!hasValidNextMatchChain(generated.data.matches)) {
    redirect("/admin?tab=bracket&matchError=invalid-bracket-chain#bracket")
  }

  const { error } = await runSupabaseMutation("auto generate bracket", () =>
    supabaseAdmin.from("matches").insert(generated.data.matches),
  )
  if (error) {
    logMutationError("auto generate bracket", error)
    redirect("/admin?tab=bracket&matchError=mutation-failed#bracket")
  }

  revalidatePath("/admin")
  redirect("/admin?tab=bracket&matchSuccess=bracket-auto-generated#bracket")
}
