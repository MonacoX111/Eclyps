import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { RoleOnboarding } from "@/components/role-onboarding"
import { NavigationHub } from "@/components/navigation-hub"
import { getHomepageData } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"

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

  return (
    <HeroSection
      tournamentName={heroName}
      tournamentDate={date}
      registrationStatus={status}
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
