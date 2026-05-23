import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Results } from "@/components/results"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"

export const dynamic = "force-dynamic"

export default async function ResultsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<ResultsLoading />}>
          <ActiveTournamentResults />
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

async function ActiveTournamentResults() {
  const homepageData = await getHomepageData()

  return <Results results={homepageData.resultCards} />
}

function ResultsLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="glass-card h-56 animate-pulse rounded-2xl" />
      </div>
    </section>
  )
}
