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
import { getLanguage } from "@/lib/i18n/server"

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
  const lang = await getLanguage()
  const registrationFeedback = getRegistrationFeedback(resolvedSearchParams, lang)
  const checkInFeedback = getCheckInFeedback(resolvedSearchParams, lang)

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
  lang: "uk" | "en"
): RegistrationFeedback | null {
  if (searchParams?.registrationSuccess === "submitted") {
    return {
      tone: "success",
      message: lang === "uk"
        ? "Реєстрація надіслана. Адміністратор перевірить її перед тим, як вона з'явиться в турнірі."
        : "Registration submitted. An admin will review it before it appears in the tournament.",
    }
  }

  if (searchParams?.registrationSuccess === "player-application-submitted") {
    return {
      tone: "success",
      message: lang === "uk"
        ? "Заявку гравця надіслано. Адміністратор перевірить її, перш ніж відкриється реєстрація на турнір."
        : "Player application submitted. An admin will review it before tournament registration opens for you.",
    }
  }

  if (searchParams?.registrationSuccess === "player-application-pending") {
    return {
      tone: "success",
      message: lang === "uk"
        ? "Ваша заявка гравця вже очікує на розгляд."
        : "Your player application is already pending review.",
    }
  }

  if (searchParams?.registrationSuccess === "player-approved") {
    return {
      tone: "success",
      message: lang === "uk"
        ? "Ви вже схвалені як гравець Eclyps."
        : "You are already approved as an Eclyps player.",
    }
  }

  if (!searchParams?.registrationError) return null

  const ukMessages: Record<string, string> = {
    "invalid-tournament-id": "Турнір недоступний для реєстрації.",
    "invalid-participant-type": "Тип реєстрації має бути індивідуальним або командним.",
    "wrong-participant-type": "Цей турнір не приймає обраний тип реєстрації.",
    "invalid-display-name": "Назва або нікнейм не можуть бути порожніми.",
    "invalid-contact-email": "Введіть дійсний контактний email або залиште поле порожнім.",
    "invalid-roster": "Не вдалося надіслати склад команди. Будь ласка, перевірте список.",
    "invalid-roster-minimum": "Реєстрація команди вимагає 5 основних гравців.",
    "invalid-roster-maximum": "Склад команди може містити максимум 7 гравців.",
    "duplicate-roster-player": "Нікнейми гравців у складі мають бути унікальними.",
    "invalid-roster-captain": "Нікнейм капітана має точно збігатися з одним із гравців складу.",
    "registration-closed": "Реєстрація на цей турнір закрита.",
    "registration-full": "Цей турнір повністю заповнений.",
    "duplicate-registration": "Ця команда або гравець вже зареєстровані чи очікують на розгляд.",
    "discord-login-required": "Будь ласка, увійдіть через Discord перед реєстрацією.",
    "discord-profile-unavailable": "Не вдалося синхронізувати профіль Discord. Будь ласка, вийдіть і спробуйте знову.",
    "discord-login-failed": "Не вдалося завершити вхід через Discord. Спробуйте ще раз.",
    "player-approval-required": "Подайте заявку гравця та зачекайте на схвалення адміністратора перед реєстрацією.",
    "player-application-pending": "Ваша заявка гравця очікує на перевірку адміністратором.",
    "invalid-player-application": "Нікнейм у заявці гравця не може бути порожнім.",
    "already-registered": "У вас вже є реєстрація на турнір у стані розгляду або схвалена.",
    "admin-client-unavailable": "Сервіс реєстрації не налаштовано.",
    "mutation-failed": "Не вдалося надіслати реєстрацію. Будь ласка, спробуйте ще раз.",
  }

  const enMessages: Record<string, string> = {
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
  }

  const message = lang === "uk"
    ? ukMessages[searchParams.registrationError] ?? "Не вдалося надіслати реєстрацію."
    : enMessages[searchParams.registrationError] ?? "Registration could not be submitted."

  return { tone: "error", message }
}

function getCheckInFeedback(
  searchParams: { checkInError?: string; checkInSuccess?: string } | undefined,
  lang: "uk" | "en"
): RegistrationFeedback | null {
  if (searchParams?.checkInSuccess === "checked-in") {
    return {
      tone: "success",
      message: lang === "uk"
        ? "Чек-ін підтверджено. Ваше місце в турнірі зарезервовано."
        : "Check-in confirmed. Your tournament slot is locked.",
    }
  }

  if (searchParams?.checkInSuccess === "already-checked-in") {
    return {
      tone: "success",
      message: lang === "uk"
        ? "Ви вже пройшли чек-ін на цей турнір."
        : "You are already checked in for this tournament.",
    }
  }

  if (!searchParams?.checkInError) return null

  const ukMessages: Record<string, string> = {
    "invalid-tournament": "Чек-ін на турнір недоступний.",
    "discord-login-required": "Будь ласка, увійдіть через Discord перед проходженням чек-іну.",
    "service-unavailable": "Сервіс чек-іну не налаштовано.",
    "registration-required": "Зареєструйтеся на цей турнір перед чек-іном.",
    "registration-pending": "Ваша реєстрація на турнір очікує на схвалення адміністратором.",
    "check-in-not-open": "Чек-ін ще не відкрився.",
    "check-in-closed": "Чек-ін на цей турнір закритий.",
    "ownership-required": "Тільки схвалений гравець або власник команди може пройти чек-ін.",
  }

  const enMessages: Record<string, string> = {
    "invalid-tournament": "Tournament check-in is not available.",
    "discord-login-required": "Please log in with Discord before checking in.",
    "service-unavailable": "Check-in service is not configured.",
    "registration-required": "Register for this tournament before checking in.",
    "registration-pending": "Your tournament registration is waiting for admin approval.",
    "check-in-not-open": "Check-in is not open yet.",
    "check-in-closed": "Check-in is closed for this tournament.",
    "ownership-required": "Only the approved player or team owner can check in.",
  }

  const message = lang === "uk"
    ? ukMessages[searchParams.checkInError] ?? "Не вдалося завершити чек-ін."
    : enMessages[searchParams.checkInError] ?? "Check-in could not be completed."

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
