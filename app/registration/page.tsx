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
import { getTranslations } from "@/lib/i18n/server"

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
  const t = await getTranslations()
  const registrationFeedback = getRegistrationFeedback(resolvedSearchParams, t)
  const checkInFeedback = getCheckInFeedback(resolvedSearchParams, t)

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

function getRegistrationFeedback(
  searchParams: { registrationError?: string; registrationSuccess?: string } | undefined,
  t: any
): RegistrationFeedback | null {
  if (searchParams?.registrationSuccess === "submitted") {
    return {
      tone: "success",
      message: t.registration.alertsExtra.submitted,
    }
  }

  if (searchParams?.registrationSuccess === "player-application-submitted") {
    return {
      tone: "success",
      message: t.registration.alertsExtra.playerApplicationSubmitted,
    }
  }

  if (searchParams?.registrationSuccess === "player-application-pending") {
    return {
      tone: "success",
      message: t.registration.alertsExtra.playerApplicationPending,
    }
  }

  if (searchParams?.registrationSuccess === "player-approved") {
    return {
      tone: "success",
      message: t.registration.alertsExtra.playerApproved,
    }
  }

  if (!searchParams?.registrationError) return null

  const errorKeyMap: Record<string, string> = {
    "invalid-tournament-id": "invalidTournamentId",
    "invalid-participant-type": "invalidParticipantType",
    "wrong-participant-type": "wrongParticipantType",
    "invalid-display-name": "invalidDisplayName",
    "invalid-contact-email": "invalidContactEmail",
    "invalid-roster": "invalidRoster",
    "invalid-roster-minimum": "invalidRosterMinimum",
    "invalid-roster-maximum": "invalidRosterMaximum",
    "duplicate-roster-player": "duplicateRosterPlayer",
    "invalid-roster-captain": "invalidRosterCaptain",
    "registration-closed": "registrationClosed",
    "registration-full": "registrationFull",
    "duplicate-registration": "duplicateRegistration",
    "discord-login-required": "discordLoginRequired",
    "discord-profile-unavailable": "discordProfileUnavailable",
    "discord-login-failed": "discordLoginFailed",
    "player-approval-required": "playerApprovalRequired",
    "player-application-pending": "playerApplicationPending",
    "invalid-player-application": "invalidPlayerApplication",
    "already-registered": "alreadyRegistered",
    "admin-client-unavailable": "adminClientUnavailable",
    "mutation-failed": "mutationFailed",
  }

  const mappedKey = errorKeyMap[searchParams.registrationError]
  const message = (mappedKey && t.registration.errors[mappedKey]) || t.registration.errors.defaultError

  return { tone: "error", message }
}

function getCheckInFeedback(
  searchParams: { checkInError?: string; checkInSuccess?: string } | undefined,
  t: any
): RegistrationFeedback | null {
  if (searchParams?.checkInSuccess === "checked-in") {
    return {
      tone: "success",
      message: t.registration.alertsExtra.confirmedSuccess,
    }
  }

  if (searchParams?.checkInSuccess === "already-checked-in") {
    return {
      tone: "success",
      message: t.registration.alertsExtra.alreadyCheckedIn,
    }
  }

  if (!searchParams?.checkInError) return null

  const errorKeyMap: Record<string, string> = {
    "invalid-tournament": "invalidTournament",
    "discord-login-required": "discordLoginRequired",
    "service-unavailable": "serviceUnavailable",
    "registration-required": "registrationRequired",
    "registration-pending": "registrationPending",
    "check-in-not-open": "checkInNotOpen",
    "check-in-closed": "checkInClosed",
    "ownership-required": "ownershipRequired",
  }

  const mappedKey = errorKeyMap[searchParams.checkInError]
  const message = (mappedKey && t.registration.checkInErrors[mappedKey]) || t.registration.checkInErrors.defaultError

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
