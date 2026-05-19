"use server"

import { cookies } from "next/headers"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  ADMIN_SESSION_COOKIE,
  checkAdminLoginRateLimit,
  clearAdminLoginRateLimit,
  createAdminSession,
  getAdminAuthReadiness,
  getAdminLoginIdentifier,
  getAdminSessionCookieOptions,
  getAdminSessionDeleteCookieOptions,
  getAdminUserAgent,
  isValidAdminPassword,
  isValidAdminSession,
  recordFailedAdminLogin,
  revokeAdminSession,
} from "@/lib/admin-auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { logMutationError } from "@/lib/admin/errors"
import {
  readNonNegativeInteger,
  readOptionalInteger,
  readOptionalPositiveInteger,
  readOptionalString,
  readOptionalStringArray,
  readParticipantType,
  readPositiveInteger,
  readRequiredString,
  readValidStatus,
  type ParticipantType,
  type ValidStatus,
} from "@/lib/admin/form-values"

export async function loginAdmin(formData: FormData) {
  const readiness = await getAdminAuthReadiness()
  if (!readiness.ok) {
    redirect(readiness.reason === "storage" ? "/admin?error=storage" : "/admin?error=unavailable")
  }

  const headersList = await headers()
  const identifier = getAdminLoginIdentifier(headersList)
  const rateLimit = await checkAdminLoginRateLimit(identifier)

  if (!rateLimit.allowed) {
    redirect(rateLimit.retryAfterSeconds ? "/admin?error=rate-limited" : "/admin?error=unavailable")
  }

  if (!(await isValidAdminPassword(formData.get("password")))) {
    await recordFailedAdminLogin(identifier)
    redirect("/admin?error=invalid")
  }

  await clearAdminLoginRateLimit(identifier)

  const session = await createAdminSession({
    identifier,
    userAgent: getAdminUserAgent(headersList),
  })

  if (!session) {
    redirect("/admin?error=unavailable")
  }

  const cookieStore = await cookies()

  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    session.token,
    getAdminSessionCookieOptions(session.maxAge),
  )

  redirect("/admin")
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  await revokeAdminSession(sessionCookie)

  cookieStore.delete(getAdminSessionDeleteCookieOptions())

  redirect("/admin")
}

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

  const tournamentId = readRequiredString(formData.get("id"))
  const parsed = parseTournamentFormData(formData)

  if (!tournamentId) {
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
    supabaseAdmin.from("tournaments").update(parsed.data).eq("id", tournamentId),
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

  const tournamentId = readRequiredString(formData.get("id"))

  if (!tournamentId) {
    redirectAdminError("crudError", "missing-id", "tournaments")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirectAdminError("crudError", "admin-client-unavailable", "tournaments")
  }

  const { error } = await runSupabaseMutation("delete tournament", () =>
    supabaseAdmin.from("tournaments").delete().eq("id", tournamentId),
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

  const tournamentId = readRequiredString(formData.get("id"))

  if (!tournamentId) {
    redirect("/admin?activeError=missing-id#active-tournament")
  }

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

  const { error } = await runSupabaseMutation("create team", () =>
    supabaseAdmin.from("teams").insert(parsed.data),
  )

  if (error) {
    logMutationError("create team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=created#teams")
}

export async function updateTeam(formData: FormData) {
  await requireAdminSession()

  const teamId = readRequiredString(formData.get("id"))
  const parsed = parseTeamFormData(formData)

  if (!teamId) {
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
    supabaseAdmin.from("teams").update(parsed.data).eq("id", teamId),
  )

  if (error) {
    logMutationError("update team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=updated#teams")
}

export async function deleteTeam(formData: FormData) {
  await requireAdminSession()

  const teamId = readRequiredString(formData.get("id"))

  if (!teamId) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { error } = await runSupabaseMutation("delete team", () =>
    supabaseAdmin.from("teams").delete().eq("id", teamId),
  )

  if (error) {
    logMutationError("delete team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=deleted#teams")
}

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
  redirect("/admin?playerSuccess=created#players")
}

export async function updatePlayer(formData: FormData) {
  await requireAdminSession()
  const id = readRequiredString(formData.get("id"))
  const parsed = parsePlayerFormData(formData)
  if (!id) redirect("/admin?playerError=missing-id#players")
  if (!parsed.ok) redirect(`/admin?playerError=${parsed.error}#players`)
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?playerError=admin-client-unavailable#players")
  const { error } = await runSupabaseMutation("update player", () =>
    supabaseAdmin.from("players").update(parsed.data).eq("id", id),
  )
  if (error) {
    logMutationError("update player", error)
    redirect("/admin?playerError=mutation-failed#players")
  }
  revalidatePath("/admin")
  redirect("/admin?playerSuccess=updated#players")
}

export async function deletePlayer(formData: FormData) {
  await requireAdminSession()
  const id = readRequiredString(formData.get("id"))
  if (!id) redirect("/admin?playerError=missing-id#players")
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?playerError=admin-client-unavailable#players")
  const { error } = await runSupabaseMutation("delete player", () =>
    supabaseAdmin.from("players").delete().eq("id", id),
  )
  if (error) {
    logMutationError("delete player", error)
    redirect("/admin?playerError=mutation-failed#players")
  }
  revalidatePath("/admin")
  redirect("/admin?playerSuccess=deleted#players")
}

export async function createMatch(formData: FormData) {
  await requireAdminSession()
  const parsed = parseMatchFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { error } = await runSupabaseMutation("create match", () =>
    supabaseAdmin.from("matches").insert(parsed.data),
  )
  if (error) {
    logMutationError("create match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=created#matches")
}

export async function updateMatch(formData: FormData) {
  await requireAdminSession()
  const matchId = readRequiredString(formData.get("id"))
  const parsed = parseMatchFormData(formData)
  if (!matchId) redirect("/admin?matchError=missing-id#matches")
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { error } = await runSupabaseMutation("update match", () =>
    supabaseAdmin.from("matches").update(parsed.data).eq("id", matchId),
  )
  if (error) {
    logMutationError("update match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=updated#matches")
}

export async function deleteMatch(formData: FormData) {
  await requireAdminSession()
  const matchId = readRequiredString(formData.get("id"))
  if (!matchId) redirect("/admin?matchError=missing-id#matches")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { error } = await runSupabaseMutation("delete match", () =>
    supabaseAdmin.from("matches").delete().eq("id", matchId),
  )
  if (error) {
    logMutationError("delete match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=deleted#matches")
}

export async function createResult(formData: FormData) {
  await requireAdminSession()
  const parsed = parseResultFormData(formData)
  if (!parsed.ok) redirect(`/admin?resultError=${parsed.error}#results`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?resultError=admin-client-unavailable#results")

  const { error } = await runSupabaseMutation("create result", () =>
    supabaseAdmin.from("results").insert(parsed.data),
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
  const resultId = readRequiredString(formData.get("id"))
  const parsed = parseResultFormData(formData)
  if (!resultId) redirect("/admin?resultError=missing-id#results")
  if (!parsed.ok) redirect(`/admin?resultError=${parsed.error}#results`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?resultError=admin-client-unavailable#results")

  const { error } = await runSupabaseMutation("update result", () =>
    supabaseAdmin.from("results").update(parsed.data).eq("id", resultId),
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
  const resultId = readRequiredString(formData.get("id"))
  if (!resultId) redirect("/admin?resultError=missing-id#results")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?resultError=admin-client-unavailable#results")

  const { error } = await runSupabaseMutation("delete result", () =>
    supabaseAdmin.from("results").delete().eq("id", resultId),
  )
  if (error) {
    logMutationError("delete result", error)
    redirect("/admin?resultError=mutation-failed#results")
  }

  revalidatePath("/admin")
  redirect("/admin?resultSuccess=deleted#results")
}

async function requireAdminSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!(await isValidAdminSession(sessionCookie))) {
    redirect("/admin")
  }
}

async function runSupabaseMutation<T extends { error: unknown }>(
  context: string,
  mutation: () => PromiseLike<T>,
) {
  try {
    return await mutation()
  } catch (error) {
    logMutationError(context, error)
    return { error } as T
  }
}

function redirectAdminError(param: string, value: string, hash: string): never {
  redirect(`/admin?${param}=${value}#${hash}`)
}

function redirectAdminSuccess(param: string, value: string, hash: string): never {
  redirect(`/admin?${param}=${value}#${hash}`)
}

function parseTournamentFormData(formData: FormData):
  | {
      ok: true
      data: {
        name: string
        game: string
        event_date: string | null
        format: string | null
        team_count: number
        match_days: number
        status: ValidStatus
        prize_pool: string | null
        arena_title: string | null
        arena_description: string | null
        arena_tags: string[] | null
      }
    }
  | { ok: false; error: string } {
  const name = readRequiredString(formData.get("name"))
  const game = readRequiredString(formData.get("game"))
  const eventDate = readOptionalString(formData.get("event_date"))
  const format = readOptionalString(formData.get("format"))
  const teamCount = readPositiveInteger(formData.get("team_count"))
  const matchDays = readPositiveInteger(formData.get("match_days"))
  const status = readValidStatus(formData.get("status"))
  const prizePool = readOptionalString(formData.get("prize_pool"))
  const arenaTitle = readOptionalString(formData.get("arena_title"))
  const arenaDescription = readOptionalString(formData.get("arena_description"))
  const arenaTags = readOptionalStringArray(formData.get("arena_tags"))

  if (!name) return { ok: false, error: "invalid-name" }
  if (!game) return { ok: false, error: "invalid-game" }
  if (!teamCount) return { ok: false, error: "invalid-team-count" }
  if (!matchDays) return { ok: false, error: "invalid-match-days" }
  if (!status) return { ok: false, error: "invalid-status" }

  return {
    ok: true,
    data: {
      name,
      game,
      event_date: eventDate,
      format,
      team_count: teamCount,
      match_days: matchDays,
      status,
      prize_pool: prizePool,
      arena_title: arenaTitle,
      arena_description: arenaDescription,
      arena_tags: arenaTags,
    },
  }
}

function parseTeamFormData(formData: FormData):
  | {
      ok: true
      data: {
        tournament_id: string
        name: string
        seed: number
        wins: number
        losses: number
      }
    }
  | { ok: false; error: string } {
  const tournamentId = readRequiredString(formData.get("tournament_id"))
  const name = readRequiredString(formData.get("name"))
  const seed = readPositiveInteger(formData.get("seed"))
  const wins = readNonNegativeInteger(formData.get("wins"))
  const losses = readNonNegativeInteger(formData.get("losses"))

  if (!tournamentId) return { ok: false, error: "invalid-tournament-id" }
  if (!name) return { ok: false, error: "invalid-team-name" }
  if (!seed) return { ok: false, error: "invalid-seed" }
  if (wins === null) return { ok: false, error: "invalid-wins" }
  if (losses === null) return { ok: false, error: "invalid-losses" }

  return {
    ok: true,
    data: {
      tournament_id: tournamentId,
      name,
      seed,
      wins,
      losses,
    },
  }
}

function parseMatchFormData(formData: FormData):
  | {
      ok: true
      data: {
        tournament_id: string
        round: string | null
        team1: string
        team2: string
        score1: number | null
        score2: number | null
        status: ValidStatus
        match_order: number
        participant_type: ParticipantType
      }
    }
  | { ok: false; error: string } {
  const tournamentId = readRequiredString(formData.get("tournament_id"))
  const round = readOptionalString(formData.get("round"))
  const team1 = readRequiredString(formData.get("team1"))
  const team2 = readRequiredString(formData.get("team2"))
  const score1 = readOptionalInteger(formData.get("score1"))
  const score2 = readOptionalInteger(formData.get("score2"))
  const status = readValidStatus(formData.get("status"))
  const matchOrder = readPositiveInteger(formData.get("match_order"))
  const participantType = readParticipantType(formData.get("participant_type"))

  if (!tournamentId) return { ok: false, error: "invalid-tournament-id" }
  if (!team1) return { ok: false, error: "invalid-team1" }
  if (!team2) return { ok: false, error: "invalid-team2" }
  if (team1.toLowerCase() === team2.toLowerCase()) {
    return { ok: false, error: "duplicate-match-teams" }
  }
  if (score1 === undefined || score2 === undefined) {
    return { ok: false, error: "invalid-score" }
  }
  if (!status) return { ok: false, error: "invalid-status" }
  if (!matchOrder) return { ok: false, error: "invalid-match-order" }
  if (!participantType) return { ok: false, error: "invalid-participant-type" }

  return {
    ok: true,
    data: {
      tournament_id: tournamentId,
      round,
      team1,
      team2,
      score1,
      score2,
      status,
      match_order: matchOrder,
      participant_type: participantType,
    },
  }
}

function parseResultFormData(formData: FormData):
  | {
      ok: true
      data: {
        tournament_id: string
        team: string
        placement: number
        label: string | null
        mvp: string | null
        scoreline: string | null
        note: string | null
        participant_type: ParticipantType
      }
    }
  | { ok: false; error: string } {
  const tournamentId = readRequiredString(formData.get("tournament_id"))
  const team = readRequiredString(formData.get("team"))
  const placement = readPositiveInteger(formData.get("placement"))
  const participantType = readParticipantType(formData.get("participant_type"))

  if (!tournamentId) return { ok: false, error: "invalid-tournament-id" }
  if (!team) return { ok: false, error: "invalid-result-team" }
  if (!placement) return { ok: false, error: "invalid-placement" }
  if (!participantType) return { ok: false, error: "invalid-participant-type" }

  return {
    ok: true,
    data: {
      tournament_id: tournamentId,
      team,
      placement,
      label: readOptionalString(formData.get("label")),
      mvp: readOptionalString(formData.get("mvp")),
      scoreline: readOptionalString(formData.get("scoreline")),
      note: readOptionalString(formData.get("note")),
      participant_type: participantType,
    },
  }
}

function parsePlayerFormData(formData: FormData):
  | {
      ok: true
      data: {
        tournament_id: string
        name: string
        nickname: string | null
        seed: number | null
        wins: number
        losses: number
      }
    }
  | { ok: false; error: string } {
  const tournamentId = readRequiredString(formData.get("tournament_id"))
  const name = readRequiredString(formData.get("name"))
  const nickname = readOptionalString(formData.get("nickname"))
  const seed = readOptionalPositiveInteger(formData.get("seed"))
  const wins = readNonNegativeInteger(formData.get("wins"))
  const losses = readNonNegativeInteger(formData.get("losses"))
  if (!tournamentId) return { ok: false, error: "invalid-tournament-id" }
  if (!name) return { ok: false, error: "invalid-player-name" }
  if (seed === undefined) return { ok: false, error: "invalid-player-seed" }
  if (wins === null) return { ok: false, error: "invalid-wins" }
  if (losses === null) return { ok: false, error: "invalid-losses" }
  return { ok: true, data: { tournament_id: tournamentId, name, nickname, seed, wins, losses } }
}
