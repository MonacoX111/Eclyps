import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { HeroSection, type HeroFeaturedMatch } from "@/components/hero-section"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { RoleOnboarding } from "@/components/role-onboarding"
import { NavigationHub } from "@/components/navigation-hub"
import { getHomepageData, type HomepageData, type HomepageMatch } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import type { PublicBracketMatch, PublicBracketParticipant } from "@/components/public-bracket"

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
  const homepageData = await getHomepageData()
  const { heroName, date, status } = homepageData.tournamentView ?? {}
  const featuredMatch = getHeroFeaturedMatch(homepageData)

  return (
    <HeroSection
      tournamentName={heroName}
      tournamentDate={date}
      registrationStatus={status}
      featuredMatch={featuredMatch}
    />
  )
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

function getHeroFeaturedMatch(homepageData: HomepageData): HeroFeaturedMatch | null {
  const bracketMatch = pickFeaturedBracketMatch(homepageData.publicBracket?.rounds.flatMap((round) => round.matches) ?? [])
  if (bracketMatch) {
    return {
      id: bracketMatch.id,
      label: bracketMatch.label,
      status: bracketMatch.status,
      participants: [
        getHeroParticipantFromBracket(bracketMatch.participants[0]),
        getHeroParticipantFromBracket(bracketMatch.participants[1]),
      ],
    }
  }

  const match = pickFeaturedHomepageMatch(homepageData.matches)
  if (!match) return null

  return {
    id: match.id,
    label: match.bracket_round ?? match.round ?? "Featured match",
    status: match.status,
    participants: [
      getHeroParticipantFromMatch(match, "left"),
      getHeroParticipantFromMatch(match, "right"),
    ],
  }
}

function pickFeaturedBracketMatch(matches: PublicBracketMatch[]) {
  return (
    matches.find((match) => match.status === "live" && hasNamedParticipants(match)) ??
    matches.find((match) => match.status === "upcoming" && hasNamedParticipants(match)) ??
    matches.find(hasNamedParticipants) ??
    matches[0] ??
    null
  )
}

function pickFeaturedHomepageMatch(matches: HomepageMatch[]) {
  return (
    matches.find((match) => match.status === "live" && hasHomepageMatchParticipants(match)) ??
    matches.find((match) => match.status === "upcoming" && hasHomepageMatchParticipants(match)) ??
    matches.find(hasHomepageMatchParticipants) ??
    matches[0] ??
    null
  )
}

function hasNamedParticipants(match: PublicBracketMatch) {
  return match.participants.some((participant) => participant.name !== "TBD")
}

function hasHomepageMatchParticipants(match: HomepageMatch) {
  return Boolean(match.team1 || match.team2 || match.participant_1 || match.participant_2)
}

function getHeroParticipantFromBracket(participant: PublicBracketParticipant) {
  return {
    name: participant.name,
    imageUrl: participant.imageUrl,
    kind: participant.kind,
    score: participant.score,
  }
}

function getHeroParticipantFromMatch(match: HomepageMatch, side: "left" | "right") {
  const participant = side === "left" ? match.participant_1 : match.participant_2
  const name = (side === "left" ? match.team1 : match.team2) ?? participant?.display_name ?? "TBD"
  const kind = participant?.participant_type ?? match.participant_type

  return {
    name,
    kind,
    score: side === "left" ? match.score1 : match.score2,
    imageUrl: kind === "team"
      ? participant?.logo_url ?? participant?.avatar_url ?? null
      : participant?.avatar_url ?? participant?.logo_url ?? null,
  }
}
