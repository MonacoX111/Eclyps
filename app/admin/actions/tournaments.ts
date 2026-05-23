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

  const tournamentId = parsedId.data.id

  // 1. Fetch match IDs so we can clean up disputes associated with them first
  const { data: matches, error: matchesFetchError } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)

  if (matchesFetchError) {
    logMutationError("fetch tournament matches for deletion", matchesFetchError)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  const matchIds = matches?.map((m) => m.id) || []

  // 2. Delete match disputes related to matches
  if (matchIds.length > 0) {
    const { error: disputesDeleteError1 } = await supabaseAdmin
      .from("match_disputes")
      .delete()
      .in("match_id", matchIds)

    if (disputesDeleteError1) {
      logMutationError("delete match disputes by match IDs", disputesDeleteError1)
      redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
    }
  }

  // Also delete match disputes associated with the tournament itself
  const { error: disputesDeleteError2 } = await supabaseAdmin
    .from("match_disputes")
    .delete()
    .eq("tournament_id", tournamentId)

  if (disputesDeleteError2) {
    logMutationError("delete match disputes by tournament ID", disputesDeleteError2)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  // 3. Delete results related to tournament
  const { error: resultsDeleteError } = await supabaseAdmin
    .from("results")
    .delete()
    .eq("tournament_id", tournamentId)

  if (resultsDeleteError) {
    logMutationError("delete results", resultsDeleteError)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  // 4. Nullify matches.next_match_id to prevent self-reference key violation
  const { error: matchesUpdateError } = await supabaseAdmin
    .from("matches")
    .update({ next_match_id: null })
    .eq("tournament_id", tournamentId)

  if (matchesUpdateError) {
    logMutationError("nullify matches next_match_id", matchesUpdateError)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  // 5. Delete bracket matches / matches related to tournament
  const { error: matchesDeleteError } = await supabaseAdmin
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)

  if (matchesDeleteError) {
    logMutationError("delete matches", matchesDeleteError)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  // 6. Delete team registration roster entries
  const { error: rosterDeleteError } = await supabaseAdmin
    .from("tournament_registration_roster_entries")
    .delete()
    .eq("tournament_id", tournamentId)

  if (rosterDeleteError) {
    logMutationError("delete roster entries", rosterDeleteError)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  // 7. Delete tournament registrations
  const { error: registrationsDeleteError } = await supabaseAdmin
    .from("tournament_registrations")
    .delete()
    .eq("tournament_id", tournamentId)

  if (registrationsDeleteError) {
    logMutationError("delete registrations", registrationsDeleteError)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  // 8. Delete participants related to tournament
  const { error: participantsDeleteError } = await supabaseAdmin
    .from("participants")
    .delete()
    .eq("tournament_id", tournamentId)

  if (participantsDeleteError) {
    logMutationError("delete participants", participantsDeleteError)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
  }

  // 9. Finally, delete the tournament itself
  const { error } = await runSupabaseMutation("delete tournament", () =>
    supabaseAdmin.from("tournaments").delete().eq("id", tournamentId),
  )

  if (error) {
    logMutationError("delete tournament row", error)
    redirectAdminError("crudError", "dependent-cleanup-failed", "tournaments")
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
