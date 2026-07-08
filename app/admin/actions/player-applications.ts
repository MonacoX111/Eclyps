"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { requireAdminSession } from "./shared"

export async function reviewPlayerApplication(formData: FormData) {
  await requireAdminSession()

  const id = readRequiredFormString(formData, "id")
  const status = readReviewStatus(formData.get("status"))

  if (!id) redirect("/admin?playerApplicationError=missing-id#player-applications")
  if (!status) {
    redirect("/admin?playerApplicationError=invalid-status#player-applications")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?playerApplicationError=admin-client-unavailable#player-applications")
  }

  const { data: application, error: applicationError } = await supabaseAdmin
    .from("player_applications")
    .select("id, user_profile_id, requested_nickname, requested_region, status")
    .eq("id", id)
    .maybeSingle()

  if (applicationError || !application) {
    redirect("/admin?playerApplicationError=missing-id#player-applications")
  }

  if (application.status !== "pending") {
    redirect("/admin?playerApplicationError=already-reviewed#player-applications")
  }

  if (status === "rejected") {
    await updateApplicationStatus({
      id,
      status: "rejected",
      playerId: null,
    })
    redirect("/admin?playerApplicationSuccess=rejected#player-applications")
  }

  const playerId = await findOrCreateApprovedPlayer({
    userProfileId: application.user_profile_id,
    nickname: application.requested_nickname,
    region:
      typeof application.requested_region === "string"
        ? application.requested_region
        : null,
  })

  if (!playerId) {
    redirect("/admin?playerApplicationError=mutation-failed#player-applications")
  }

  await updateApplicationStatus({
    id,
    status: "approved",
    playerId,
  })
  redirect("/admin?playerApplicationSuccess=approved#player-applications")
}

export async function clearRecentPlayerApplicationDecision(formData: FormData) {
  await requireAdminSession()

  const id = readRequiredFormString(formData, "id")

  if (!id) redirect("/admin?playerApplicationError=missing-id#player-applications")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?playerApplicationError=admin-client-unavailable#player-applications")
  }

  const { error } = await supabaseAdmin
    .from("player_applications")
    .update({
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["approved", "rejected"])
    .not("reviewed_at", "is", null)

  if (error) {
    logMutationError("clear recent player application decision", error)
    redirect("/admin?playerApplicationError=mutation-failed#player-applications")
  }

  revalidatePath("/")
  revalidatePath("/admin")
  redirect("/admin?playerApplicationSuccess=recent-decision-cleared#player-applications")
}

async function findOrCreateApprovedPlayer({
  userProfileId,
  nickname,
  region,
}: {
  userProfileId: string
  nickname: string
  region: string | null
}) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  const { data: existingPlayer, error: existingPlayerError } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("owner_user_id", userProfileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingPlayerError && !isMissingApplicationStorageError(existingPlayerError)) {
    logMutationError("find owned player for application", existingPlayerError)
    return null
  }

  // Branch 1: Player already exists
  if (typeof existingPlayer?.id === "string") {
    const { data: player, error: fetchError } = await supabaseAdmin
      .from("players")
      .select("seed, status")
      .eq("id", existingPlayer.id)
      .maybeSingle()

    if (fetchError) {
      logMutationError("findOrCreateApprovedPlayer - fetch player", fetchError)
      return null
    }

    let retryCount = 0
    const maxRetries = 3
    let success = false
    let lastError: any = null

    while (retryCount < maxRetries && !success) {
      const updatePayload: Record<string, any> = {
        name: nickname,
        nickname,
        region,
        owner_user_id: userProfileId,
        status: "approved",
        updated_at: new Date().toISOString(),
      }

      // If player doesn't have a seed already, compute max(seed) + 1
      if (!player || player.seed === null || player.seed === undefined) {
        const { data: maxSeedRow, error: maxSeedError } = await supabaseAdmin
          .from("players")
          .select("seed")
          .not("seed", "is", null)
          .order("seed", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (maxSeedError) {
          logMutationError("findOrCreateApprovedPlayer - fetch max seed", maxSeedError)
          return null
        }

        const maxSeed = typeof maxSeedRow?.seed === "number" ? maxSeedRow.seed : 0
        updatePayload.seed = maxSeed + 1 + retryCount
      }

      const { error: updateError } = await supabaseAdmin
        .from("players")
        .update(updatePayload)
        .eq("id", existingPlayer.id)

      if (!updateError) {
        success = true
      } else {
        lastError = updateError
        if (updateError.code === "23505") {
          console.warn(`Seed collision detected on update retry ${retryCount + 1}, retrying...`)
          retryCount++
        } else {
          break
        }
      }
    }

    if (!success && !isMissingApplicationStorageError(lastError)) {
      logMutationError("update owned player for application", lastError)
      return null
    }

    return existingPlayer.id
  }

  // Branch 2: Create new player profile
  const tournamentId = await getPlayerProfileAnchorTournamentId()
  if (!tournamentId) return null

  let retryCount = 0
  const maxRetries = 3
  let success = false
  let createdPlayerId: string | null = null
  let lastError: any = null

  while (retryCount < maxRetries && !success) {
    const { data: maxSeedRow, error: maxSeedError } = await supabaseAdmin
      .from("players")
      .select("seed")
      .not("seed", "is", null)
      .order("seed", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxSeedError) {
      logMutationError("findOrCreateApprovedPlayer - fetch max seed for insert", maxSeedError)
      return null
    }

    const maxSeed = typeof maxSeedRow?.seed === "number" ? maxSeedRow.seed : 0
    const nextSeed = maxSeed + 1 + retryCount

    const { data, error: insertError } = await supabaseAdmin
      .from("players")
      .insert({
        tournament_id: tournamentId,
        name: nickname,
        nickname,
        region,
        seed: nextSeed,
        wins: 0,
        losses: 0,
        status: "approved",
        owner_user_id: userProfileId,
      })
      .select("id")
      .maybeSingle()

    if (!insertError && data?.id) {
      success = true
      createdPlayerId = data.id
    } else {
      lastError = insertError
      if (insertError && insertError.code === "23505") {
        console.warn(`Seed collision detected on insert retry ${retryCount + 1}, retrying...`)
        retryCount++
      } else {
        break
      }
    }
  }

  if (!success) {
    logMutationError("create approved player from application", lastError)
    return null
  }

  return createdPlayerId
}

async function getNextEclypsPlayerSeed(): Promise<number> {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return 1

  const { data } = await supabaseAdmin
    .from("players")
    .select("seed")
    .not("seed", "is", null)
    .order("seed", { ascending: false })
    .limit(1)
    .maybeSingle()

  const maxSeed = typeof data?.seed === "number" ? data.seed : 0
  return maxSeed + 1
}

async function getPlayerProfileAnchorTournamentId() {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return null

  const activeResult = await supabaseAdmin
    .from("tournaments")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (typeof activeResult.data?.id === "string") return activeResult.data.id

  const fallbackResult = await supabaseAdmin
    .from("tournaments")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  return typeof fallbackResult.data?.id === "string" ? fallbackResult.data.id : null
}

async function updateApplicationStatus({
  id,
  status,
  playerId,
}: {
  id: string
  status: "approved" | "rejected"
  playerId: string | null
}) {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?playerApplicationError=admin-client-unavailable#player-applications")
  }

  const { error } = await supabaseAdmin
    .from("player_applications")
    .update({
      status,
      created_player_id: playerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    logMutationError("review player application", error)
    redirect("/admin?playerApplicationError=mutation-failed#player-applications")
  }

  revalidatePath("/")
  revalidatePath("/admin")
}

function readRequiredFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function readReviewStatus(value: FormDataEntryValue | null) {
  return value === "approved" || value === "rejected" ? value : null
}

function isMissingApplicationStorageError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200" || error.code === "PGRST204"
}
