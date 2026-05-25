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

export async function reviewPlayer(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?playerError=missing-id#players")
  const status = formData.get("status") as string

  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    redirect("/admin?playerError=invalid-status#players")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?playerError=admin-client-unavailable#players")
  }

  // Fetch the player's current seed first
  const { data: player, error: fetchError } = await supabaseAdmin
    .from("players")
    .select("seed")
    .eq("id", parsedId.data.id)
    .maybeSingle()

  if (fetchError) {
    logMutationError("review player - fetch player", fetchError)
    redirect("/admin?playerError=mutation-failed#players")
  }

  let retryCount = 0
  const maxRetries = 3
  let success = false
  let lastError: any = null

  while (retryCount < maxRetries && !success) {
    const updatePayload: Record<string, any> = { status }

    if (status === "approved") {
      // If the player doesn't have a seed already, compute max(seed) + 1
      if (!player || player.seed === null || player.seed === undefined) {
        const { data: maxSeedRow, error: maxSeedError } = await supabaseAdmin
          .from("players")
          .select("seed")
          .not("seed", "is", null)
          .order("seed", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (maxSeedError) {
          logMutationError("review player - fetch max seed", maxSeedError)
          redirect("/admin?playerError=mutation-failed#players")
        }

        const maxSeed = typeof maxSeedRow?.seed === "number" ? maxSeedRow.seed : 0
        updatePayload.seed = maxSeed + 1 + retryCount // Use retry offset to resolve potential concurrency conflicts
      }
    }

    const { error: updateError } = await runSupabaseMutation("review player", () =>
      supabaseAdmin.from("players").update(updatePayload).eq("id", parsedId.data.id)
    )

    if (!updateError) {
      success = true
    } else {
      lastError = updateError
      if (updateError.code === "23505") {
        console.warn(`Seed collision detected on retry ${retryCount + 1}, retrying with next seed...`)
        retryCount++
      } else {
        // Break out of retry loop for other error types
        break
      }
    }
  }

  if (!success) {
    logMutationError("review player update", lastError)
    redirect("/admin?playerError=mutation-failed#players")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  redirect(`/admin?playerSuccess=${status}#players`)
}

