import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import {
  readNullableInteger,
  readNullableString,
  readNonNegativeInteger,
  readStringId,
} from "@/lib/data/normalize"
import { normalizeRows } from "@/lib/data/query"

export type TournamentPlayer = {
  id: string
  tournament_id: string
  name: string
  nickname: string | null
  real_name: string | null
  display_name: string
  seed: number | null
  wins: number
  losses: number
}

export async function getPlayersForTournament(
  tournamentId: string,
): Promise<TournamentPlayer[]> {
  noStore()

  if (!supabase) {
    console.warn("Skipping players query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("players")
      .select("id, tournament_id, name, nickname, seed, wins, losses")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Failed to fetch players for tournament:", error)
      return []
    }

    return normalizeRows(data, normalizePlayer)
  } catch (error) {
    console.error("Unexpected error while fetching players for tournament:", error)
    return []
  }
}

function normalizePlayer(row: Record<string, unknown>): TournamentPlayer | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)
  const nickname = readNullableString(row.nickname)

  if (!id || !tournamentId || !name) {
    console.error("Skipping malformed player row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    name,
    nickname,
    real_name: name,
    display_name: getPlayerDisplayName(name, nickname),
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}

function getPlayerDisplayName(realName: string | null, nickname: string | null) {
  return nickname?.trim() || realName?.trim() || "Untitled player"
}

export type ApprovedPlayerCard = {
  id: string
  name: string
  nickname: string | null
  display_name: string
  real_name: string | null
  seed: number | null
  wins: number
  losses: number
  owner_profile: {
    avatar_url: string | null
    discord_username: string | null
    display_name: string | null
  } | null
}

export async function getApprovedPlayers(): Promise<ApprovedPlayerCard[]> {
  noStore()

  if (!supabase) {
    console.warn("Skipping approved players query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("players")
      .select("id, name, nickname, display_name, real_name, seed, wins, losses, status, owner_profile:user_profiles!players_owner_user_id_fkey(avatar_url, discord_username, display_name)")
      .eq("status", "approved")
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })

    if (error) {
      console.error("Failed to fetch approved players:", error)
      return []
    }

    return normalizeRows(data, normalizeApprovedPlayer)
  } catch (error) {
    console.error("Unexpected error while fetching approved players:", error)
    return []
  }
}

function normalizeApprovedPlayer(row: Record<string, unknown>): ApprovedPlayerCard | null {
  const id = readStringId(row.id)
  const name = readNullableString(row.name)
  const nickname = readNullableString(row.nickname)

  if (!id || !name) {
    console.error("Skipping malformed approved player row:", row)
    return null
  }

  const realName = readNullableString(row.real_name) ?? name
  const rowDisplayName = readNullableString(row.display_name)
  const displayName = rowDisplayName?.trim() || getPlayerDisplayName(name, nickname)

  return {
    id,
    name,
    nickname,
    real_name: realName,
    display_name: displayName,
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
    owner_profile: normalizeApprovedPlayerOwnerProfile(row.owner_profile),
  }
}

function normalizeApprovedPlayerOwnerProfile(
  value: unknown,
): { avatar_url: string | null; discord_username: string | null; display_name: string | null } | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null

  const record = row as Record<string, unknown>
  const avatarUrl = readNullableString(record.avatar_url)
  const discordUsername = readNullableString(record.discord_username)
  const displayName = readNullableString(record.display_name)

  if (!avatarUrl && !discordUsername && !displayName) return null

  return {
    avatar_url: avatarUrl,
    discord_username: discordUsername,
    display_name: displayName,
  }
}
