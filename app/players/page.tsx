import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { TeamsGrid } from "@/components/teams-grid"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { AdminShortcut } from "@/components/admin-shortcut"
import { getHomepageData } from "@/lib/data/homepage"
import { getApprovedPlayers } from "@/lib/data/players"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { withAvatarCacheBust } from "@/lib/avatar"
import { getTranslations } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

export default async function PlayersPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<PlayersLoading />}>
          <ActivePlayersGrid />
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

async function ActivePlayersGrid() {
  const [approvedPlayers, t] = await Promise.all([
    getApprovedPlayers(),
    getTranslations(),
  ])

  const playerCards = approvedPlayers.map((player, index) => {
    const displayName = player.display_name || player.nickname || player.name
    const seed = player.seed

    return {
      id: player.id,
      name: displayName,
      subtitle: getPlayerCardSubtitle({
        realName: player.real_name,
        nickname: player.nickname,
        fallback: t.teamsGrid.playerSubtitleDefault,
      }),
      tag: createTeamTag(displayName),
      wins: player.wins,
      losses: player.losses,
      rank: seed ?? index + 1,
      profileHref: `/players/${player.id}`,
      avatarUrl: withAvatarCacheBust(player.owner_profile?.avatar_url, player.owner_profile?.updated_at),
      avatarAlt:
        player.owner_profile?.discord_username ??
        player.owner_profile?.display_name ??
        displayName,
    }
  })

  return (
    <TeamsGrid
      teams={playerCards}
      participantLabel="Players"
    />
  )
}

function createTeamTag(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase()
}

function getPlayerCardSubtitle({
  realName,
  nickname,
  fallback,
}: {
  realName: string | null
  nickname: string | null
  fallback: string
}) {
  const hasNickname = typeof nickname === "string" && nickname.trim().length > 0
  const hasRealName = typeof realName === "string" && realName.trim().length > 0

  if (hasNickname && hasRealName) {
    return realName
  }
  return fallback
}



function PlayersLoading() {
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
