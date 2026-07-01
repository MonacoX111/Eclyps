import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getCurrentUserProfile, type UserProfile } from "@/lib/auth/user-profile"
import { getFriendOverview } from "@/lib/data/friends"
import { getHomepageData } from "@/lib/data/homepage"
import { FriendsClient } from "@/components/friends-client"
import { PresenceHeartbeat } from "@/components/presence-heartbeat"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"

export const dynamic = "force-dynamic"

export default async function FriendsPage() {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    redirect("/#registration")
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <ParticleField />
      <PresenceHeartbeat />
      <MotionProvider>
        <div className="relative z-10 flex-1 pt-20 pb-12">
          <Suspense fallback={null}>
            <ActiveNavbar userProfile={userProfile} />
          </Suspense>
          <FriendsContent userProfile={userProfile} />
        </div>
      </MotionProvider>
      <Footer />
    </main>
  )
}

async function ActiveNavbar({ userProfile }: { userProfile: UserProfile | null }) {
  const homepageData = await getHomepageData()
  return (
    <Navbar
      participantLabel={homepageData.participantLabel}
      userProfile={userProfile}
    />
  )
}

async function FriendsContent({ userProfile }: { userProfile: UserProfile }) {
  const overview = await getFriendOverview(userProfile.id)
  return (
    <FriendsClient
      currentUserId={userProfile.id}
      friends={overview.friends}
      incoming={overview.incoming}
      outgoing={overview.outgoing}
      unreadByFriend={overview.unreadByFriend}
    />
  )
}
