"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parsePlayerFormData, parseRequiredIdFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

export async function createPlayer(formData: FormData) {
  await requireAdminSession()
  const parsed = parsePlayerFormData(formData)
  if (!parsed.ok) redirect(`/admin?playerError=${parsed.error}#players`)
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?playerError=admin-client-unavailable#players")
  const { error } = await runSupabaseMutation("create player", () =>
    supabaseAdmin.from("players").insert(parsed.data),
  )
  if (error) {
    logMutationError("create player", error)
    redirect("/admin?playerError=mutation-failed#players")
  }
  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?playerSuccess=created#players")
}

export async function updatePlayer(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parsePlayerFormData(formData)
  if (!parsedId.ok) redirect("/admin?playerError=missing-id#players")
  if (!parsed.ok) redirect(`/admin?playerError=${parsed.error}#players`)
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?playerError=admin-client-unavailable#players")
  const { error } = await runSupabaseMutation("update player", () =>
    supabaseAdmin.from("players").update(parsed.data).eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("update player", error)
    redirect("/admin?playerError=mutation-failed#players")
  }
  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?playerSuccess=updated#players")
}

export async function deletePlayer(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?playerError=missing-id#players")
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?playerError=admin-client-unavailable#players")

  const { error } = await runSupabaseMutation("delete player", () =>
    supabaseAdmin.from("players").delete().eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("delete player", error)
    redirect("/admin?playerError=mutation-failed#players")
  }
  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?playerSuccess=deleted#players")
}
