import type { Metadata } from "next"
import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicPlayerProfile } from "@/lib/data/profiles"
import { getTranslations } from "@/lib/i18n/server"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { PlayerDashboard, type TeamItem, type RegistrationItem } from "@/components/player-dashboard"
import { FriendButton } from "@/components/friend-button"
import { resolveUserProfileIdByAuthUserId, getFriendshipStatus, getFriendOverview } from "@/lib/data/friends"
import { createPageMetadata } from "@/lib/seo"

export const dynamic = "force-dynamic"

type PlayerProfilePageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PlayerProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const [data, t] = await Promise.all([
    getPublicPlayerProfile(id),
    getTranslations(),
  ])

  if (!data || data.profile.status !== "approved") {
    return {
      title: `${t.profile.playerUnavailable} | Eclyps`,
      robots: { index: false, follow: false },
    }
  }

  const name = data.profile.display_name || data.profile.name
  const descriptionParts = [
    data.profile.region ? `Регіон: ${data.profile.region}` : null,
    data.tournamentName ? `Турнір: ${data.tournamentName}` : null,
    `Перемоги/поразки: ${data.profile.wins}/${data.profile.losses}`,
  ].filter(Boolean)

  return createPageMetadata({
    title: `${name} | Eclyps`,
    description: descriptionParts.join(". "),
    path: `/players/${id}`,
    image: data.profile.image_url,
    imageAlt: name,
  })
}

export default async function PlayerProfilePage({
  params,
}: PlayerProfilePageProps) {
  const { id } = await params
  const userProfile = await getCurrentUserProfile()
  const [data, t] = await Promise.all([
    getPublicPlayerProfile(id),
    getTranslations(),
  ])

  if (!data) {
    return <PublicProfileError message={t.profile.playerUnavailable} kind="player" userProfile={userProfile} />
  }

  const isOwner = userProfile && userProfile.auth_user_id === data.profile.user_id
  const playerStatus = data.profile.status ?? "approved"

  // Enforce Visibility Rules:
  // Pending/rejected player profiles are only visible to the player themselves (isOwner)
  if (playerStatus !== "approved" && !isOwner) {
    return <PublicProfileError message={t.profile.playerUnavailable} kind="player" userProfile={userProfile} />
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
          team:teams(id, name, status, logo_url)
        `)
        .eq("player_id", data.profile.id)

      // 2. Fetch owned teams just in case
      const { data: ownedTeams } = await supabaseAdmin
        .from("teams")
        .select("id, name, status, logo_url")
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
              logo_url: t.logo_url ?? null,
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
              logo_url: t.logo_url ?? null,
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

  // Friend button data (only for logged-in viewers looking at someone else's account-backed profile)
  let friendTargetId: string | null = null
  let friendStatus: import("@/lib/data/friends").FriendshipStatus = "none"
  let incomingFriendshipId: string | null = null
  if (userProfile && !isOwner && data.profile.user_id) {
    friendTargetId = await resolveUserProfileIdByAuthUserId(data.profile.user_id)
    if (friendTargetId && friendTargetId !== userProfile.id) {
      friendStatus = await getFriendshipStatus(userProfile.id, friendTargetId)
      if (friendStatus === "pending_incoming") {
        const overview = await getFriendOverview(userProfile.id)
        incomingFriendshipId =
          overview.incoming.find((r) => r.id === friendTargetId)?.friendshipId ?? null
      }
    } else {
      friendTargetId = null
    }
  }

  return (
    <PublicProfilePage data={data} userProfile={userProfile}>
      {!isOwner && friendTargetId ? (
        <div className="mb-6">
          <FriendButton
            targetUserProfileId={friendTargetId}
            initialStatus={friendStatus}
            incomingFriendshipId={incomingFriendshipId}
          />
        </div>
      ) : null}
      {isOwner ? (
        <PlayerDashboard
          teams={teams}
          registrations={registrations}
        />
      ) : null}
    </PublicProfilePage>
  )
}
