import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { RoleOnboarding } from "@/components/role-onboarding"
import { NavigationHub } from "@/components/navigation-hub"
import { getHomepageData, type HomepageData, type HomepageMatch } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getLanguage } from "@/lib/i18n/server"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"
import type { HeroFeaturedMatch } from "@/components/hero-section"

export const dynamic = "force-dynamic"

export default async function Page() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>
        
        <Suspense fallback={<HeroSectionLoading />}>
          <ActiveHero />
        </Suspense>

        <RoleOnboarding />

        <div
          className="mx-auto h-px max-w-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
          }}
        />

        <Suspense fallback={null}>
          <ActiveNavigationHub />
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

async function ActiveHero() {
  const [homepageData, lang] = await Promise.all([
    getHomepageData(),
    getLanguage(),
  ])
  const { heroName, date, status } = homepageData.tournamentView ?? {}

  return (
    <HeroSection
      tournamentName={heroName}
      tournamentDate={date}
      registrationStatus={status}
      nextMatch={getHeroFeaturedMatch(homepageData, lang)}
    />
  )
}

function getHeroFeaturedMatch(
  homepageData: HomepageData,
  lang: "uk" | "en",
): HeroFeaturedMatch | null {
  const match =
    homepageData.matches.find((item) => item.status === "live") ??
    homepageData.matches.find((item) => item.status === "upcoming")

  if (!match) return null

  return {
    href: `/matches/${match.id}`,
    round: match.bracket_round ?? match.round ?? "Match",
    time: formatMatchScheduleTime({
      scheduledAt: match.scheduled_at,
      timezone: match.timezone,
      scheduleNote: match.schedule_note,
      lang,
    }),
    status: match.status,
    participantA: getHeroMatchParticipant(match, "participant_1"),
    participantB: getHeroMatchParticipant(match, "participant_2"),
  }
}

function getHeroMatchParticipant(
  match: HomepageMatch,
  side: "participant_1" | "participant_2",
): HeroFeaturedMatch["participantA"] {
  const participant = match[side]
  const fallbackName = side === "participant_1" ? match.team1 : match.team2
  const kind = participant?.participant_type ?? match.participant_type
  const imageUrl =
    kind === "team"
      ? participant?.logo_url ?? participant?.avatar_url ?? null
      : participant?.avatar_url ?? participant?.logo_url ?? null

  return {
    name: participant?.display_name ?? fallbackName ?? "TBD",
    imageUrl,
    kind,
  }
}

async function ActiveNavigationHub() {
  const homepageData = await getHomepageData()
  return <NavigationHub participantLabel={homepageData.participantLabel} />
}

function HeroSectionLoading() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-4 py-20">
      <div className="h-56 w-56 animate-pulse rounded-full bg-white/[0.04] md:h-72 md:w-72 lg:h-80 lg:w-80" />
    </section>
  )
}
