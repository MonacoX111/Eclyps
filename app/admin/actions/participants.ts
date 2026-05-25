"use server"

import { revalidatePath } from "next/cache"
import { logMutationError } from "@/lib/admin/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseRequiredIdFormData } from "./parsers"
import {
  redirectAdminError,
  redirectAdminSuccess,
  requireAdminSession,
  runSupabaseMutation,
} from "./shared"

/**
 * Safely removes a participant from a tournament.
 * 
 * BRACKET SAFETY:
 * Before deleting the participant, we check if they are already assigned to generated matches
 * (via participant_1_id or participant_2_id). If so, we block deletion to prevent orphan nodes,
 * broken final brackets, and next_match_id chain corruption.
 * 
 * GLOBAL PROFILE PROTECTION:
 * This deletes ONLY the row from the public.participants table. Due to ON DELETE SET NULL foreign keys,
 * the global player or team profiles remain fully intact.
 */
export async function deleteParticipant(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")

  if (!parsedId.ok) {
    redirectAdminError("participantError", "missing-id", "participants")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirectAdminError("participantError", "admin-client-unavailable", "participants")
  }

  const participantId = parsedId.data.id

  // 1. Bracket Safety Check: Check if participant is already used in matches
  const { data: matches, error: matchesCheckError } = await supabaseAdmin
    .from("matches")
    .select("id")
    .or(`participant_1_id.eq.${participantId},participant_2_id.eq.${participantId}`)
    .limit(1)

  if (matchesCheckError) {
    logMutationError("verify participant bracket usage", matchesCheckError)
    redirectAdminError("participantError", "mutation-failed", "participants")
  }

  if (matches && matches.length > 0) {
    // Participant is already in active/generated matches
    redirectAdminError("participantError", "participant-used-in-matches", "participants")
  }

  // 2. Perform safe participant removal (does not delete global player/team)
  const { error } = await runSupabaseMutation("delete participant", () =>
    supabaseAdmin.from("participants").delete().eq("id", participantId),
  )

  if (error) {
    logMutationError("delete participant row", error)
    redirectAdminError("participantError", "mutation-failed", "participants")
  }

  revalidatePath("/admin")
  redirectAdminSuccess("participantSuccess", "deleted", "participants")
}
