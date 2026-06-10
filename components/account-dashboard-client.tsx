"use client"

import React, { type ReactNode } from "react"
import Link from "next/link"
import {
  Globe,
  Trophy,
  ShieldCheck,
  UserCheck,
  ShieldAlert,
  Calendar,
  Crosshair,
  Gamepad2,
  Swords,
  TrendingUp,
  Flame,
  Users,
  Bell,
  ExternalLink,
  Settings,
  Inbox,
  LogOut,
} from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { EditProfileForm } from "@/components/edit-profile-form"
import { CreateTeamModal } from "@/components/create-team-modal"
import { AccountNotificationsList } from "@/components/account-notifications-list"
import { AccountAvatar } from "@/components/account-avatar"
import { ProfileTabs, useProfileTab, type ProfileTabItem } from "@/components/profile-tabs"
import type { UserProfile } from "@/lib/auth/user-profile"
import { getAvatarVersion, withAvatarCacheBust } from "@/lib/avatar"
import { getLocalizedNotification } from "@/lib/notifications/localize"
import { refreshDiscordProfile } from "@/app/account/actions"
import { acceptTeamInvite, declineTeamInvite } from "@/app/actions/invites"
import { leaveTeam } from "@/app/actions/teams"
import { cancelTeamJoinRequest } from "@/app/actions/team-join-requests"

export type TeamInfo = {
  id: string
  name: string
  status: string
  role: "Owner" | "Captain" | "Member" | "Sub"
  logo_url: string | null
  created_at: string | null
  roster_count: number
  is_locked?: boolean
}

type TeamRow = {
  id: string
  name: string
  status: string | null
  owner_player_id: string | null
  logo_url: string | null
  created_at: string | null
}

export type AccountDashboardClientProps = {
  userProfile: UserProfile
  player: any
  teamsList: TeamInfo[]
  registrations: any[]
  notifications: any[]
  searchParams?: {
    teamError?: string
    teamSuccess?: string
    inviteError?: string
    inviteSuccess?: string
    joinRequestError?: string
    joinRequestSuccess?: string
    discordRefresh?: string
  }
  invitesList?: any[]
  joinRequestsList?: any[]
}

export function AccountDashboardClient({
  userProfile,
  player,
  teamsList,
  registrations,
  notifications,
  searchParams,
  invitesList = [],
  joinRequestsList = [],
}: AccountDashboardClientProps) {
  const { t, lang } = useLanguage()

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (searchParams?.discordRefresh) {
      if (searchParams.discordRefresh === "updated") {
        setSuccessMessage(t.account.discordRefreshSuccess)
      } else if (searchParams.discordRefresh === "stale") {
        setSuccessMessage(t.account.discordRefreshSignInAgain)
      } else {
        setErrorMessage(t.account.discordRefreshError)
      }
      const timer = setTimeout(() => {
        setErrorMessage(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
    if (searchParams?.inviteError) {
      const messages: Record<string, string> = {
        "unauthorized": t.account.invites.errors.unauthorized,
        "invalid-invite": t.account.invites.errors.invalidInvite,
        "mutation-failed": t.account.invites.errors.mutationFailed,
        "admin-client-unavailable": t.account.invites.errors.mutationFailed,
      }
      setErrorMessage(messages[searchParams.inviteError] ?? t.account.invites.errors.mutationFailed)
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
    if (searchParams?.inviteSuccess) {
      const messages: Record<string, string> = {
        "accepted": t.account.invites.success.accepted,
        "declined": t.account.invites.success.declined,
      }
      setSuccessMessage(messages[searchParams.inviteSuccess] ?? t.account.roster.success.generic)
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
    if (searchParams?.teamError) {
      const messages: Record<string, string> = {
        "permission-denied": t.account.roster.errors.permissionDenied,
        "mutation-failed": t.account.roster.errors.mutationFailed,
        "owner-cannot-leave": t.account.roster.errors.ownerCannotLeave,
        "roster-locked": t.account.roster.errors.rosterLocked,
      }
      setErrorMessage(messages[searchParams.teamError] ?? t.account.roster.errors.mutationFailed)
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
    if (searchParams?.teamSuccess) {
      const messages: Record<string, string> = {
        "team-left": t.account.roster.success.teamLeft,
      }
      setSuccessMessage(messages[searchParams.teamSuccess] ?? t.account.roster.success.generic)
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
    if (searchParams?.joinRequestError) {
      const messages: Record<string, string> = {
        "login-required": t.account.joinRequests.errors.loginRequired,
        "missing-id": t.account.joinRequests.errors.invalidRequest,
        "permission-denied": t.account.joinRequests.errors.permissionDenied,
        "invalid-request": t.account.joinRequests.errors.invalidRequest,
        "mutation-failed": t.account.joinRequests.errors.mutationFailed,
        "admin-client-unavailable": t.account.joinRequests.errors.mutationFailed,
      }
      setErrorMessage(messages[searchParams.joinRequestError] ?? t.account.joinRequests.errors.mutationFailed)
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
    if (searchParams?.joinRequestSuccess) {
      const messages: Record<string, string> = {
        "cancelled": t.account.joinRequests.success.cancelled,
      }
      setSuccessMessage(messages[searchParams.joinRequestSuccess] ?? t.account.joinRequests.success.cancelled)
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams?.discordRefresh, searchParams?.inviteError, searchParams?.inviteSuccess, searchParams?.teamError, searchParams?.teamSuccess, searchParams?.joinRequestError, searchParams?.joinRequestSuccess, lang, t])

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
      case "Sub":
        return "bg-blue-500/10 text-blue-300 border border-blue-500/20"
      default:
        return "bg-white/5 text-white/50 border border-white/10"
    }
  }

  const wins = player.wins ?? 0
  const losses = player.losses ?? 0
  const matches = wins + losses
  const winRate = matches > 0 ? `${Math.round((wins / matches) * 100)}%` : "0%"
  const rating = player.rating ?? 1000
  const displayName = player.nickname || player.display_name || player.name
  const accountAvatarUrl = withAvatarCacheBust(
    userProfile.avatar_url || player.avatar_url,
    getAvatarVersion(userProfile.updated_at),
  )
  const seedLabel = player.seed !== null && player.seed !== undefined ? `#${player.seed}` : t.account.notSpecified

  const displayStatus = (status: string | null | undefined) =>
    status === "approved" || status === "rejected" || status === "pending"
      ? t.profile.meta[status]
      : (status || t.profile.meta.pending)

  const displayRole = (role: TeamInfo["role"]) =>
    role === "Owner"
      ? t.profile.meta.owner
      : role === "Captain"
        ? t.profile.meta.captain
        : role === "Sub"
          ? t.profile.meta.substitute
          : t.profile.meta.member

  const statCards = [
    { label: t.account.stats.elo, value: String(rating), icon: Trophy, tone: "text-amber-300" },
    { label: t.account.stats.matches, value: String(matches), icon: Gamepad2, tone: "text-cyan-300" },
    { label: t.account.stats.wins, value: String(wins), icon: ShieldCheck, tone: "text-emerald-300" },
    { label: t.account.stats.losses, value: String(losses), icon: Swords, tone: "text-rose-300" },
    { label: t.account.stats.winRate, value: winRate, icon: TrendingUp, tone: "text-lime-300" },
    { label: t.account.stats.currentStreak, value: t.account.stats.notEnoughData, icon: Flame, tone: "text-orange-300" },
  ]

  const activityItems = [
    ...teamsList.map((team) => ({
      id: `team-${team.id}`,
      date: team.created_at,
      title: t.account.activity.teamCreated,
      body: team.name,
      icon: Users,
      logoUrl: null as string | null,
    })),
    ...(registrations ?? []).map((registration: any) => ({
      id: `registration-${registration.id}`,
      date: registration.created_at,
      title: t.account.activity.registrationSubmitted,
      body: registration.tournaments?.name || t.profile.meta.tournament,
      icon: Calendar,
      logoUrl: null as string | null,
    })),
    ...notifications.map((notification) => {
      const { title, message } = getLocalizedNotification(notification, lang)
      
      // Resolve logo URL from joined teams (supporting both object and array formats)
      let logoUrl: string | null = null
      if (notification.teams) {
        if (Array.isArray(notification.teams)) {
          logoUrl = notification.teams[0]?.logo_url || null
        } else {
          logoUrl = notification.teams.logo_url || null
        }
      }

      // Choose notification icon
      let itemIcon = Bell
      if (notification.type === "player_approved" || notification.type === "registration_approved") {
        itemIcon = UserCheck
      } else if (notification.type === "player_rejected" || notification.type === "registration_rejected") {
        itemIcon = ShieldAlert
      } else if (notification.type === "team_approved" || notification.type === "team_rejected") {
        itemIcon = Users
      } else if (notification.type === "match_scheduled") {
        itemIcon = Calendar
      }

      return {
        id: `notification-${notification.id}`,
        date: notification.created_at,
        title,
        body: message,
        icon: itemIcon,
        logoUrl,
      }
    }),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
    .slice(0, 6)
  const manageableTeams = teamsList.filter((team) => team.role === "Owner" || team.role === "Captain")
  const accountTabs: ProfileTabItem<AccountTab>[] = [
    { id: "overview", label: t.account.tabs.overview },
    { id: "teams", label: t.account.tabs.teams },
    { id: "registrations", label: t.account.tabs.registrations },
    { id: "invites", label: t.account.tabs.invites },
    { id: "notifications", label: t.account.tabs.notifications },
    { id: "settings", label: t.account.tabs.settings },
  ]
  const [activeTab, setActiveTab] = useProfileTab(
    ["overview", "teams", "registrations", "invites", "notifications", "settings"] as const,
    "overview",
  )

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),linear-gradient(135deg,rgba(9,20,19,0.94),rgba(6,10,12,0.88))] p-5 shadow-[0_0_80px_rgba(16,185,129,0.13)] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="absolute right-0 top-0 hidden items-center gap-3 lg:flex">
            <EditProfileForm
              initialNickname={player.nickname}
              initialRealName={player.real_name}
              initialRegion={player.region}
              variant="modal"
              buttonClassName="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.25)] cursor-pointer"
            />
            <Link
              href={`/players/${player.id}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              {t.account.viewPublicProfile}
            </Link>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <AccountAvatar
              url={accountAvatarUrl}
              displayName={displayName}
              className="h-24 w-24 sm:h-28 sm:w-28"
              textClassName="text-4xl"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-300">{t.account.dashboard}</p>
              <h1 className="glow-text mt-2 truncate text-4xl font-black text-white sm:text-5xl">{displayName}</h1>
              {player.real_name && player.real_name.trim() && player.real_name.trim().toLowerCase() !== displayName.trim().toLowerCase() && (
                <p className="mt-1 truncate text-sm font-medium text-white/80">{player.real_name.trim()}</p>
              )}
              <p className="mt-2 truncate text-sm text-white/60">{t.account.discordLabel}: {userProfile.discord_username}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${statusBadgeClass(player.status || "pending")}`}>
                  {displayStatus(player.status)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/75">
                  <Globe className="h-3.5 w-3.5 text-emerald-300" />
                  {player.region || t.account.notSpecified}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px] lg:pt-14">
            <HeroMetric icon={Trophy} label={t.account.eloRating} value={String(rating)} />
            <HeroMetric icon={Crosshair} label={t.account.globalSeed} value={seedLabel} />
            <HeroMetric icon={Globe} label={t.account.region} value={player.region || t.account.notSpecified} />
            <HeroMetric icon={ShieldCheck} label={t.account.status} value={displayStatus(player.status)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            <EditProfileForm
              initialNickname={player.nickname}
              initialRealName={player.real_name}
              initialRegion={player.region}
              variant="modal"
              buttonClassName="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.25)] cursor-pointer"
            />
            <Link
              href={`/players/${player.id}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              {t.account.viewPublicProfile}
            </Link>
          </div>
        </div>
      </div>

      <ProfileTabs tabs={accountTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && (
      <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.tone}`} />
            </div>
            <div className="mt-3 min-h-9 text-2xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">{t.account.quickActions.title}</p>
            <h2 className="mt-2 text-xl font-bold text-white">{t.account.quickActions.subtitle}</h2>
          </div>
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:flex-wrap sm:items-center sm:justify-start lg:justify-end lg:w-auto">
            <ActionLink href="/tournament" icon={Calendar} label={t.account.quickActions.browseTournaments} primary />
            <ActionLink href={`/players/${player.id}`} icon={ExternalLink} label={t.account.viewPublicProfile} />
            {manageableTeams.length === 1 ? (
              <ActionLink href={`/teams/${manageableTeams[0].id}`} icon={Users} label={t.account.manageTeamFull} />
            ) : manageableTeams.length > 1 ? (
              <ActionButton icon={Users} label={t.account.myTeams} onClick={() => setActiveTab("teams")} />
            ) : (
              <CreateTeamModal
                hasApprovedPlayer={player.status === "approved"}
                isLoggedIn={true}
                initialError={searchParams?.teamError}
                initialSuccess={searchParams?.teamSuccess}
              />
            )}
          </div>
        </div>
      </div>
      </>
      )}

      <div className="mt-6 space-y-6">
        <div className="space-y-6">
          {/* Invites Feedback Alerts */}
          {successMessage && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200 shadow-md">
              ✓ {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-2.5 text-xs text-red-200 shadow-md">
              ✗ {errorMessage}
            </div>
          )}

          {/* Team Invites Panel */}
          {activeTab === "invites" && (
          <>
          <DashboardPanel title={t.account.invites.title} description={t.account.invites.description}>
            {invitesList.length === 0 ? (
              <EmptyState icon={Inbox} title={t.account.invites.emptyStateTitle} body={t.account.invites.emptyStateBody} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {invitesList.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-emerald-400/30 hover:bg-white/[0.04] flex flex-col justify-between">
                    <div>
                      <h3 className="truncate text-base font-bold text-white">{invite.team_name}</h3>
                      <p className="mt-1.5 text-xs text-white/55">
                        {t.account.invites.invitedBy} <span className="font-semibold text-emerald-300">{invite.inviter_name}</span>
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/5 pt-4">
                      <button
                        onClick={async () => {
                          await acceptTeamInvite(invite.id)
                        }}
                        className="rounded-full bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-300 cursor-pointer shadow-md shadow-emerald-950/20"
                      >
                        {t.account.invites.acceptButton}
                      </button>
                      <button
                        onClick={async () => {
                          await declineTeamInvite(invite.id)
                        }}
                        className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 cursor-pointer transition"
                      >
                        {t.account.invites.declineButton}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title={t.account.joinRequests.myTeamRequests} description={t.account.joinRequests.myTeamRequestsDescription}>
            {joinRequestsList.length === 0 ? (
              <EmptyState icon={UserCheck} title={t.account.joinRequests.noTeamRequestsYet} body={t.account.joinRequests.noTeamRequestsYetBody} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {joinRequestsList.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-emerald-400/30 hover:bg-white/[0.04]">
                    <div className="flex items-start gap-4">
                      <TeamLogo url={request.team_logo_url} name={request.team_name} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/teams/${request.team_id}`} className="truncate text-base font-bold text-white transition hover:text-emerald-300">
                          {request.team_name}
                        </Link>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(request.status)}`}>
                            {displayJoinRequestStatus(request.status, t)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs font-semibold text-white/45">
                        {request.created_at ? formatActivityDate(request.created_at, lang) : t.account.notSpecified}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/teams/${request.team_id}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t.account.joinRequests.viewTeam}
                        </Link>
                        {request.status === "pending" && (
                          <form action={cancelTeamJoinRequest}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <input type="hidden" name="team_id" value={request.team_id} />
                            <input type="hidden" name="redirect_to" value="/account" />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              {t.account.joinRequests.cancelRequest}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>
          </>
          )}

          {activeTab === "teams" && (
          <DashboardPanel id="my-teams" title={t.account.myTeams} description={t.account.teamsDescription}>
            {teamsList.length === 0 ? (
              <EmptyState icon={Users} title={t.account.emptyStates.noTeamsTitle} body={t.account.noTeams}>
                <CreateTeamModal
                  hasApprovedPlayer={player.status === "approved"}
                  isLoggedIn={true}
                  initialError={searchParams?.teamError}
                  initialSuccess={searchParams?.teamSuccess}
                />
              </EmptyState>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {teamsList.map((team) => (
                  <div key={team.id} className="rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-emerald-400/30 hover:bg-white/[0.04]">
                    <div className="flex items-start gap-4">
                      <TeamLogo url={team.logo_url} name={team.name} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-white">{team.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass(team.role)}`}>
                            {displayRole(team.role)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(team.status)}`}>
                            {displayStatus(team.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/55">
                        <Users className="h-3.5 w-3.5 text-emerald-300" />
                        {team.roster_count} {t.account.rosterCountLabel}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {(team.role === "Owner" || team.role === "Captain") && (
                          <Link href={`/teams/${team.id}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-300">
                            <Settings className="h-3 w-3" />
                            {t.account.manageTeamFull}
                          </Link>
                        )}
                        {team.role.toLowerCase() === "owner" ? (
                          <button
                            disabled
                            title={t.account.roster.errors.ownerCannotLeave}
                            className="inline-flex items-center gap-1 rounded-full border border-red-500/10 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-300/40 opacity-50 cursor-not-allowed"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            {t.account.roster.leaveTeam}
                          </button>
                        ) : team.is_locked ? (
                          <button
                            disabled
                            title={t.account.roster.errors.rosterLocked}
                            className="inline-flex items-center gap-1 rounded-full border border-red-500/10 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-300/40 opacity-50 cursor-not-allowed"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            {t.account.roster.leaveTeam}
                          </button>
                        ) : (
                          <form action={leaveTeam} onSubmit={(e) => { if (!confirm(t.account.roster.confirmLeave)) e.preventDefault(); }} className="inline-block">
                            <input type="hidden" name="team_id" value={team.id} />
                            <input type="hidden" name="redirect_to" value="/account" />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20 cursor-pointer"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              {t.account.roster.leaveTeam}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>
          )}

          {activeTab === "registrations" && (
          <DashboardPanel title={t.account.myRegistrations} description={t.account.registrationsDescription}>

            {registrations && registrations.length > 0 ? (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse min-w-[600px] sm:min-w-0">
                  <thead className="hidden sm:table-header-group">
                    <tr className="text-white/40 uppercase tracking-wider border-b border-white/5">
                      <th className="pb-3 font-semibold">{t.account.tableTournament}</th>
                      <th className="pb-3 font-semibold">{t.account.tableType}</th>
                      <th className="pb-3 font-semibold">{t.account.tableStatus}</th>
                      <th className="pb-3 font-semibold">{t.account.checkInState}</th>
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
                        <tr key={reg.id} className="block rounded-2xl border border-white/5 bg-white/[0.025] p-4 text-white/80 transition hover:bg-white/[0.04] sm:table-row sm:border-0 sm:bg-transparent sm:p-0">
                          <td className="block py-1.5 font-bold text-white sm:table-cell sm:py-3.5">
                            {reg.tournaments?.name || t.profile.meta.tournament}
                          </td>
                          <td className="block py-1.5 capitalize sm:table-cell sm:py-3.5">{displayRegType}</td>
                          <td className="block py-1.5 sm:table-cell sm:py-3.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(reg.status)}`}>
                              {displayRegStatus}
                            </span>
                          </td>
                          <td className="block py-1.5 sm:table-cell sm:py-3.5">
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                              {reg.check_in_status === "checked_in" ? t.account.checkedIn : t.account.notCheckedIn}
                            </span>
                          </td>
                          <td className="block py-1.5 font-medium sm:table-cell sm:py-3.5 sm:text-right">
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
              <EmptyState icon={Gamepad2} title={t.account.emptyStates.noRegistrationsTitle} body={t.account.noRegistrations}>
                <Link href="/tournament" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-300">
                  <Calendar className="h-4 w-4" />
                  {t.account.quickActions.browseTournaments}
                </Link>
              </EmptyState>
            )}
          </DashboardPanel>
          )}

          {activeTab === "settings" && (
          <DashboardPanel title={t.account.tabs.settings} description={t.account.settingsDescription}>
            <div className="grid gap-3 sm:grid-cols-2">
              <EditProfileForm
                initialNickname={player.nickname}
                initialRealName={player.real_name}
                initialRegion={player.region}
                variant="modal"
                buttonClassName="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.25)] cursor-pointer"
              />
              <form action={refreshDiscordProfile}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
                >
                  {t.account.refreshDiscordProfile}
                </button>
              </form>
              <Link
                href={`/players/${player.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                {t.account.viewPublicProfile}
              </Link>
            </div>
          </DashboardPanel>
          )}

        </div>

        <div className="space-y-6">
          {activeTab === "notifications" && (
          <div className="glass-card rounded-2xl border border-white/5 p-6">
            <AccountNotificationsList initialNotifications={notifications} />
          </div>
          )}

          {activeTab === "overview" && (
          <DashboardPanel title={t.account.activity.title} description={t.account.activity.description}>
            {activityItems.length > 0 ? (
              <div className="space-y-4">
                {activityItems.map((item) => (
                  <div key={item.id} className="relative flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                      {item.logoUrl ? (
                        <img
                          src={item.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <item.icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
                      <p className="truncate text-sm font-bold text-white">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">{item.body}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                        {formatActivityDate(item.date, lang)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Inbox} title={t.account.activity.emptyTitle} body={t.account.activity.emptyBody} />
            )}
          </DashboardPanel>
          )}
        </div>
      </div>
    </section>
  )
}

type AccountTab = "overview" | "teams" | "registrations" | "invites" | "notifications" | "settings"

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        <Icon className="h-3.5 w-3.5 text-emerald-300" />
        {label}
      </div>
      <div className="mt-2 truncate text-lg font-black text-white">{value}</div>
    </div>
  )
}

function DashboardPanel({
  id,
  title,
  description,
  children,
}: {
  id?: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className="glass-card scroll-mt-28 rounded-2xl border border-white/5 p-5 sm:p-6">
      <div className="mb-5 border-b border-white/5 pb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-white/40">{description}</p>
      </div>
      {children}
    </section>
  )
}

function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof Trophy
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-9 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-white/45">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

function TeamLogo({ url, name }: { url: string | null; name: string }) {
  const initial = name.slice(0, 1).toUpperCase()

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-14 w-14 shrink-0 rounded-2xl border border-emerald-400/20 object-cover"
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xl font-black text-emerald-300">
      {initial}
    </div>
  )
}

function ActionLink({
  href,
  icon: Icon,
  label,
  primary = false,
}: {
  href: string
  icon: typeof Trophy
  label: string
  primary?: boolean
}) {
  const className = primary
    ? "inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300"
    : "inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"

  return (
    <Link href={href} className={className}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Trophy
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  )
}

function formatActivityDate(date: string | null, lang: string) {
  if (!date) return ""

  return new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

function displayJoinRequestStatus(status: string | null | undefined, t: ReturnType<typeof useLanguage>["t"]) {
  if (status === "approved") return t.account.joinRequests.statusApproved
  if (status === "rejected") return t.account.joinRequests.statusRejected
  if (status === "cancelled") return t.account.joinRequests.statusCancelled
  if (status === "expired") return t.account.joinRequests.statusExpired
  return t.account.joinRequests.statusPending
}
