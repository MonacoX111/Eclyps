"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  createBracketTemplateMatches,
  isBracketSize,
  type BracketTemplateMatch,
} from "@/lib/brackets/template"
import { logMutationError } from "@/lib/admin/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  parseBracketSlotAssignmentFormData,
  parseBracketTemplateFormData,
} from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

export async function generateBracketTemplate(formData: FormData) {
  await requireAdminSession()
  const parsed = parseBracketTemplateFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)
  if (!isBracketSize(parsed.data.bracket_size)) {
    redirect("/admin?matchError=invalid-bracket-size#matches")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const existingMatches = await supabaseAdmin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", parsed.data.tournament_id)

  if (existingMatches.error) {
    logMutationError("count matches before bracket generation", existingMatches.error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  if ((existingMatches.count ?? 0) > 0 && !parsed.data.confirm_regenerate) {
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

  if (match.status === "finished") {
    redirect("/admin?matchError=finished-match-locked#matches")
  }

  if (
    match.bracket_status === "locked" ||
    match.bracket_status === "completed" ||
    match.bracket_status === "finished"
  ) {
    redirect("/admin?matchError=bracket-locked#matches")
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
