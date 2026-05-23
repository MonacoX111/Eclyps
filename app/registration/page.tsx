import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import {
  RegistrationSection,
  type RegistrationFeedback,
} from "@/components/registration-section"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getPlatformUserState } from "@/lib/auth/player-state"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData } from "@/lib/data/homepage"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<{
    registrationError?: string
    registrationSuccess?: string
    checkInError?: string
    checkInSuccess?: string
  }>
}

export default async function RegistrationPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const registrationFeedback = getRegistrationFeedback(resolvedSearchParams)
  const checkInFeedback = getCheckInFeedback(resolvedSearchParams)

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<RegistrationLoading />}>
          <ActiveTournamentRegistration
            feedback={registrationFeedback}
            checkInFeedback={checkInFeedback}
          />
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

async function ActiveTournamentRegistration({
  feedback,
  checkInFeedback,
}: {
  feedback: RegistrationFeedback | null
  checkInFeedback: RegistrationFeedback | null
}) {
  const [homepageData, userProfile] = await Promise.all([
    getHomepageData(),
    getCurrentUserProfile(),
  ])
  const platformState = await getPlatformUserState({
    userProfile,
    tournamentId: homepageData.registrationSummary?.tournamentId ?? null,
  })

  return (
    <RegistrationSection
      summary={homepageData.registrationSummary}
      participantLabel={homepageData.participantLabel}
      tournamentName={
        homepageData.tournament?.name ??
        homepageData.tournament?.display_name ??
        homepageData.tournament?.title
      }
      feedback={feedback}
      checkInFeedback={checkInFeedback}
      platformState={platformState}
    />
  )
}

function getRegistrationFeedback(searchParams?: {
  registrationError?: string
  registrationSuccess?: string
}): RegistrationFeedback | null {
  if (searchParams?.registrationSuccess === "submitted") {
    return {
      tone: "success",
      message: "Registration submitted. An admin will review it before it appears in the tournament.",
    }
  }

  if (searchParams?.registrationSuccess === "player-application-submitted") {
    return {
      tone: "success",
      message: "Player application submitted. An admin will review it before tournament registration opens for you.",
    }
  }

  if (searchParams?.registrationSuccess === "player-application-pending") {
    return {
      tone: "success",
      message: "Your player application is already pending review.",
    }
  }

  if (searchParams?.registrationSuccess === "player-approved") {
    return {
      tone: "success",
      message: "You are already approved as an Eclyps player.",
    }
  }

  if (!searchParams?.registrationError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is not available for registration.",
      "invalid-participant-type": "Registration type must be team or player.",
      "wrong-participant-type": "This tournament does not accept that registration type.",
      "invalid-display-name": "Name must not be empty.",
      "invalid-contact-email": "Contact email must be valid or left empty.",
      "invalid-roster": "Team roster could not be submitted. Please check the lineup.",
      "invalid-roster-minimum": "Team registrations require 5 main players.",
      "invalid-roster-maximum": "Team rosters can include at most 7 players.",
      "duplicate-roster-player": "Roster nicknames must be unique.",
      "invalid-roster-captain": "Captain nickname must match one of the roster players.",
      "registration-closed": "Registration is closed for this tournament.",
      "registration-full": "This tournament is full.",
      "duplicate-registration": "This team or player is already registered or awaiting review.",
      "discord-login-required": "Please log in with Discord before registering.",
      "discord-profile-unavailable": "Discord profile could not be synced. Please log out and try again.",
      "discord-login-failed": "Discord login could not be completed. Please try again.",
      "player-approval-required": "Apply as a player and wait for admin approval before registering for tournaments.",
      "player-application-pending": "Your player application is waiting for admin review.",
      "invalid-player-application": "Player application nickname must not be empty.",
      "already-registered": "You already have a tournament registration in review or approved.",
      "admin-client-unavailable": "Registration service is not configured.",
      "mutation-failed": "Registration could not be submitted. Please try again.",
    }[searchParams.registrationError] ?? "Registration could not be submitted."

  return { tone: "error", message }
}

function getCheckInFeedback(searchParams?: {
  checkInError?: string
  checkInSuccess?: string
}): RegistrationFeedback | null {
  if (searchParams?.checkInSuccess === "checked-in") {
    return {
      tone: "success",
      message: "Check-in confirmed. Your tournament slot is locked.",
    }
  }

  if (searchParams?.checkInSuccess === "already-checked-in") {
    return {
      tone: "success",
      message: "You are already checked in for this tournament.",
    }
  }

  if (!searchParams?.checkInError) return null

  const message =
    {
      "invalid-tournament": "Tournament check-in is not available.",
      "discord-login-required": "Please log in with Discord before checking in.",
      "service-unavailable": "Check-in service is not configured.",
      "registration-required": "Register for this tournament before checking in.",
      "registration-pending": "Your tournament registration is waiting for admin approval.",
      "check-in-not-open": "Check-in is not open yet.",
      "check-in-closed": "Check-in is closed for this tournament.",
      "ownership-required": "Only the approved player or team owner can check in.",
    }[searchParams.checkInError] ?? "Check-in could not be completed."

  return { tone: "error", message }
}

function RegistrationLoading() {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto mb-16 h-10 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="glass-card h-80 animate-pulse rounded-2xl" />
      </div>
    </section>
  )
}
