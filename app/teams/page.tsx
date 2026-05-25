import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { TeamsGrid } from "@/components/teams-grid"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData, getTeamCards } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { CreateTeamModal } from "@/components/create-team-modal"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

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
  if (userProfile) {
    const supabaseAdmin = createSupabaseAdminClient()
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("players")
        .select("id, status")
        .eq("user_id", userProfile.auth_user_id)
        .limit(1)
        .maybeSingle()

      if (data && data.status === "approved") {
        hasApprovedPlayer = true
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
  const homepageData = await getHomepageData()
  const teamCards = getTeamCards(homepageData.teams, homepageData.participants)

  return (
    <TeamsGrid
      teams={teamCards}
      participantLabel="Teams"
    />
  )
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
