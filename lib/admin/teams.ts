import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getSafeAdminFetchError } from "@/lib/admin/errors"

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
}

export type AdminTeamQueryResult = {
  teams: AdminTeam[]
  error: string | null
}

export async function getAdminTeams(): Promise<AdminTeamQueryResult> {
  noStore()
  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    return {
      teams: [],
      error: "Server-only Supabase admin client is not configured.",
    }
  }

  try {
    // 1. Query teams cleanly (flat query)
    const { data: rawTeams, error: teamsError } = await supabaseAdmin
      .from("teams")
      .select("id, tournament_id, name, seed, wins, losses, slug, logo_url, status, owner_player_id")
      .order("name", { ascending: true })

    if (teamsError) {
      return {
        teams: [],
        error: getSafeAdminFetchError("teams", teamsError),
      }
    }

    if (!rawTeams || rawTeams.length === 0) {
      return { teams: [], error: null }
    }

    // 2. Fetch owner display names in a bulk query
    const ownerPlayerIds = rawTeams
      .map((t) => t.owner_player_id)
      .filter((id): id is string => typeof id === "string")

    const playersMap = new Map<string, { display_name: string; nickname: string | null }>()

    if (ownerPlayerIds.length > 0) {
      const { data: playersData, error: playersError } = await supabaseAdmin
        .from("players")
        .select("id, display_name, nickname, name")
        .in("id", ownerPlayerIds)

      if (playersError) {
        console.error("Failed to fetch admin team owners:", playersError)
      } else if (playersData) {
        for (const p of playersData) {
          playersMap.set(p.id, {
            display_name: p.display_name || p.nickname || p.name || "Unknown player",
            nickname: p.nickname || null,
          })
        }
      }
    }

    // 3. Fetch team member counts in a bulk query
    const teamIds = rawTeams.map((t) => t.id)
    const memberCountsMap = new Map<string, number>()

    if (teamIds.length > 0) {
      const { data: membersData, error: membersError } = await supabaseAdmin
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds)

      if (membersError) {
        console.error("Failed to fetch admin team member counts:", membersError)
      } else if (membersData) {
        for (const m of membersData) {
          const count = memberCountsMap.get(m.team_id) ?? 0
          memberCountsMap.set(m.team_id, count + 1)
        }
      }
    }

    // 4. Combine and build team listings in-memory
    const teamsList: AdminTeam[] = rawTeams.map((row) => {
      const id = row.id
      const ownerPlayerId = row.owner_player_id ? String(row.owner_player_id) : null
      
      let owner_display_name: string | null = null
      if (ownerPlayerId) {
        const owner = playersMap.get(ownerPlayerId)
        if (owner) {
          owner_display_name = owner.display_name
        }
      }

      const members_count = memberCountsMap.get(id) ?? 0

      return {
        id,
        tournament_id: row.tournament_id ? String(row.tournament_id) : null,
        name: row.name ? String(row.name) : null,
        seed: row.seed !== null ? Number(row.seed) : null,
        wins: row.wins !== null ? Number(row.wins) : null,
        losses: row.losses !== null ? Number(row.losses) : null,
        slug: row.slug ? String(row.slug) : null,
        logo_url: row.logo_url ? String(row.logo_url) : null,
        status: (row.status ? String(row.status) : "approved") as any,
        owner_player_id: ownerPlayerId,
        owner_display_name,
        members_count,
      }
    })

    return { teams: teamsList, error: null }
  } catch (error) {
    return {
      teams: [],
      error: getSafeAdminFetchError("teams", error),
    }
  }
}

