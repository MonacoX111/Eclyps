import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { PublicBracket } from "@/components/public-bracket"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"

export const dynamic = "force-dynamic"

export default async function BracketPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<BracketLoading />}>
          <ActiveTournamentBracket />
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

async function ActiveTournamentBracket() {
  const homepageData = await getHomepageData()

  return <PublicBracket bracket={homepageData.publicBracket} />
}

function BracketLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="grid gap-4 md:grid-flow-col md:auto-cols-fr">
          {[1, 2, 3].map((item) => (
            <div key={item} className="space-y-3">
              <div className="mx-auto h-5 w-32 animate-pulse rounded bg-white/[0.04]" />
              <div className="glass-card h-36 animate-pulse rounded-xl" />
              <div className="glass-card h-36 animate-pulse rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
