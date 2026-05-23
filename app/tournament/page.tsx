import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { TournamentInfo } from "@/components/tournament-info"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"

export const dynamic = "force-dynamic"

export default async function TournamentPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<TournamentInfoLoading />}>
          <ActiveTournamentInfo />
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

async function ActiveTournamentInfo() {
  const homepageData = await getHomepageData()
  if (!homepageData.tournamentView) return <TournamentUnavailable />

  const {
    sectionName,
    prizePool,
    teamCount,
    matchDays,
    format,
    game,
    arenaTitle,
    arenaDescription,
    arenaTags,
    participantLabel,
  } = homepageData.tournamentView

  return (
    <TournamentInfo
      tournamentName={sectionName}
      prizePool={prizePool}
      teamCount={teamCount}
      matchDays={matchDays}
      format={format}
      game={game}
      arenaTitle={arenaTitle}
      arenaDescription={arenaDescription}
      arenaTags={arenaTags}
      participantLabel={participantLabel}
    />
  )
}

function TournamentUnavailable() {
  return (
    <section className="relative flex min-h-[60vh] items-center justify-center px-4 py-20 text-center">
      <div>
        <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
          Upcoming Event
        </p>
        <p className="text-sm text-muted-foreground">
          Tournament details are not available right now.
        </p>
      </div>
    </section>
  )
}

function TournamentInfoLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-16 flex flex-wrap justify-center gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="glass-card h-32 w-[calc((100%-1rem)/2)] animate-pulse rounded-xl md:w-[calc((100%-3rem)/4)]"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
