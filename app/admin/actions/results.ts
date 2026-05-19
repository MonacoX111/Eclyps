"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { findParticipantIdByDisplayName } from "@/lib/admin/participants"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseRequiredIdFormData, parseResultFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

export async function createResult(formData: FormData) {
  await requireAdminSession()
  const parsed = parseResultFormData(formData)
  if (!parsed.ok) redirect(`/admin?resultError=${parsed.error}#results`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?resultError=admin-client-unavailable#results")
  const resultData = await withResultParticipantReference(supabaseAdmin, parsed.data)

  const { error } = await runSupabaseMutation("create result", () =>
    supabaseAdmin.from("results").insert(resultData),
  )
  if (error) {
    logMutationError("create result", error)
    redirect("/admin?resultError=mutation-failed#results")
  }

  revalidatePath("/admin")
  redirect("/admin?resultSuccess=created#results")
}

export async function updateResult(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parseResultFormData(formData)
  if (!parsedId.ok) redirect("/admin?resultError=missing-id#results")
  if (!parsed.ok) redirect(`/admin?resultError=${parsed.error}#results`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?resultError=admin-client-unavailable#results")
  const resultData = await withResultParticipantReference(supabaseAdmin, parsed.data)

  const { error } = await runSupabaseMutation("update result", () =>
    supabaseAdmin.from("results").update(resultData).eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("update result", error)
    redirect("/admin?resultError=mutation-failed#results")
  }

  revalidatePath("/admin")
  redirect("/admin?resultSuccess=updated#results")
}

export async function deleteResult(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?resultError=missing-id#results")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?resultError=admin-client-unavailable#results")

  const { error } = await runSupabaseMutation("delete result", () =>
    supabaseAdmin.from("results").delete().eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("delete result", error)
    redirect("/admin?resultError=mutation-failed#results")
  }

  revalidatePath("/admin")
  redirect("/admin?resultSuccess=deleted#results")
}

async function withResultParticipantReference(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  data: {
    tournament_id: string
    team: string
    participant_type: "team" | "player"
  } & Record<string, unknown>,
) {
  const participantId = await findParticipantIdByDisplayName(supabaseAdmin, {
    tournamentId: data.tournament_id,
    participantType: data.participant_type,
    displayName: data.team,
  })

  return {
    ...data,
    ...(participantId ? { participant_id: participantId } : {}),
  }
}
