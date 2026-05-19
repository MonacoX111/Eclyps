"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { findParticipantIdByDisplayName } from "@/lib/admin/participants"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseMatchFormData, parseRequiredIdFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

export async function createMatch(formData: FormData) {
  await requireAdminSession()
  const parsed = parseMatchFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")
  const matchData = await withMatchParticipantReferences(supabaseAdmin, parsed.data)

  const { error } = await runSupabaseMutation("create match", () =>
    supabaseAdmin.from("matches").insert(matchData),
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

  const { error } = await runSupabaseMutation("update match", () =>
    supabaseAdmin.from("matches").update(matchData).eq("id", parsedId.data.id),
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
  } & Record<string, unknown>,
) {
  const [participant1Id, participant2Id] = await Promise.all([
    findParticipantIdByDisplayName(supabaseAdmin, {
      tournamentId: data.tournament_id,
      participantType: data.participant_type,
      displayName: data.team1,
    }),
    findParticipantIdByDisplayName(supabaseAdmin, {
      tournamentId: data.tournament_id,
      participantType: data.participant_type,
      displayName: data.team2,
    }),
  ])
  const winnerParticipantId = resolveWinnerParticipantId({
    status: data.status,
    score1: data.score1,
    score2: data.score2,
    participant1Id,
    participant2Id,
  })

  return {
    ...data,
    ...(participant1Id ? { participant_1_id: participant1Id } : {}),
    ...(participant2Id ? { participant_2_id: participant2Id } : {}),
    ...(winnerParticipantId ? { winner_participant_id: winnerParticipantId } : {}),
  }
}

function resolveWinnerParticipantId({
  status,
  score1,
  score2,
  participant1Id,
  participant2Id,
}: {
  status: "upcoming" | "live" | "finished"
  score1: number | null
  score2: number | null
  participant1Id: string | null
  participant2Id: string | null
}) {
  if (status !== "finished" || score1 === null || score2 === null || score1 === score2) {
    return null
  }

  return score1 > score2 ? participant1Id : participant2Id
}
