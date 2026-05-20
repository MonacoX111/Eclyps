import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { TournamentInfo } from "@/components/tournament-info"
import { TeamsGrid } from "@/components/teams-grid"
import { MatchSchedule } from "@/components/match-schedule"
import { PublicBracket } from "@/components/public-bracket"
import { Results } from "@/components/results"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData, type TournamentBlocksView } from "@/lib/data/homepage"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>
        <Suspense fallback={<TournamentBlocksLoading />}>
          <ActiveTournamentBlocks />
        </Suspense>

        <Suspense fallback={<CardsLoading />}>
          <ActiveTournamentTeams />
        </Suspense>

        <Suspense fallback={<BracketLoading />}>
          <ActiveTournamentBracket />
        </Suspense>

        <div
          className="mx-auto h-px max-w-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
          }}
        />

        <Suspense fallback={<ScheduleLoading />}>
          <ActiveTournamentMatches />
        </Suspense>

        <div
          className="mx-auto h-px max-w-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
          }}
        />

        <Suspense fallback={<ResultsLoading />}>
          <ActiveTournamentResults />
        </Suspense>
      </MotionProvider>
      <Footer />
    </main>
  )
}

async function ActiveTournamentBlocks() {
  const homepageData = await getHomepageData()
  if (!homepageData.tournamentView) return <TournamentUnavailable />

  return <TournamentBlocks {...homepageData.tournamentView} />
}

async function ActiveNavbar() {
  const homepageData = await getHomepageData()

  return <Navbar participantLabel={homepageData.participantLabel} />
}

async function ActiveTournamentTeams() {
  const homepageData = await getHomepageData()

  return (
    <TeamsGrid
      teams={homepageData.participantCards}
      participantLabel={homepageData.participantLabel}
    />
  )
}

async function ActiveTournamentMatches() {
  const homepageData = await getHomepageData()

  return <MatchSchedule matches={homepageData.matchScheduleItems} />
}

async function ActiveTournamentBracket() {
  const homepageData = await getHomepageData()

  return <PublicBracket bracket={homepageData.publicBracket} />
}

async function ActiveTournamentResults() {
  const homepageData = await getHomepageData()

  return <Results results={homepageData.resultCards} />
}

function TournamentBlocks({
  heroName,
  sectionName,
  date,
  game,
  format,
  teamCount,
  status,
  prizePool,
  matchDays,
  arenaTitle,
  arenaDescription,
  arenaTags,
  participantLabel,
}: Partial<TournamentBlocksView> = {}) {
  return (
    <>
      <HeroSection
        tournamentName={heroName}
        tournamentDate={date}
        registrationStatus={status}
      />

      {/* Divider glow line */}
      <div
        className="mx-auto h-px max-w-xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
        }}
      />

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

      <div
        className="mx-auto h-px max-w-xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
        }}
      />
    </>
  )
}

function TournamentBlocksLoading() {
  return (
    <>
      <section className="relative flex min-h-screen items-center justify-center px-4 py-20">
        <div className="h-56 w-56 animate-pulse rounded-full bg-white/[0.04] md:h-72 md:w-72 lg:h-80 lg:w-80" />
      </section>
      <div className="mx-auto h-px max-w-xl bg-white/10" />
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
      <div className="mx-auto h-px max-w-xl bg-white/10" />
    </>
  )
}

function TournamentUnavailable() {
  return (
    <>
      <section className="relative flex min-h-screen items-center justify-center px-4 py-20 text-center">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
            Upcoming Event
          </p>
          <p className="text-sm text-muted-foreground">
            Tournament details are not available right now.
          </p>
        </div>
      </section>
      <div className="mx-auto h-px max-w-xl bg-white/10" />
    </>
  )
}

function CardsLoading() {
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

function ScheduleLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="glass-card h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  )
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
