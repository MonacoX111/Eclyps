"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { parseDisputeReviewFormData } from "@/lib/admin/validation"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { requireAdminSession } from "./shared"

export async function reviewDispute(formData: FormData) {
  await requireAdminSession()

  const parsed = parseDisputeReviewFormData(formData)
  if (!parsed.ok) {
    redirect(`/admin?disputeError=${parsed.error}#disputes`)
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?disputeError=admin-client-unavailable#disputes")
  }

  const nowIso = new Date().toISOString()
  const isTerminal = parsed.data.status === "resolved" || parsed.data.status === "rejected"
  const { error } = await supabaseAdmin
    .from("match_disputes")
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.admin_note,
      resolved_at: isTerminal ? nowIso : null,
      updated_at: nowIso,
    })
    .eq("id", parsed.data.id)

  if (error) {
    logMutationError("review dispute", error)
    redirect("/admin?disputeError=mutation-failed#disputes")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  redirect(`/admin?disputeSuccess=${parsed.data.status}#disputes`)
}
