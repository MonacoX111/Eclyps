"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { requireAdminSession, runSupabaseMutation } from "./shared"

type ParticipantImportRow = {
  display_name: string
  seed: number | null
  region: string | null
  image_url: string | null
}

export async function bulkImportParticipants(formData: FormData) {
  await requireAdminSession()

  const tournamentId = readString(formData.get("tournament_id"))
  const rawRows = readString(formData.get("participants"))
  if (!tournamentId) redirectPowerToolError("missing-tournament")
  if (!rawRows) redirectPowerToolError("empty-import")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirectPowerToolError("admin-client-unavailable")

  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("tournaments")
    .select("id, participant_type, team_count")
    .eq("id", tournamentId)
    .maybeSingle()

  if (tournamentError) {
    logMutationError("load tournament for bulk participant import", tournamentError)
    redirectPowerToolError("mutation-failed")
  }

  if (!tournament) redirectPowerToolError("tournament-not-found")

  const participantType = tournament.participant_type === "team" ? "team" : "player"
  const rows = parseParticipantImportRows(rawRows)
  if (rows.length === 0) redirectPowerToolError("empty-import")
  if (rows.length > 128) redirectPowerToolError("too-many-rows")

  const { count: bracketCount, error: bracketCountError } = await supabaseAdmin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .not("bracket_id", "is", null)

  if (bracketCountError) {
    logMutationError("count bracket matches before bulk participant import", bracketCountError)
    redirectPowerToolError("mutation-failed")
  }

  if ((bracketCount ?? 0) > 0) redirectPowerToolError("bracket-already-generated")

  const { data: existingParticipants, error: participantsError } = await supabaseAdmin
    .from("participants")
    .select("display_name, seed")
    .eq("tournament_id", tournamentId)

  if (participantsError) {
    logMutationError("load existing participants before bulk import", participantsError)
    redirectPowerToolError("mutation-failed")
  }

  const existingNames = new Set(
    (existingParticipants ?? [])
      .map((participant) => normalizeNameKey(participant.display_name))
      .filter(Boolean),
  )
  const existingSeeds = new Set(
    (existingParticipants ?? [])
      .map((participant) => participant.seed)
      .filter((seed): seed is number => Number.isInteger(seed)),
  )
  const incomingNames = new Set<string>()
  const incomingSeeds = new Set<number>()

  for (const row of rows) {
    const nameKey = normalizeNameKey(row.display_name)
    if (!nameKey) redirectPowerToolError("invalid-import-row")
    if (existingNames.has(nameKey) || incomingNames.has(nameKey)) {
      redirectPowerToolError("duplicate-participant")
    }
    incomingNames.add(nameKey)

    if (row.seed !== null) {
      if (existingSeeds.has(row.seed) || incomingSeeds.has(row.seed)) {
        redirectPowerToolError("seed-already-used")
      }
      incomingSeeds.add(row.seed)
    }
  }

  const slotLimit = typeof tournament.team_count === "number" ? tournament.team_count : null
  if (slotLimit !== null && (existingParticipants?.length ?? 0) + rows.length > slotLimit) {
    redirectPowerToolError("slot-limit-exceeded")
  }

  const timestamp = new Date().toISOString()
  const payload = rows.map((row) => ({
    tournament_id: tournamentId,
    participant_type: participantType,
    display_name: row.display_name,
    seed: row.seed,
    region: row.region,
    logo_url: participantType === "team" ? row.image_url : null,
    avatar_url: participantType === "player" ? row.image_url : null,
    source_team_id: null,
    source_player_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  }))

  const { error } = await runSupabaseMutation("bulk import participants", () =>
    supabaseAdmin.from("participants").insert(payload),
  )

  if (error) {
    logMutationError("bulk import participants", error)
    redirectPowerToolError("mutation-failed")
  }

  revalidatePath("/admin")
  redirectPowerToolSuccess("participants-imported")
}

export async function updateTournamentFrontendContent(formData: FormData) {
  await requireAdminSession()

  const tournamentId = readString(formData.get("tournament_id"))
  if (!tournamentId) redirectPowerToolError("missing-tournament")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirectPowerToolError("admin-client-unavailable")

  const payload = {
    banner_url: readNullableUrl(formData.get("banner_url")),
    arena_title: readNullableString(formData.get("arena_title")),
    arena_description: readNullableString(formData.get("arena_description")),
    bracket_title: readNullableString(formData.get("bracket_title")),
    bracket_subtitle: readNullableString(formData.get("bracket_subtitle")),
    bracket_stage_label: readNullableString(formData.get("bracket_stage_label")),
    bracket_participant_label: readNullableString(formData.get("bracket_participant_label")),
    bracket_arena_label: readNullableString(formData.get("bracket_arena_label")),
    updated_at: new Date().toISOString(),
  }

  const { error } = await runSupabaseMutation("update tournament frontend content", () =>
    supabaseAdmin.from("tournaments").update(payload).eq("id", tournamentId),
  )

  if (error) {
    logMutationError("update tournament frontend content", error)
    redirectPowerToolError("mutation-failed")
  }

  revalidatePath("/admin")
  revalidatePath("/")
  revalidatePath("/tournament")
  revalidatePath(`/tournaments/${tournamentId}`)
  redirectPowerToolSuccess("content-updated")
}

export async function quickPublishAnnouncement(formData: FormData) {
  await requireAdminSession()

  const title = readString(formData.get("title"))
  const excerpt = readNullableString(formData.get("excerpt"))
  const content = readString(formData.get("content"))
  const coverImageUrl = readNullableUrl(formData.get("cover_image_url"))

  if (!title) redirectPowerToolError("invalid-title")
  if (!content) redirectPowerToolError("invalid-content")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirectPowerToolError("admin-client-unavailable")

  const now = new Date().toISOString()
  const baseSlug = slugify(title)
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const { error } = await runSupabaseMutation("quick publish announcement", () =>
    supabaseAdmin.from("news_posts").insert({
      title,
      slug,
      excerpt,
      content,
      cover_image_url: coverImageUrl,
      category: "Tournament",
      author_name: "Eclyps Admin",
      status: "published",
      published_at: now,
      created_at: now,
      updated_at: now,
    }),
  )

  if (error) {
    logMutationError("quick publish announcement", error)
    redirectPowerToolError("mutation-failed")
  }

  revalidatePath("/admin")
  revalidatePath("/news")
  redirectPowerToolSuccess("announcement-published")
}

function parseParticipantImportRows(rawRows: string): ParticipantImportRow[] {
  return rawRows
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^name\s*[,;\t|]/i.test(line) && !/^display[_\s-]?name\s*[,;\t|]/i.test(line))
    .map((line) => splitImportLine(line))
    .map(([name, seedRaw, region, imageUrl]) => ({
      display_name: name.trim(),
      seed: parseSeed(seedRaw),
      region: normalizeOptional(region),
      image_url: normalizeOptional(imageUrl),
    }))
    .filter((row) => row.display_name.length > 0)
}

function splitImportLine(line: string) {
  const delimiter = line.includes("\t")
    ? "\t"
    : line.includes(";")
      ? ";"
      : line.includes("|")
        ? "|"
        : ","

  return line.split(delimiter).map((cell) => cell.trim())
}

function parseSeed(value: string | undefined) {
  const normalized = normalizeOptional(value)
  if (!normalized) return null

  const seed = Number.parseInt(normalized, 10)
  if (!Number.isInteger(seed) || seed <= 0) redirectPowerToolError("invalid-seed")

  return seed
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function readNullableString(value: FormDataEntryValue | null) {
  return normalizeOptional(typeof value === "string" ? value : null)
}

function readNullableUrl(value: FormDataEntryValue | null) {
  const normalized = readNullableString(value)
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    return url.toString()
  } catch {
    redirectPowerToolError("invalid-url")
  }
}

function normalizeOptional(value: string | null | undefined) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNameKey(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "announcement"
}

function redirectPowerToolError(error: string): never {
  redirect(`/admin?tab=tools&toolError=${error}#tools`)
}

function redirectPowerToolSuccess(success: string): never {
  redirect(`/admin?tab=tools&toolSuccess=${success}#tools`)
}
