"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { findParticipantIdByDisplayName } from "@/lib/admin/participants"
import { resolveMatchWinner, type WinnerSelection } from "@/lib/matches/core"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseMatchFormData, parseRequiredIdFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

type MatchMutationData = {
  tournament_id: string
  round: string | null
  team1: string
  team2: string
  score1: number | null
  score2: number | null
  status: "upcoming" | "live" | "finished"
  match_order: number
  participant_type: "team" | "player"
  participant_1_id: string | null
  participant_2_id: string | null
  winner_participant_id: string | null
  scheduled_at: string | null
  timezone: string | null
  schedule_note: string | null
}

type MatchMutationResult =
  | { ok: true; data: MatchMutationData }
  | { ok: false; error: string }

export async function createMatch(formData: FormData) {
  await requireAdminSession()
  const parsed = parseMatchFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")
  const matchData = await withMatchParticipantReferences(supabaseAdmin, parsed.data)
  if (!matchData.ok) redirect(`/admin?matchError=${matchData.error}#matches`)

  const { error } = await runSupabaseMutation("create match", () =>
    supabaseAdmin.from("matches").insert(matchData.data),
  )
  if (error) {
    logMutationError("create match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=created#matches")
}

export async function updateMatch(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parseMatchFormData(formData)
  if (!parsedId.ok) redirect("/admin?matchError=missing-id#matches")
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")
  const matchData = await withMatchParticipantReferences(supabaseAdmin, parsed.data)
  if (!matchData.ok) redirect(`/admin?matchError=${matchData.error}#matches`)

  const { error } = await runSupabaseMutation("update match", () =>
    supabaseAdmin.from("matches").update(matchData.data).eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("update match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=updated#matches")
}

export async function deleteMatch(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?matchError=missing-id#matches")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { error } = await runSupabaseMutation("delete match", () =>
    supabaseAdmin.from("matches").delete().eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("delete match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=deleted#matches")
}

async function withMatchParticipantReferences(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  data: {
    tournament_id: string
    team1: string
    team2: string
    score1: number | null
    score2: number | null
    status: "upcoming" | "live" | "finished"
    participant_type: "team" | "player"
    winner_selection: WinnerSelection
    round: string | null
    match_order: number
    schedule_date: string | null
    schedule_time: string | null
    timezone: string
    schedule_note: string | null
  },
): Promise<MatchMutationResult> {
  const {
    winner_selection: winnerSelection,
    schedule_date: scheduleDate,
    schedule_time: scheduleTime,
    timezone,
    schedule_note: scheduleNote,
    ...matchData
  } = data
  const [participant1Id, participant2Id] = await Promise.all([
    findParticipantIdByDisplayName(supabaseAdmin, {
      tournamentId: matchData.tournament_id,
      participantType: matchData.participant_type,
      displayName: matchData.team1,
    }),
    findParticipantIdByDisplayName(supabaseAdmin, {
      tournamentId: matchData.tournament_id,
      participantType: matchData.participant_type,
      displayName: matchData.team2,
    }),
  ])

  const winnerResult = resolveMatchWinner({
    status: matchData.status,
    score1: matchData.score1,
    score2: matchData.score2,
    participant1Id,
    participant2Id,
    winnerSelection,
  })

  if (!winnerResult.ok) {
    return winnerResult
  }

  return {
    ok: true,
    data: {
      ...matchData,
      participant_1_id: participant1Id,
      participant_2_id: participant2Id,
      winner_participant_id: winnerResult.winnerParticipantId,
      scheduled_at: createScheduledAt(scheduleDate, scheduleTime),
      timezone: scheduleDate && scheduleTime ? timezone : null,
      schedule_note: scheduleNote,
    },
  }
}

function createScheduledAt(scheduleDate: string | null, scheduleTime: string | null) {
  if (!scheduleDate || !scheduleTime) return null

  return new Date(`${scheduleDate}T${scheduleTime}:00.000Z`).toISOString()
}
