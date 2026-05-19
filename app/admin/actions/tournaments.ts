"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  parseActiveTournamentFormData,
  parseRequiredIdFormData,
  parseTournamentFormData,
} from "./parsers"
import {
  redirectAdminError,
  redirectAdminSuccess,
  requireAdminSession,
  runSupabaseMutation,
} from "./shared"

export async function createTournament(formData: FormData) {
  await requireAdminSession()

  const parsed = parseTournamentFormData(formData)

  if (!parsed.ok) {
    redirectAdminError("crudError", parsed.error, "tournaments")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirectAdminError("crudError", "admin-client-unavailable", "tournaments")
  }

  const { error } = await runSupabaseMutation("create tournament", () =>
    supabaseAdmin.from("tournaments").insert(parsed.data),
  )

  if (error) {
    logMutationError("create tournament", error)
    redirectAdminError("crudError", "mutation-failed", "tournaments")
  }

  revalidatePath("/admin")
  redirectAdminSuccess("crudSuccess", "created", "tournaments")
}

export async function updateTournament(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parseTournamentFormData(formData)

  if (!parsedId.ok) {
    redirectAdminError("crudError", "missing-id", "tournaments")
  }

  if (!parsed.ok) {
    redirectAdminError("crudError", parsed.error, "tournaments")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirectAdminError("crudError", "admin-client-unavailable", "tournaments")
  }

  const { error } = await runSupabaseMutation("update tournament", () =>
    supabaseAdmin.from("tournaments").update(parsed.data).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("update tournament", error)
    redirectAdminError("crudError", "mutation-failed", "tournaments")
  }

  revalidatePath("/admin")
  redirectAdminSuccess("crudSuccess", "updated", "tournaments")
}

export async function deleteTournament(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")

  if (!parsedId.ok) {
    redirectAdminError("crudError", "missing-id", "tournaments")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirectAdminError("crudError", "admin-client-unavailable", "tournaments")
  }

  const { error } = await runSupabaseMutation("delete tournament", () =>
    supabaseAdmin.from("tournaments").delete().eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("delete tournament", error)
    redirectAdminError("crudError", "mutation-failed", "tournaments")
  }

  revalidatePath("/admin")
  redirectAdminSuccess("crudSuccess", "deleted", "tournaments")
}

export async function setActiveTournament(formData: FormData) {
  await requireAdminSession()

  const parsed = parseActiveTournamentFormData(formData)

  if (!parsed.ok) {
    redirect("/admin?activeError=missing-id#active-tournament")
  }

  const tournamentId = parsed.data.id

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?activeError=admin-client-unavailable#active-tournament")
  }

  const { data: selectedTournament, error: selectedTournamentError } =
    await runSupabaseMutation("verify selected tournament", () =>
      supabaseAdmin.from("tournaments").select("id").eq("id", tournamentId).maybeSingle(),
    )

  if (selectedTournamentError) {
    logMutationError("verify selected tournament", selectedTournamentError)
    redirect("/admin?activeError=mutation-failed#active-tournament")
  }

  if (!selectedTournament) {
    redirect("/admin?activeError=not-found#active-tournament")
  }

  const { error: deactivateError } = await runSupabaseMutation(
    "deactivate other tournaments",
    () => supabaseAdmin.from("tournaments").update({ is_active: false }).neq("id", tournamentId),
  )

  if (deactivateError) {
    logMutationError("deactivate other tournaments", deactivateError)
    redirect("/admin?activeError=mutation-failed#active-tournament")
  }

  const { error: activateError } = await runSupabaseMutation("activate tournament", () =>
    supabaseAdmin.from("tournaments").update({ is_active: true }).eq("id", tournamentId),
  )

  if (activateError) {
    logMutationError("activate tournament", activateError)
    redirect("/admin?activeError=mutation-failed#active-tournament")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  redirect("/admin?activeSuccess=updated#active-tournament")
}
