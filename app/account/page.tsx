import { Suspense, type ReactNode } from "react"
import { redirect } from "next/navigation"
import { AccountDashboardClient } from "@/components/account-dashboard-client"
import { getCurrentUserProfile, type UserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getUserNotifications } from "@/lib/notifications/actions"
import { getHomepageData } from "@/lib/data/homepage"
import { getLanguage, getTranslations } from "@/lib/i18n/server"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"

export const dynamic = "force-dynamic"

type AccountPageProps = {
  searchParams?: Promise<{
    teamError?: string
    teamSuccess?: string
    joinRequestError?: string
    joinRequestSuccess?: string
    discordRefresh?: string
  }>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const resolvedParams = await searchParams
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    redirect("/#registration")
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <ParticleField />
      <MotionProvider>
        <div className="relative z-10 flex-1 pt-20 pb-12">
          <Suspense fallback={null}>
            <ActiveNavbar userProfile={userProfile} />
          </Suspense>

          <AccountDashboard userProfile={userProfile} searchParams={resolvedParams} />
        </div>
      </MotionProvider>
      <Footer />
    </main>
  )
}

async function ActiveNavbar({ userProfile }: { userProfile: UserProfile | null }) {
  const homepageData = await getHomepageData()

  return (
    <Navbar
      participantLabel={homepageData.participantLabel}
      userProfile={userProfile}
    />
  )
}

type TeamInfo = {
  id: string
  name: string
  status: string
  role: "Owner" | "Captain" | "Member" | "Sub"
  logo_url: string | null
  created_at: string | null
  roster_count: number
  is_locked?: boolean
}

type TeamRow = {
  id: string
  name: string
  status: string | null
  owner_player_id: string | null
  logo_url: string | null
  created_at: string | null
}

async function AccountDashboard({
  userProfile,
  searchParams,
}: {
  userProfile: UserProfile
  searchParams?: {
    teamError?: string
    teamSuccess?: string
    joinRequestError?: string
    joinRequestSuccess?: string
    discordRefresh?: string
  }
}) {
  const userProfileId = userProfile.id
  const [t, lang] = await Promise.all([getTranslations(), getLanguage()])
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return (
      <div className="mx-auto max-w-lg mt-20 p-6 glass-card rounded-2xl text-center">
        <h2 className="text-xl font-bold text-white">{t.account.serviceUnavailable}</h2>
        <p className="text-sm text-white/60 mt-2">{t.account.dbOffline}</p>
      </div>
    )
  }

  // 1. Fetch all player profiles linked to this Discord/user profile.
  const { data: playerRows, error: playerError } = await supabaseAdmin
    .from("players")
    .select("id, user_id, owner_user_id, name, nickname, real_name, display_name, region, seed, rating, wins, losses, status, avatar_url")
    .or(`owner_user_id.eq.${userProfileId},user_id.eq.${userProfile.auth_user_id}`)

  const linkedPlayers = playerRows ?? []
  const player =
    linkedPlayers.find((row) => row.owner_user_id === userProfileId) ??
    linkedPlayers.find((row) => row.user_id === userProfile.auth_user_id) ??
    linkedPlayers[0]
  const currentPlayerIds = Array.from(new Set(linkedPlayers.map((row) => row.id).filter(Boolean)))

  if (playerError || !player || currentPlayerIds.length === 0) {
    if (playerError) {
      console.error(`Error fetching players: [${playerError.code || "No code"}] ${playerError.message || "No message"}. Details: ${playerError.details || "No details"}. Hint: ${playerError.hint || "No hint"}`)
    }
    return (
      <div className="mx-auto max-w-lg mt-20 p-6 glass-card rounded-2xl text-center border border-white/5 shadow-2xl">
        <h2 className="text-xl font-bold text-white">{t.account.profileMissing}</h2>
        <p className="text-sm text-white/60 mt-2">
          {t.account.profileMissingDesc}
        </p>
      </div>
    )
  }

  // 2. Fetch User's Teams, registrations, notifications, and team invites concurrently.
  const [
    ownedTeamsRes,
    membershipsRes,
    registrationsRes,
    notificationsRes,
    invitesRes,
    joinRequestsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("teams")
      .select("id, name, status, owner_player_id, logo_url")
      .in("owner_player_id", currentPlayerIds),
    supabaseAdmin
      .from("team_members")
      .select("team_id, player_id, role")
      .in("player_id", currentPlayerIds),
    supabaseAdmin
      .from("tournament_registrations")
      .select(`
        id,
        tournament_id,
        registration_type,
        status,
        check_in_status,
        created_at,
        participant_id,
        tournaments:tournaments(name)
      `)
      .eq("user_profile_id", userProfileId)
      .order("created_at", { ascending: false }),
    getUserNotifications(),
    supabaseAdmin
      .from("team_invites")
      .select(`
        id,
        team_id,
        inviter_player_id,
        status,
        created_at,
        teams:teams(name),
        players!team_invites_inviter_player_id_fkey(display_name, nickname, name)
      `)
      .eq("invited_user_profile_id", userProfileId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("team_join_requests")
      .select(`
        id,
        team_id,
        status,
        created_at,
        teams:teams(name, logo_url)
      `)
      .eq("requester_user_profile_id", userProfileId)
      .order("created_at", { ascending: false }),
  ])

  const ownedTeams = ownedTeamsRes.data ?? []
  if (ownedTeamsRes.error) {
    console.error(`Error fetching owned teams: [${ownedTeamsRes.error.code || "No code"}] ${ownedTeamsRes.error.message || "No message"}`)
  }

  const memberships = membershipsRes.data ?? []
  if (membershipsRes.error) {
    console.error(`Error fetching memberships: [${membershipsRes.error.code || "No code"}] ${membershipsRes.error.message || "No message"}`)
  }

  const registrations = registrationsRes.data ?? []
  if (registrationsRes.error) {
    console.error(`Error fetching registrations: [${registrationsRes.error.code || "No code"}] ${registrationsRes.error.message || "No message"}`)
  }

  const notifications = notificationsRes ?? []

  const rawInvites = invitesRes.data ?? []
  if (invitesRes.error) {
    console.error(`Error fetching team invites: [${invitesRes.error.code || "No code"}] ${invitesRes.error.message || "No message"}`)
  }

  const invitesList = rawInvites.map((inv: any) => {
    const tObj = inv.teams as { name?: string } | null
    const pObj = inv.players as { display_name?: string; nickname?: string; name?: string } | null
    return {
      id: inv.id,
      team_id: inv.team_id,
      team_name: tObj?.name || "Unknown Team",
      inviter_name: pObj?.display_name?.trim() || pObj?.nickname?.trim() || pObj?.name?.trim() || "Captain",
      created_at: inv.created_at,
    }
  })

  const rawJoinRequests = joinRequestsRes.data ?? []
  if (joinRequestsRes.error) {
    console.error(`Error fetching team join requests: [${joinRequestsRes.error.code || "No code"}] ${joinRequestsRes.error.message || "No message"}`)
  }

  const joinRequestsList = rawJoinRequests.map((request: any) => {
    const teamObj = request.teams as { name?: string; logo_url?: string | null } | null
    return {
      id: request.id,
      team_id: request.team_id,
      team_name: teamObj?.name || "Unknown Team",
      team_logo_url: teamObj?.logo_url || null,
      status: request.status,
      created_at: request.created_at,
    }
  })

  const membershipTeamIds = Array.from(new Set(memberships.map((m) => m.team_id).filter(Boolean)))

  let membershipTeams: any[] = []
  if (membershipTeamIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("teams")
      .select("id, name, status, owner_player_id, logo_url")
      .in("id", membershipTeamIds)
    
    if (error) {
      console.error(`Error fetching membership teams details: [${error.code || "No code"}] ${error.message || "No message"}`)
    } else {
      membershipTeams = data ?? []
    }
  }

  const teamMap = new Map<string, TeamInfo>()

  for (const team of ownedTeams) {
    setTeamInfo(teamMap, team as TeamRow, "Owner")
  }

  const teamById = new Map<string, any>(membershipTeams.map((t) => [t.id, t]))
  for (const m of memberships) {
    const teamObj = teamById.get(m.team_id)
    if (teamObj) {
      const membershipRole = normalizeTeamRole(m.role)
      const isOwner = currentPlayerIds.includes(teamObj.owner_player_id)
      const role = pickHigherTeamRole(
        teamMap.get(teamObj.id)?.role,
        isOwner ? "Owner" : membershipRole,
      )

      setTeamInfo(teamMap, teamObj as TeamRow, role)
    }
  }

  const teamsList = Array.from(teamMap.values())
  const teamIds = teamsList.map((team) => team.id)

  if (teamIds.length > 0) {
    const [teamMemberRowsRes, regsRes] = await Promise.all([
      supabaseAdmin
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds),
      supabaseAdmin
        .from("tournament_registrations")
        .select("tournament_id, team_id, source_team_id")
        .or(`team_id.in.(${teamIds.join(",")}),source_team_id.in.(${teamIds.join(",")})`)
        .in("status", ["pending", "approved"])
    ])

    const teamMemberRows = teamMemberRowsRes.data
    const regs = regsRes.data

    const rosterCounts = new Map<string, number>()
    for (const member of teamMemberRows ?? []) {
      rosterCounts.set(member.team_id, (rosterCounts.get(member.team_id) ?? 0) + 1)
    }

    const lockedTeamIds = new Set<string>()
    if (regs && regs.length > 0) {
      const tournamentIds = Array.from(new Set(regs.map((r: any) => r.tournament_id)))
      const { data: activeTournaments } = await supabaseAdmin
        .from("tournaments")
        .select("id")
        .in("id", tournamentIds)
        .in("status", ["upcoming", "live"])

      if (activeTournaments && activeTournaments.length > 0) {
        const activeTournamentIds = new Set(activeTournaments.map((t: any) => t.id))
        for (const reg of regs) {
          if (activeTournamentIds.has(reg.tournament_id)) {
            if (reg.team_id) lockedTeamIds.add(reg.team_id)
            if (reg.source_team_id) lockedTeamIds.add(reg.source_team_id)
          }
        }
      }
    }

    for (const team of teamsList) {
      team.roster_count = rosterCounts.get(team.id) ?? 0
      team.is_locked = lockedTeamIds.has(team.id)
    }
  }


  return (
    <AccountDashboardClient
      userProfile={userProfile}
      player={player}
      teamsList={teamsList}
      registrations={registrations}
      notifications={notifications}
      searchParams={searchParams}
      invitesList={invitesList}
      joinRequestsList={joinRequestsList}
    />
  )
}


function normalizeTeamRole(role: unknown): TeamInfo["role"] {
  if (role === "captain") return "Captain"
  if (role === "sub" || role === "substitute") return "Sub"
  return "Member"
}

function setTeamInfo(
  teamMap: Map<string, TeamInfo>,
  team: TeamRow,
  role: TeamInfo["role"],
) {
  teamMap.set(team.id, {
    id: team.id,
    name: team.name,
    status: team.status || "approved",
    role: pickHigherTeamRole(teamMap.get(team.id)?.role, role),
    logo_url: team.logo_url ?? null,
    created_at: team.created_at ?? null,
    roster_count: teamMap.get(team.id)?.roster_count ?? 0,
  })
}

function pickHigherTeamRole(
  current: TeamInfo["role"] | undefined,
  next: TeamInfo["role"],
): TeamInfo["role"] {
  const priority: Record<TeamInfo["role"], number> = {
    Owner: 4,
    Captain: 3,
    Member: 2,
    Sub: 1,
  }

  if (!current) return next
  return priority[next] > priority[current] ? next : current
}

function formatSupabaseError(error: any) {
  if (!error) return "No error object";
  try {
    return {
      message: error.message || "No message",
      details: error.details || "No details",
      hint: error.hint || "No hint",
      code: error.code || "No code",
      raw: JSON.stringify(error) || String(error)
    };
  } catch (e) {
    return {
      message: error.message || "No message",
      details: error.details || "No details",
      hint: error.hint || "No hint",
      code: error.code || "No code",
      raw: String(error)
    };
  }
}

function AccountDashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="h-10 w-64 bg-white/5 rounded" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-card h-96 bg-white/5 rounded-2xl border border-white/5" />
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card h-48 bg-white/5 rounded-2xl border border-white/5" />
          <div className="glass-card h-48 bg-white/5 rounded-2xl border border-white/5" />
        </div>
      </div>
    </div>
  )
}
