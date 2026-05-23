import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import { runAdminRowsQuery } from "@/lib/admin/query"
import {
  readNullableInteger,
  readNullableString,
  readStringId,
} from "@/lib/data/normalize"

export type AdminTeam = {
  id: string
  tournament_id: string | null
  name: string | null
  seed: number | null
  wins: number | null
  losses: number | null
  slug?: string | null
  logo_url?: string | null
  status?: "pending" | "approved" | "rejected"
  owner_player_id?: string | null
  owner_display_name?: string | null
  members_count?: number
  created_at?: string | null
}

export type AdminTeamQueryResult = {
  teams: AdminTeam[]
  error: string | null
}

export async function getAdminTeams(): Promise<AdminTeamQueryResult> {
  noStore()

  if (!supabase) {
    return {
      teams: [],
      error: "Supabase is not configured.",
    }
  }

  const { rows, error } = await runAdminRowsQuery("teams", () =>
    supabase
      .from("teams")
      .select(`
        id,
        tournament_id,
        name,
        seed,
        wins,
        losses,
        slug,
        logo_url,
        status,
        owner_player_id,
        created_at,
        owner:players(display_name, nickname),
        team_members(id)
      `)
      .order("created_at", { ascending: false, nullsFirst: false }),
    normalizeTeam,
  )

  return { teams: rows, error }
}

function normalizeTeam(row: Record<string, unknown>): AdminTeam | null {
  const id = readStringId(row.id)
  if (!id) return null

  const ownerData = row.owner as { display_name?: string | null; nickname?: string | null } | null
  const owner_display_name = ownerData ? (ownerData.display_name ?? ownerData.nickname ?? null) : null

  const membersArray = row.team_members as Array<{ id: string }> | null
  const members_count = membersArray?.length ?? 0

  return {
    id,
    tournament_id: readStringId(row.tournament_id),
    name: readNullableString(row.name),
    seed: readNullableInteger(row.seed),
    wins: readNullableInteger(row.wins),
    losses: readNullableInteger(row.losses),
    slug: readNullableString(row.slug),
    logo_url: readNullableString(row.logo_url),
    status: (readNullableString(row.status) as any) ?? "approved",
    owner_player_id: readStringId(row.owner_player_id),
    owner_display_name,
    members_count,
    created_at: readNullableString(row.created_at),
  }
}

