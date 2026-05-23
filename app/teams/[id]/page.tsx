import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicTeamProfile } from "@/lib/data/profiles"
import { getLanguage } from "@/lib/i18n/server"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { canManageTeam } from "@/lib/auth/permissions"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { TeamRosterManager } from "@/components/team-roster-manager"

export const dynamic = "force-dynamic"

type TeamProfilePageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    rosterError?: string
    rosterSuccess?: string
  }>
}

export default async function TeamProfilePage({ params, searchParams }: TeamProfilePageProps) {
  const { id } = await params
  const resolvedParams = await searchParams
  const data = await getPublicTeamProfile(id)

  if (!data) {
    const lang = await getLanguage()
    const message = lang === "uk" ? "Цей профіль команди недоступний." : "This team profile is not available."
    return <PublicProfileError message={message} />
  }

  const userProfile = await getCurrentUserProfile()
  let isManager = false
  const ownerPlayerId = data.profile.owner_player_id ?? null
  const teamStatus = data.profile.status ?? "approved"
  const members = data.teamMembers ?? []

  if (userProfile) {
    const supabaseAdmin = createSupabaseAdminClient()
    if (supabaseAdmin) {
      const { data: player } = await supabaseAdmin
        .from("players")
        .select("id")
        .eq("user_id", userProfile.auth_user_id)
        .limit(1)
        .maybeSingle()

      if (player) {
        isManager = await canManageTeam(id, player.id)
      }
    }
  }

  // Enforce Visibility Rules:
  // Pending/rejected teams are only visible to the owner/captains (isManager)
  if (teamStatus !== "approved" && !isManager) {
    const lang = await getLanguage()
    const message = lang === "uk" ? "Цей профіль команди недоступний." : "This team profile is not available."
    return <PublicProfileError message={message} />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PublicProfilePage data={data} />
      
      <TeamRosterManager
        teamId={id}
        isManager={isManager}
        members={members}
        ownerPlayerId={ownerPlayerId}
        initialError={resolvedParams?.rosterError}
        initialSuccess={resolvedParams?.rosterSuccess}
      />
    </div>
  )
}
