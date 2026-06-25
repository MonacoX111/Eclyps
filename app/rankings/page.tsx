import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { RankingsBoard, type RankingRow } from "@/components/rankings-board"
import { getApprovedPlayers } from "@/lib/data/players"
import { getApprovedTeams } from "@/lib/data/teams"
import { getHomepageData } from "@/lib/data/homepage"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"

export const dynamic = "force-dynamic"

function tagFromName(name: string) {
  const clean = name.trim()
  if (!clean) return "?"
  const parts = clean.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

export default function RankingsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>
        <Suspense fallback={null}>
          <ActiveRankings />
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

async function ActiveRankings() {
  const [players, teams] = await Promise.all([
    getApprovedPlayers(),
    getApprovedTeams(),
  ])

  const playerRows: RankingRow[] = players.map((p) => ({
    id: p.id,
    name: p.display_name,
    tag: tagFromName(p.display_name),
    wins: p.wins,
    losses: p.losses,
    href: `/players/${p.id}`,
    avatarUrl: null,
  }))

  const teamRows: RankingRow[] = teams.map((tm) => ({
    id: tm.id,
    name: tm.name,
    tag: tagFromName(tm.name),
    wins: tm.wins,
    losses: tm.losses,
    href: `/teams/${tm.id}`,
    avatarUrl: tm.logo_url ?? null,
  }))

  return <RankingsBoard players={playerRows} teams={teamRows} />
}