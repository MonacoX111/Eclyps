import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { TournamentInfo } from "@/components/tournament-info"
import { PublicBracket } from "@/components/public-bracket"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getLanguage } from "@/lib/i18n/server"
import { translations } from "@/lib/i18n/translations"

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

        <Suspense fallback={<BracketLoading />}>
          <div id="bracket">
            <ActiveTournamentBracket />
          </div>
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
  if (!homepageData.tournamentView) {
    const lang = await getLanguage()
    const t = translations[lang]
    return <TournamentUnavailable t={t} />
  }

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
    bannerUrl,
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
      bannerUrl={bannerUrl}
    />
  )
}

function TournamentUnavailable({ t }: { t: typeof translations.uk }) {
  return (
    <section className="relative flex min-h-[60vh] items-center justify-center px-4 py-20 text-center">
      <div>
        <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
          {t.tournament.upcomingEvent}
        </p>
        <p className="text-sm text-muted-foreground">
          {t.tournament.detailsUnavailable}
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
