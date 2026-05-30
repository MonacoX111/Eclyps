import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicPlayerProfile } from "@/lib/data/profiles"
import { getLanguage } from "@/lib/i18n/server"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { PlayerDashboard, type TeamItem, type RegistrationItem } from "@/components/player-dashboard"

export const dynamic = "force-dynamic"

type PlayerProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function PlayerProfilePage({
  params,
}: PlayerProfilePageProps) {
  const { id } = await params
  const [data, userProfile] = await Promise.all([
    getPublicPlayerProfile(id),
    getCurrentUserProfile(),
  ])

  if (!data) {
    const lang = await getLanguage()
    const message = lang === "uk" ? "Цей профіль гравця недоступний." : "This player profile is not available."
    return <PublicProfileError message={message} kind="player" userProfile={userProfile} />
  }

  const isOwner = userProfile && userProfile.auth_user_id === data.profile.user_id
  const playerStatus = data.profile.status ?? "approved"

  // Enforce Visibility Rules:
  // Pending/rejected player profiles are only visible to the player themselves (isOwner)
  if (playerStatus !== "approved" && !isOwner) {
    const lang = await getLanguage()
    const message = lang === "uk" ? "Цей профіль гравця недоступний." : "This player profile is not available."
    return <PublicProfileError message={message} kind="player" userProfile={userProfile} />
  }

  let teams: TeamItem[] = []
  let registrations: RegistrationItem[] = []

  if (isOwner) {
    const supabaseAdmin = createSupabaseAdminClient()
    if (supabaseAdmin) {
      // 1. Fetch team memberships
      const { data: teamMemberships } = await supabaseAdmin
        .from("team_members")
        .select(`
          role,
          team:teams(id, name, status)
        `)
        .eq("player_id", data.profile.id)

      // 2. Fetch owned teams just in case
      const { data: ownedTeams } = await supabaseAdmin
        .from("teams")
        .select("id, name, status")
        .eq("owner_player_id", data.profile.id)

      // Combine teams
      const teamMap = new Map<string, TeamItem>()
      
      // Add memberships
      if (teamMemberships) {
        for (const m of teamMemberships) {
          const t = m.team as any
          if (t && t.id) {
            teamMap.set(t.id, {
              id: t.id,
              name: t.name,
              status: t.status || "approved",
              role: m.role as any,
            })
          }
        }
      }

      // Add owned teams
      if (ownedTeams) {
        for (const t of ownedTeams) {
          if (!teamMap.has(t.id)) {
            teamMap.set(t.id, {
              id: t.id,
              name: t.name,
              status: t.status || "approved",
              role: "owner",
            })
          } else {
            // Update role if already in map but we know they own it
            const existing = teamMap.get(t.id)!
            teamMap.set(t.id, {
              ...existing,
              role: "owner",
            })
          }
        }
      }

      teams = Array.from(teamMap.values())

      // 3. Fetch registrations
      const teamIds = teams.map(t => t.id)
      let query = supabaseAdmin
        .from("tournament_registrations")
        .select(`
          id,
          status,
          created_at,
          registration_type,
          player_id,
          team_id,
          participant_id,
          tournament:tournaments(name),
          player:players(display_name, nickname, name),
          team:teams(name)
        `)

      if (teamIds.length > 0) {
        query = query.or(`player_id.eq.${data.profile.id},team_id.in.(${teamIds.join(",")})`)
      } else {
        query = query.eq("player_id", data.profile.id)
      }

      const { data: regList } = await query
      if (regList) {
        registrations = regList.map((r: any) => {
          const tName = r.tournament?.name ?? "Tournament"
          const type = r.registration_type ?? (r.team_id ? "team" : "player")
          const linkedName =
            type === "team"
              ? r.team?.name ?? "Team"
              : r.player?.display_name ?? r.player?.nickname ?? r.player?.name ?? "Player"

          return {
            id: r.id,
            tournamentName: tName,
            registrationType: type,
            linkedName,
            status: r.status,
            hasParticipant: Boolean(r.participant_id),
            createdAt: r.created_at,
          }
        })
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PublicProfilePage data={data} userProfile={userProfile} />
      
      {isOwner && (
        <PlayerDashboard
          teams={teams}
          registrations={registrations}
        />
      )}
    </div>
  )
}
