import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicTeamProfile } from "@/lib/data/profiles"
import { getLanguage, getTranslations } from "@/lib/i18n/server"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { canManageTeam } from "@/lib/auth/permissions"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { TeamRosterManager } from "@/components/team-roster-manager"
import {
  TeamJoinRequestCard,
  type CurrentJoinRequest,
  type PendingJoinRequest,
} from "@/components/team-join-requests"

export const dynamic = "force-dynamic"

type TeamProfilePageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    rosterError?: string
    rosterSuccess?: string
    joinRequestError?: string
    joinRequestSuccess?: string
  }>
}

export default async function TeamProfilePage({ params, searchParams }: TeamProfilePageProps) {
  const { id } = await params
  const resolvedParams = await searchParams
  const [data, userProfile, t] = await Promise.all([
    getPublicTeamProfile(id),
    getCurrentUserProfile(),
    getTranslations(),
  ])

  if (!data) {
    return <PublicProfileError message={t.profile.teamUnavailable} userProfile={userProfile} />
  }

  let isManager = false
  const ownerPlayerId = data.profile.owner_player_id ?? null
  const teamStatus = data.profile.status ?? "approved"
  const members = data.teamMembers ?? []
  const managementMembers = members.map((member) => ({
    ...member,
    role: member.role === "owner" ? "captain" as const : member.role,
  }))

  let pendingInvites: any[] = []
  let inviteCandidates: any[] = []
  let currentPlayerId: string | null = null
  let currentPlayerStatus: string | null = null
  let currentJoinRequest: CurrentJoinRequest = null
  let isCurrentPlayerMember = false
  let pendingJoinRequests: PendingJoinRequest[] = []

  let isRosterLocked = false

  if (userProfile) {
    const supabaseAdmin = createSupabaseAdminClient()
    if (supabaseAdmin) {
      // Check if roster is locked due to active tournament registrations
      const { data: regs } = await supabaseAdmin
        .from("tournament_registrations")
        .select("tournament_id")
        .or(`team_id.eq.${id},source_team_id.eq.${id}`)
        .in("status", ["pending", "approved"])

      if (regs && regs.length > 0) {
        const tournamentIds = regs.map((r: any) => r.tournament_id)
        const { data: activeTournaments } = await supabaseAdmin
          .from("tournaments")
          .select("id")
          .in("id", tournamentIds)
          .in("status", ["upcoming", "live"])

        if (activeTournaments && activeTournaments.length > 0) {
          isRosterLocked = true
        }
      }

      const { data: player } = await supabaseAdmin
        .from("players")
        .select("id, status")
        .or(`user_id.eq.${userProfile.auth_user_id},owner_user_id.eq.${userProfile.id}`)
        .limit(1)
        .maybeSingle()

      if (player) {
        currentPlayerId = player.id
        currentPlayerStatus = player.status ?? null
        isManager = await canManageTeam(id, player.id)

        isCurrentPlayerMember =
          ownerPlayerId === player.id ||
          members.some((member) => member.player_id === player.id)

        if (!isCurrentPlayerMember) {
          const { data: request } = await supabaseAdmin
            .from("team_join_requests")
            .select("id, status, created_at")
            .eq("team_id", id)
            .eq("requester_player_id", player.id)
            .in("status", ["pending", "approved", "rejected", "cancelled"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (request) {
            currentJoinRequest = {
              id: request.id,
              status: request.status,
              created_at: request.created_at,
            }
          }
        }
      }


      // Fetch pending invites and candidate players if user is manager
      if (isManager && player) {
        const [invitesRes, memberRowsRes, pendingInvitesRes, approvedPlayersRes, joinRequestsRes] = await Promise.all([
          supabaseAdmin
            .from("team_invites")
            .select(`
              id,
              status,
              created_at,
              invited_player_id,
              players!team_invites_invited_player_id_fkey(display_name, nickname, name)
            `)
            .eq("team_id", id)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabaseAdmin
            .from("team_members")
            .select("player_id")
            .eq("team_id", id),
          supabaseAdmin
            .from("team_invites")
            .select("invited_player_id")
            .eq("team_id", id)
            .eq("status", "pending"),
          supabaseAdmin
            .from("players")
            .select(`
              id,
              display_name,
              nickname,
              real_name,
              region,
              avatar_url,
              owner_user_id,
              user_profiles!players_owner_user_id_fkey(discord_username)
            `)
            .eq("status", "approved"),
          supabaseAdmin
            .from("team_join_requests")
            .select(`
              id,
              requester_player_id,
              message,
              created_at,
              players!team_join_requests_requester_player_id_fkey(
                display_name,
                nickname,
                name,
                avatar_url,
                region,
                owner_user_id,
                user_profiles!players_owner_user_id_fkey(discord_username)
              )
            `)
            .eq("team_id", id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
        ])

        const invites = invitesRes.data
        if (invites) {
          pendingInvites = invites.map((inv: any) => {
            const p = inv.players as any
            return {
              id: inv.id,
              status: inv.status,
              created_at: inv.created_at,
              invited_player_id: inv.invited_player_id,
              display_name: p?.display_name?.trim() || p?.nickname?.trim() || p?.name?.trim() || "Unknown player"
            }
          })
        }

        const memberPlayerIds = (memberRowsRes.data ?? []).map((m: any) => m.player_id)
        const pendingInvitedPlayerIds = (pendingInvitesRes.data ?? []).map((i: any) => i.invited_player_id)

        // Exclude: self (manager), team members, pending invitees
        const excludedSet = new Set([player.id, ...memberPlayerIds, ...pendingInvitedPlayerIds])

        if (approvedPlayersRes.data) {
          inviteCandidates = approvedPlayersRes.data
            .filter((p: any) => !excludedSet.has(p.id))
            .map((p: any) => {
              const profile = p.user_profiles as { discord_username?: string } | null
              return {
                id: p.id,
                display_name: p.display_name?.trim() || p.nickname?.trim() || p.name?.trim() || "Unknown player",
                nickname: p.nickname || null,
                real_name: p.real_name || null,
                region: p.region || null,
                avatar_url: p.avatar_url || null,
                discord_username: profile?.discord_username || null
              }
            })
        }

        if (joinRequestsRes.data) {
          pendingJoinRequests = joinRequestsRes.data.map((request: any) => {
            const p = request.players as any
            const profile = p?.user_profiles as { discord_username?: string } | null
            return {
              id: request.id,
              requester_player_id: request.requester_player_id,
              display_name: p?.display_name?.trim() || p?.nickname?.trim() || p?.name?.trim() || "Unknown player",
              avatar_url: p?.avatar_url || null,
              discord_username: profile?.discord_username || null,
              region: p?.region || null,
              message: request.message || null,
              created_at: request.created_at || null,
            }
          })
        }
      }
    }
  }

  // Enforce Visibility Rules:
  // Pending/rejected teams are only visible to the owner/captains (isManager)
  if (teamStatus !== "approved" && !isManager) {
    return <PublicProfileError message={t.profile.teamUnavailable} userProfile={userProfile} />
  }
  const joinRequestCard = !isManager ? (
    <TeamJoinRequestCard
      teamId={id}
      isLoggedIn={Boolean(userProfile)}
      currentPlayerStatus={currentPlayerStatus}
      isAlreadyMember={isCurrentPlayerMember}
      teamStatus={teamStatus}
      currentRequest={currentJoinRequest}
      initialError={resolvedParams?.joinRequestError}
      initialSuccess={resolvedParams?.joinRequestSuccess}
    />
  ) : null

  const rosterManagement = isManager ? (
    <div className="mt-6">
      <div className="mb-4 inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
        {t.account.roster.managerBadge}
      </div>
      <TeamRosterManager
        teamId={id}
        isManager={isManager}
        members={managementMembers}
        ownerPlayerId={ownerPlayerId}
        currentPlayerId={currentPlayerId}
        initialError={resolvedParams?.rosterError ?? resolvedParams?.joinRequestError}
        initialSuccess={resolvedParams?.rosterSuccess ?? resolvedParams?.joinRequestSuccess}
        pendingInvites={pendingInvites}
        inviteCandidates={inviteCandidates}
        isRosterLocked={isRosterLocked}
        pendingJoinRequests={pendingJoinRequests}
      />
    </div>
  ) : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PublicProfilePage data={data} userProfile={userProfile}>
        {joinRequestCard}
        {rosterManagement}
      </PublicProfilePage>
    </div>
  )
}
