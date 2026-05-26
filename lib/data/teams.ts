import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import {
  readNullableInteger,
  readNullableString,
  readNonNegativeInteger,
  readStringId,
} from "@/lib/data/normalize"
import { normalizeRows } from "@/lib/data/query"

export type TournamentTeam = {
  id: string
  tournament_id: string
  name: string
  seed: number | null
  wins: number
  losses: number
}

export async function getTeamsForTournament(
  tournamentId: string,
): Promise<TournamentTeam[]> {
  noStore()

  if (!supabase) {
    console.warn("Skipping teams query because Supabase is not configured.")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("teams")
      .select("id, tournament_id, name, seed, wins, losses")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Failed to fetch teams for tournament:", error)
      return []
    }

    return normalizeRows(data, normalizeTeam)
  } catch (error) {
    console.error("Unexpected error while fetching teams for tournament:", error)
    return []
  }
}

function normalizeTeam(row: Record<string, unknown>): TournamentTeam | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)

  if (!id || !tournamentId || !name) {
    console.error("Skipping malformed team row:", row)
    return null
  }

  return {
    id,
    tournament_id: tournamentId,
    name,
    seed: readNullableInteger(row.seed),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
  }
}

export type ApprovedTeamCard = {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  wins: number
  losses: number
  seed: number | null
  captain_name: string | null
  member_count: number
}

export async function getApprovedTeams(): Promise<ApprovedTeamCard[]> {
  noStore()

  if (!supabase) {
    console.warn("Skipping approved teams query because Supabase is not configured.")
    return []
  }

  try {
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, slug, logo_url, wins, losses, seed, status")
      .eq("status", "approved")
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })

    if (teamsError) {
      console.error("Failed to fetch approved teams:", teamsError)
      return []
    }

    if (!teamsData || teamsData.length === 0) {
      return []
    }

    const teamIds = teamsData.map((t) => t.id)

    const { data: membersData, error: membersError } = await supabase
      .from("team_members")
      .select(`
        team_id,
        role,
        players!team_members_player_id_fkey(display_name, nickname, name)
      `)
      .in("team_id", teamIds)

    if (membersError) {
      console.error("Failed to fetch team members for approved teams:", membersError)
      return teamsData.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug ?? null,
        logo_url: t.logo_url ?? null,
        wins: readNonNegativeInteger(t.wins),
        losses: readNonNegativeInteger(t.losses),
        seed: readNullableInteger(t.seed),
        captain_name: null,
        member_count: 0,
      }))
    }

    const membersByTeam = new Map<string, any[]>()
    if (membersData) {
      membersData.forEach((m) => {
        if (!membersByTeam.has(m.team_id)) {
          membersByTeam.set(m.team_id, [])
        }
        membersByTeam.get(m.team_id)!.push(m)
      })
    }

    return teamsData.map((t) => {
      const members = membersByTeam.get(t.id) || []
      const captain = members.find((m) => m.role === "captain")
      
      let captainName: string | null = null
      if (captain && captain.players) {
        const p = captain.players as any
        captainName = p.display_name?.trim() || p.nickname?.trim() || p.name?.trim() || "Untitled player"
      }

      return {
        id: t.id,
        name: t.name,
        slug: t.slug ?? null,
        logo_url: t.logo_url ?? null,
        wins: readNonNegativeInteger(t.wins),
        losses: readNonNegativeInteger(t.losses),
        seed: readNullableInteger(t.seed),
        captain_name: captainName,
        member_count: members.length,
      }
    })
  } catch (error) {
    console.error("Unexpected error while fetching approved teams:", error)
    return []
  }
}
