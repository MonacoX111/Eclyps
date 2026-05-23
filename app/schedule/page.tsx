import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { MatchSchedule } from "@/components/match-schedule"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import type { RegistrationFeedback } from "@/components/registration-section"
import { getPlatformUserState } from "@/lib/auth/player-state"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData } from "@/lib/data/homepage"
import { getUserMatchDisputes } from "@/lib/data/disputes"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<{
    disputeError?: string
    disputeSuccess?: string
  }>
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const disputeFeedback = getDisputeFeedback(resolvedSearchParams)

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<ScheduleLoading />}>
          <ActiveTournamentMatches feedback={disputeFeedback} />
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

async function ActiveTournamentMatches({
  feedback,
}: {
  feedback: RegistrationFeedback | null
}) {
  const [homepageData, userProfile] = await Promise.all([
    getHomepageData(),
    getCurrentUserProfile(),
  ])
  const platformState = await getPlatformUserState({
    userProfile,
    tournamentId: homepageData.tournament?.id ?? null,
  })
  const disputes = await getUserMatchDisputes({
    userProfileId: userProfile?.id ?? null,
    tournamentId: homepageData.tournament?.id ?? null,
  })

  return (
    <MatchSchedule
      matches={homepageData.matchScheduleItems}
      userParticipantId={platformState.tournamentRegistration?.participant_id ?? null}
      disputes={disputes}
      feedback={feedback}
    />
  )
}

function getDisputeFeedback(searchParams?: {
  disputeError?: string
  disputeSuccess?: string
}): RegistrationFeedback | null {
  if (searchParams?.disputeSuccess === "submitted") {
    return {
      tone: "success",
      message: "Dispute submitted. Admins will review the match issue.",
    }
  }

  if (!searchParams?.disputeError) return null

  const message =
    {
      "invalid-match": "This match is not available for disputes.",
      "match-not-ready": "This match does not have confirmed participants yet.",
      "discord-login-required": "Please log in with Discord before reporting a dispute.",
      "not-match-participant": "Only match participants can report disputes.",
      "ownership-required": "Only the approved player or team captain can report this dispute.",
      "duplicate-open": "You already have an open dispute for this match.",
      "invalid-dispute-type": "Choose a valid dispute type.",
      "invalid-title": "Dispute title must not be empty.",
      "invalid-description": "Dispute description must not be empty.",
      "invalid-evidence-url": "Evidence link must be a valid URL.",
      "service-unavailable": "Dispute service is not configured.",
    }[searchParams.disputeError] ?? "Dispute could not be submitted."

  return { tone: "error", message }
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
