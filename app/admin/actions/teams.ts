"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import {
  deleteTeamParticipant,
  upsertTeamParticipant,
} from "@/lib/admin/participants"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseRequiredIdFormData, parseTeamFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

export async function createTeam(formData: FormData) {
  await requireAdminSession()

  const parsed = parseTeamFormData(formData)

  if (!parsed.ok) {
    redirect(`/admin?teamError=${parsed.error}#teams`)
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { data: createdTeam, error } = await runSupabaseMutation("create team", () =>
    supabaseAdmin.from("teams").insert(parsed.data).select("id").maybeSingle(),
  )

  if (error) {
    logMutationError("create team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  if (typeof createdTeam?.id === "string") {
    await upsertTeamParticipant(supabaseAdmin, {
      id: createdTeam.id,
      ...parsed.data,
    })
  }

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=created#teams")
}

export async function updateTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parseTeamFormData(formData)

  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  if (!parsed.ok) {
    redirect(`/admin?teamError=${parsed.error}#teams`)
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { error } = await runSupabaseMutation("update team", () =>
    supabaseAdmin.from("teams").update(parsed.data).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("update team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  await upsertTeamParticipant(supabaseAdmin, {
    id: parsedId.data.id,
    ...parsed.data,
  })

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=updated#teams")
}

export async function deleteTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")

  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  await deleteTeamParticipant(supabaseAdmin, parsedId.data.id)

  const { error } = await runSupabaseMutation("delete team", () =>
    supabaseAdmin.from("teams").delete().eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("delete team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=deleted#teams")
}

export async function approveTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { error } = await runSupabaseMutation("approve team", () =>
    supabaseAdmin.from("teams").update({ status: "approved" }).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("approve team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  revalidatePath("/teams")
  redirect("/admin?teamSuccess=approved#teams")
}

export async function rejectTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { error } = await runSupabaseMutation("reject team", () =>
    supabaseAdmin.from("teams").update({ status: "rejected" }).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("reject team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  revalidatePath("/teams")
  redirect("/admin?teamSuccess=rejected#teams")
}

export async function restoreTeamToPending(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { error } = await runSupabaseMutation("restore team to pending", () =>
    supabaseAdmin.from("teams").update({ status: "pending" }).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("restore team to pending", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  revalidatePath("/teams")
  redirect("/admin?teamSuccess=pending#teams")
}

