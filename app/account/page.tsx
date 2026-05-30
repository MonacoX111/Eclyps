import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  User,
  ShieldAlert,
  Globe,
  Award,
  Trophy,
  Layers,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Calendar,
  Sparkles,
} from "lucide-react"

import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getUserNotifications } from "@/lib/notifications/actions"
import { getHomepageData } from "@/lib/data/homepage"
import { getTranslations } from "@/lib/i18n/server"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ParticleField } from "@/components/particle-field"
import { MotionProvider } from "@/components/motion-provider"
import { CreateTeamModal } from "@/components/create-team-modal"
import { EditProfileForm } from "@/components/edit-profile-form"
import { AccountNotificationsList } from "@/components/account-notifications-list"
import { AccountAvatar } from "@/components/account-avatar"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const userProfile = await getCurrentUserProfile()
  if (!userProfile) {
    redirect("/#registration")
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20 pb-12 bg-background">
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<AccountDashboardLoading />}>
          <AccountDashboard userProfileId={userProfile.id} userProfileAvatarUrl={userProfile.avatar_url} />
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

type TeamInfo = {
  id: string
  name: string
  status: string
  role: "Owner" | "Captain" | "Member"
}

async function AccountDashboard({
  userProfileId,
  userProfileAvatarUrl,
}: {
  userProfileId: string
  userProfileAvatarUrl: string | null
}) {
  const t = await getTranslations()
  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return (
      <div className="mx-auto max-w-lg mt-20 p-6 glass-card rounded-2xl text-center">
        <h2 className="text-xl font-bold text-white">{t.account.serviceUnavailable}</h2>
        <p className="text-sm text-white/60 mt-2">{t.account.dbOffline}</p>
      </div>
    )
  }

  // 1. Fetch user's player profile
  const { data: player, error: playerError } = await supabaseAdmin
    .from("players")
    .select("id, name, nickname, real_name, display_name, region, seed, rating, wins, losses, status, avatar_url")
    .eq("owner_user_id", userProfileId)
    .maybeSingle()

  if (playerError || !player) {
    return (
      <div className="mx-auto max-w-lg mt-20 p-6 glass-card rounded-2xl text-center border border-white/5 shadow-2xl">
        <h2 className="text-xl font-bold text-white">{t.account.profileMissing}</h2>
        <p className="text-sm text-white/60 mt-2">
          {t.account.profileMissingDesc}
        </p>
      </div>
    )
  }

  // 2. Fetch User's Teams with deduplication
  // A. Fetch teams owned/captained by user's player ID
  const { data: ownedTeams } = await supabaseAdmin
    .from("teams")
    .select("id, name, status, owner_player_id")
    .eq("owner_player_id", player.id)

  // B. Fetch team memberships
  const { data: memberships } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role, teams:teams(id, name, status, owner_player_id)")
    .eq("player_id", player.id)

  const teamMap = new Map<string, TeamInfo>()

  if (ownedTeams) {
    for (const t of ownedTeams) {
      teamMap.set(t.id, {
        id: t.id,
        name: t.name,
        status: t.status || "approved",
        role: "Owner",
      })
    }
  }

  if (memberships) {
    for (const m of memberships) {
      const teamObj = m.teams as any
      if (teamObj) {
        const existing = teamMap.get(teamObj.id)
        // Highest role takes precedence: Owner > Captain > Member
        const role = existing?.role === "Owner"
          ? "Owner"
          : m.role === "captain"
            ? "Captain"
            : "Member"

        teamMap.set(teamObj.id, {
          id: teamObj.id,
          name: teamObj.name,
          status: teamObj.status || "approved",
          role,
        })
      }
    }
  }

  const teamsList = Array.from(teamMap.values())

  // 3. Fetch User's registrations
  const { data: registrations } = await supabaseAdmin
    .from("tournament_registrations")
    .select(`
      id,
      tournament_id,
      registration_type,
      status,
      participant_id,
      tournaments:tournaments(name)
    `)
    .eq("user_profile_id", userProfileId)
    .order("created_at", { ascending: false })

  // 4. Fetch User's Notifications
  const notifications = await getUserNotifications()

  // Sizing and styling tokens
  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      case "rejected":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    }
  }

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case "Owner":
        return "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 font-bold"
      case "Captain":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold"
      default:
        return "bg-white/5 text-white/50 border border-white/10"
    }
  }

  return (
    <section className="relative z-10 px-4 py-8 max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-400">
            {t.account.dashboard}
          </p>
          <h1 className="glow-text mt-2 text-3xl font-extrabold text-white md:text-4xl">
            {t.account.welcomeBack}, {player.nickname || player.name}
          </h1>
          <p className="text-xs text-white/50 mt-1">{t.account.manageDescription}</p>
        </div>
        <div className="shrink-0">
          <Link
            href={`/players/${player.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/80 hover:text-white hover:border-white/20 transition cursor-pointer"
          >
            <span>{t.account.viewPublicProfile}</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Profile Summary & Editing (Span 1) */}
        <div className="space-y-6 md:col-span-1">
          {/* Card: Profile Summary */}
          <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-5">
            <div className="flex items-center gap-3.5">
              <AccountAvatar url={player.avatar_url || userProfileAvatarUrl} displayName={player.display_name} />
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {player.display_name}
                </h2>
                <div className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${statusBadgeClass(player.status || "pending")}`}>
                  {(player.status === "approved" || player.status === "rejected" || player.status === "pending")
                    ? t.profile.meta[player.status as "approved" | "rejected" | "pending"]
                    : (player.status || t.profile.meta.pending)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4">
              <div className="space-y-1">
                <span className="block text-[10px] uppercase tracking-wider text-white/40">{t.account.eloRating}</span>
                <span className="block text-lg font-extrabold text-white flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  {player.rating ?? 1000}
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] uppercase tracking-wider text-white/40">{t.account.record}</span>
                <span className="block text-lg font-extrabold text-white">
                  {player.wins ?? 0} <span className="text-white/40 text-sm">/</span> {player.losses ?? 0}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-white/70">
              {player.real_name && (
                <div className="flex justify-between items-center">
                  <span className="text-white/40">{t.account.realName}</span>
                  <span className="font-semibold text-white">{player.real_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-white/40">{t.account.region}</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-white/50" />
                  {player.region || t.account.notSpecified}
                </span>
              </div>
              {player.seed !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-white/40">{t.account.globalSeed}</span>
                  <span className="font-semibold text-primary font-mono">#{player.seed}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Edit Profile */}
          <div className="glass-card rounded-2xl border border-white/5 p-6">
            <EditProfileForm
              initialNickname={player.nickname}
              initialRealName={player.real_name}
              initialRegion={player.region}
            />
          </div>
        </div>

        {/* Right Columns - Teams, Registrations, & Notifications (Span 2) */}
        <div className="space-y-6 md:col-span-2">
          {/* Card: My Teams */}
          <div className="glass-card rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{t.account.myTeams}</h3>
                <p className="text-xs text-white/40 mt-0.5">{t.account.teamsDescription}</p>
              </div>
              <div className="shrink-0">
                <CreateTeamModal
                  hasApprovedPlayer={player.status === "approved"}
                  isLoggedIn={true}
                />
              </div>
            </div>

            {teamsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/45">
                {t.account.noTeams}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {teamsList.map((team) => {
                  const displayRole = team.role === "Owner"
                    ? t.profile.meta.owner
                    : team.role === "Captain"
                      ? t.profile.meta.captain
                      : t.profile.meta.member;

                  const displayTeamStatus = (team.status === "approved" || team.status === "rejected" || team.status === "pending")
                    ? t.profile.meta[team.status as "approved" | "rejected" | "pending"]
                    : (team.status || t.profile.meta.pending);

                  return (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 transition flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="block font-bold text-white truncate text-sm hover:text-primary transition">
                          {team.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${roleBadgeClass(team.role)}`}>
                            {displayRole}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${statusBadgeClass(team.status)}`}>
                            {displayTeamStatus}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card: My Registrations */}
          <div className="glass-card rounded-2xl border border-white/5 p-6">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3.5 mb-4">{t.account.myRegistrations}</h3>

            {registrations && registrations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-white/40 uppercase tracking-wider border-b border-white/5">
                      <th className="pb-3 font-semibold">{t.account.tableTournament}</th>
                      <th className="pb-3 font-semibold">{t.account.tableType}</th>
                      <th className="pb-3 font-semibold">{t.account.tableStatus}</th>
                      <th className="pb-3 font-semibold text-right">{t.account.tableBracket}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {registrations.map((reg: any) => {
                      const displayRegType = reg.registration_type === "team"
                        ? t.profile.meta.team
                        : t.profile.meta.player;

                      const displayRegStatus = (reg.status === "approved" || reg.status === "rejected" || reg.status === "pending")
                        ? t.profile.meta[reg.status as "approved" | "rejected" | "pending"]
                        : (reg.status || t.profile.meta.pending);

                      return (
                        <tr key={reg.id} className="text-white/80 hover:bg-white/[0.01] transition">
                          <td className="py-3.5 font-bold text-white">
                            {reg.tournaments?.name || t.profile.meta.tournament}
                          </td>
                          <td className="py-3.5 capitalize">{displayRegType}</td>
                          <td className="py-3.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(reg.status)}`}>
                              {displayRegStatus}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-medium">
                            {reg.status === "approved" && reg.participant_id ? (
                              <span className="text-emerald-400 flex items-center justify-end gap-1 font-semibold">
                                <UserCheck className="h-3.5 w-3.5" />
                                {t.account.activeParticipant}
                              </span>
                            ) : reg.status === "approved" ? (
                              <span className="text-emerald-400/60 font-medium">{t.account.linked}</span>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-white/45">
                {t.account.noRegistrations}
              </div>
            )}
          </div>

          {/* Card: Notifications */}
          <div className="glass-card rounded-2xl border border-white/5 p-6">
            <AccountNotificationsList initialNotifications={notifications} />
          </div>
        </div>
      </div>
    </section>
  )
}

function AccountDashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="h-10 w-64 bg-white/5 rounded" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-card h-96 bg-white/5 rounded-2xl border border-white/5" />
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card h-48 bg-white/5 rounded-2xl border border-white/5" />
          <div className="glass-card h-48 bg-white/5 rounded-2xl border border-white/5" />
        </div>
      </div>
    </div>
  )
}
