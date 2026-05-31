import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicTeamProfile } from "@/lib/data/profiles"
import { getLanguage, getTranslations } from "@/lib/i18n/server"
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
  const [data, userProfile, t] = await Promise.all([
    getPublicTeamProfile(id),
    getCurrentUserProfile(),
    getTranslations(),
  ])

  if (!data) {
    return <PublicProfileError message={t.profile.teamUnavailable} userProfile={userProfile} />
  }

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
        .or(`user_id.eq.${userProfile.auth_user_id},owner_user_id.eq.${userProfile.id}`)
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
    return <PublicProfileError message={t.profile.teamUnavailable} userProfile={userProfile} />
  }
  const rosterManagement = isManager ? (
    <div className="mt-6">
      <div className="mb-4 inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
        {t.account.roster.managerBadge}
      </div>
      <TeamRosterManager
        teamId={id}
        isManager={isManager}
        members={members}
        ownerPlayerId={ownerPlayerId}
        initialError={resolvedParams?.rosterError}
        initialSuccess={resolvedParams?.rosterSuccess}
      />
    </div>
  ) : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PublicProfilePage data={data} userProfile={userProfile}>
        {rosterManagement}
      </PublicProfilePage>
    </div>
  )
}
