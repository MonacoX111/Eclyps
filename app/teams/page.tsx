import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { TeamsGrid } from "@/components/teams-grid"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData } from "@/lib/data/homepage"
import { getApprovedTeams } from "@/lib/data/teams"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { CreateTeamModal } from "@/components/create-team-modal"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getLanguage } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<{
    teamError?: string
    teamSuccess?: string
  }>
}

export default async function TeamsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const userProfile = await getCurrentUserProfile()
  const isLoggedIn = Boolean(userProfile)

  let hasApprovedPlayer = false
  let alreadyManagesTeam = false
  if (userProfile) {
    const supabaseAdmin = createSupabaseAdminClient()
    if (supabaseAdmin) {
      const { data: playerRows } = await supabaseAdmin
        .from("players")
        .select("id, status")
        .or(`user_id.eq.${userProfile.auth_user_id},owner_user_id.eq.${userProfile.id}`)

      const linkedPlayers = playerRows ?? []
      const linkedPlayerIds = Array.from(new Set(linkedPlayers.map((player) => player.id).filter(Boolean)))

      if (linkedPlayers.some((player) => player.status === "approved")) {
        hasApprovedPlayer = true
      }

      if (linkedPlayerIds.length > 0) {
        const { data: ownedTeams } = await supabaseAdmin
          .from("teams")
          .select("id, status")
          .in("owner_player_id", linkedPlayerIds)

        const { data: captainMemberships } = await supabaseAdmin
          .from("team_members")
          .select("team_id, teams:teams(id, status)")
          .in("player_id", linkedPlayerIds)
          .eq("role", "captain")

        alreadyManagesTeam =
          (ownedTeams ?? []).some((team) => team.status !== "archived") ||
          (captainMemberships ?? []).some((membership) => {
            const team = membership.teams as { status?: string | null } | null
            return Boolean(team) && team?.status !== "archived"
          })
      }
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <div className="relative pt-16 flex justify-center">
          <CreateTeamModal
            isLoggedIn={isLoggedIn}
            hasApprovedPlayer={hasApprovedPlayer}
            alreadyManagesTeam={alreadyManagesTeam}
            initialError={resolvedParams?.teamError}
            initialSuccess={resolvedParams?.teamSuccess}
          />
        </div>

        <Suspense fallback={<TeamsLoading />}>
          <ActiveTeamsGrid />
        </Suspense>
      </MotionProvider>
      <Footer />
    </main>
  )
}

async function ActiveNavbar() {
  const [homepageData, userProfile] = await Promise.all([
    getHomepageData(),
    getCurrentUserProfile(),
  ])

  return (
    <Navbar
      participantLabel={homepageData.participantLabel}
      userProfile={userProfile}
    />
  )
}

async function ActiveTeamsGrid() {
  const approvedTeams = await getApprovedTeams()
  const lang = await getLanguage()

  const teamCards = approvedTeams.map((team, index) => {
    const displayName = team.name
    const seed = team.seed

    const capPart = team.captain_name 
      ? (lang === "uk" ? `Капітан: ${team.captain_name}` : `Captain: ${team.captain_name}`)
      : ""
    const memberLabel = lang === "uk" 
      ? `${team.member_count} учасн.` 
      : `${team.member_count} members`
    
    const subtitle = capPart ? `${capPart} • ${memberLabel}` : memberLabel

    return {
      id: team.id,
      name: displayName,
      subtitle,
      tag: createTeamTag(displayName),
      wins: team.wins,
      losses: team.losses,
      rank: seed ?? index + 1,
      profileHref: `/teams/${team.id}`,
      avatarUrl: team.logo_url ?? null,
      avatarAlt: displayName,
    }
  })

  const title = lang === "uk" ? "Команди" : "Teams"

  return (
    <TeamsGrid
      teams={teamCards}
      participantLabel="Teams"
      title={title}
    />
  )
}

function createTeamTag(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase()
}

function TeamsLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="flex flex-wrap justify-center gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="glass-card h-48 w-full animate-pulse rounded-xl sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
