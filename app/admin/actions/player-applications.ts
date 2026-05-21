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

  if (typeof existingPlayer?.id === "string") {
    const { error } = await supabaseAdmin
      .from("players")
      .update({
        name: nickname,
        nickname,
        region,
        owner_user_id: userProfileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPlayer.id)

    if (error && !isMissingApplicationStorageError(error)) {
      logMutationError("update owned player for application", error)
      return null
    }

    return existingPlayer.id
  }

  const [tournamentId, nextSeed] = await Promise.all([
    getPlayerProfileAnchorTournamentId(),
    getNextEclypsPlayerSeed(),
  ])
  if (!tournamentId) return null

  const { data, error } = await supabaseAdmin
    .from("players")
    .insert({
      tournament_id: tournamentId,
      name: nickname,
      nickname,
      region,
      seed: nextSeed,
      wins: 0,
      losses: 0,
      owner_user_id: userProfileId,
    })
    .select("id")
    .maybeSingle()

  if (error || typeof data?.id !== "string") {
    logMutationError("create approved player from application", error)
    return null
  }

  return data.id
}

async function getNextEclypsPlayerSeed(): Promise<number> {
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) return 1

  const { data } = await supabaseAdmin
    .from("players")
    .select("seed")
    .not("owner_user_id", "is", null)
    .order("seed", { ascending: false, nullsFirst: false })
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
