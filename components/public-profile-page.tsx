"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Gamepad2,
  Medal,
  Shield,
  Swords,
  TrendingUp,
  Trophy,
  User,
  Users,
} from "lucide-react"
import { AchievementsSection } from "@/components/achievements-section"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"
import { ProfileTabs, useProfileTab, type ProfileTabItem } from "@/components/profile-tabs"
import { getPlayerAchievements, getTeamAchievements } from "@/lib/data/achievements"
import type { PublicPlayerTeam, PublicProfileData, PublicTeamMember } from "@/lib/data/profiles"
import type { UserProfile } from "@/lib/auth/user-profile"
import { withAvatarCacheBust } from "@/lib/avatar"

type PublicProfilePageProps = {
  data: PublicProfileData
  userProfile?: UserProfile | null
  children?: ReactNode
}

export function PublicProfilePage({ data, userProfile = null, children }: PublicProfilePageProps) {
  const { t } = useLanguage()
  const { profile } = data
  const isTeam = profile.kind === "team"
  const rating = getProfileRating(data)
  const rankPosition = getProfileRankPosition(data)
  const backHref = isTeam ? "/teams" : "/players"
  const backLabel = isTeam ? t.profile.backToTeams : t.profile.backToPlayers
  
  const connectionsTitle = isTeam ? t.profile.connectionsTeams : t.profile.connectionsPlayers
  const emptyConnections = isTeam ? t.profile.emptyConnectionsTeams : t.profile.emptyConnectionsPlayers

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <MotionProvider>
        <Navbar homeHref="/" navHrefPrefix="/" participantLabel="Teams" userProfile={userProfile} />
        <section className="relative z-10 px-4 pb-16 pt-28 md:pt-36">
          <div className="mx-auto max-w-6xl">
            <Link
              href={backHref}
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>

            <div className="glass-card overflow-hidden rounded-2xl">
              <div
                className="flex flex-col gap-8 px-6 py-8 md:flex-row md:items-center md:px-8"
                style={{ background: "oklch(0.78 0.18 165 / 0.04)" }}
              >
                <ProfileImage
                  imageUrl={profile.image_url}
                  imageVersion={profile.image_updated_at}
                  name={profile.display_name}
                  kind={profile.kind}
                />

                <div className="min-w-0 flex-1">
                  <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
                    {isTeam ? t.profile.teamProfile : t.profile.playerProfile}
                  </p>
                  <h1 className="glow-text break-words text-4xl font-bold text-foreground md:text-6xl flex flex-wrap items-center gap-3">
                    {profile.display_name}
                    {isTeam && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                        [{profile.display_name.split(/\s+/).filter(Boolean).map(p => p[0]).join("").slice(0, 3).toUpperCase()}]
                      </span>
                    )}
                    {profile.status && profile.status !== "approved" && (
                      <span className={`inline-block rounded-xl px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                        profile.status === "rejected"
                          ? "bg-red-500/10 border border-red-500/25 text-red-400"
                          : "bg-amber-500/10 border border-amber-500/25 text-amber-400 animate-pulse"
                      }`}>
                        {profile.status === "rejected" ? t.profile.meta.rejected : t.profile.meta.pending}
                      </span>
                    )}
                    {!isTeam && profile.discord_username && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/25 px-2.5 py-0.5 text-xs font-semibold text-[#5865F2]" title={t.profile.discordLinked}>
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 127.14 96.36">
                          <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.4-5c.88-.65,1.73-1.34,2.54-2a75.7,75.7,0,0,0,72.76,0c.81.71,1.66,1.4,2.54,2a68.43,68.43,0,0,1-10.4,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.81,49.33,123.36,26.54,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                        </svg>
                        {profile.discord_username}
                      </span>
                    )}
                  </h1>
                  {profile.nickname && profile.nickname !== profile.name ? (
                    <p className="mt-3 break-words text-sm text-muted-foreground">
                      {profile.name}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap gap-3 text-sm">
                    <MetaPill
                      label={t.profile.meta.tournament}
                      value={data.tournamentName}
                      empty={isTeam ? t.profile.meta.tournamentTba : t.profile.meta.notRegistered}
                    />
                    <MetaPill label={t.profile.meta.region} value={profile.region} empty={t.profile.meta.regionTba} />
                    <MetaPill
                      label={t.profile.meta.seed}
                      value={profile.seed ? `#${profile.seed}` : null}
                      empty={t.profile.meta.seedTba}
                    />
                    {isTeam && profile.captain_name && (
                      <MetaPill
                        label={t.profile.meta.captain}
                        value={profile.captain_name}
                      />
                    )}
                    {isTeam && profile.member_count !== null && (
                      <MetaPill
                        label={t.profile.meta.members}
                        value={String(profile.member_count)}
                      />
                    )}
                    <MetaPill label={t.profile.meta.rating} value={String(rating)} />
                    <MetaPill
                      label={t.profile.meta.rank}
                      value={rankPosition ? `#${rankPosition}` : null}
                      empty={t.profile.meta.unranked}
                    />
                    <MetaPill label={t.profile.meta.record} value={`${data.stats.wins}W / ${data.stats.losses}L`} />
                  </div>
                </div>
              </div>
            </div>
            {isTeam ? (
              <TeamProfileContent data={data} managerControls={children} />
            ) : (
              <PlayerProfileContent data={data} ownerControls={children} />
            )}
          </div>
        </section>

      </MotionProvider>
      <Footer />
    </main>
  )
}

function StatsSection({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const { stats } = data
  const rating = getProfileRating(data)
  const rankPosition = getProfileRankPosition(data)
  const streakLabel =
    stats.currentStreak.result && stats.currentStreak.count > 0
      ? `${stats.currentStreak.count}${stats.currentStreak.result === "win" ? "W" : "L"}`
      : t.profile.stats.none

  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={t.profile.statsHeading} title={t.profile.performance} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t.profile.stats.rating} value={String(rating)} />
          <StatCard label={t.profile.stats.rank} value={rankPosition ? `#${rankPosition}` : t.profile.stats.unranked} />
          <StatCard label={t.profile.stats.wins} value={String(stats.wins)} />
          <StatCard label={t.profile.stats.losses} value={String(stats.losses)} />
          <StatCard label={t.profile.stats.matches} value={String(stats.totalMatches)} />
          <StatCard label={t.profile.stats.winRate} value={`${stats.winRate}%`} />
          <StatCard label={t.profile.stats.streak} value={streakLabel} />
        </div>

        <div className="mt-8">
          {stats.recentHistory.length === 0 ? (
            <EmptyState>{t.profile.noHistory}</EmptyState>
          ) : (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div
                className="px-6 py-4"
                style={{ background: "oklch(0.78 0.18 165 / 0.05)" }}
              >
                <h3 className="text-lg font-bold text-foreground">{t.profile.recentHistory}</h3>
              </div>
              <div className="divide-y divide-border/50">
                {stats.recentHistory.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-foreground">
                        {t.profile.vs} {match.opponent}
                      </p>
                      <p className="mt-1 text-xs tracking-wider uppercase text-muted-foreground">
                        {match.round}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {match.scoreline ? (
                        <span className="font-mono text-muted-foreground">
                          {match.scoreline}
                        </span>
                      ) : null}
                      <span
                        className={
                          match.result === "win"
                            ? "rounded-full px-3 py-1 text-xs font-medium text-primary"
                            : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
                        }
                        style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
                      >
                        {match.result === "win" ? t.profile.win : t.profile.loss}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PlayerProfileContent({
  data,
  ownerControls,
}: {
  data: PublicProfileData
  ownerControls?: ReactNode
}) {
  const { t } = useLanguage()
  const tabs: ProfileTabItem<PlayerProfileTab>[] = [
    { id: "overview", label: t.profile.tabs.overview },
    { id: "team", label: t.profile.tabs.team },
    { id: "stats", label: t.profile.tabs.stats },
    { id: "matches", label: t.profile.tabs.matches },
    { id: "tournaments", label: t.profile.tabs.tournaments },
    { id: "achievements", label: t.profile.tabs.achievements },
  ]
  const [activeTab, setActiveTab] = useProfileTab(
    ["overview", "team", "stats", "matches", "tournaments", "achievements"] as const,
    "overview",
  )

  return (
    <div className="mt-6 space-y-6">
      <ProfileTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "overview" && (
        <>
          {ownerControls}
          <PlayerOverviewPanel data={data} />
        </>
      )}
      {activeTab === "team" && <PlayerCurrentTeams data={data} />}
      {activeTab === "stats" && (
        <>
          <PlayerStatsPanel data={data} />
          <PlayerGameStats data={data} />
        </>
      )}
      {activeTab === "matches" && <PlayerRecentMatches data={data} />}
      {activeTab === "tournaments" && <PlayerTournamentHistory data={data} />}
      {activeTab === "achievements" && <PlayerAchievements data={data} />}
    </div>
  )
}

type PlayerProfileTab = "overview" | "team" | "stats" | "matches" | "tournaments" | "achievements"

function PlayerOverviewPanel({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const stats = getPlayerProfileStats(data)
  const rating = getProfileRating(data)
  const rankPosition = getProfileRankPosition(data)
  const teamsCount = data.playerTeams?.length ?? 0

  return (
    <TeamPanel
      eyebrow={t.profile.tabs.overview}
      title={t.profile.playerPublic.overviewTitle}
      description={t.profile.playerPublic.overviewDescription}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TeamMetric icon={Trophy} label={t.profile.stats.rating} value={String(rating)} />
        <TeamMetric icon={Medal} label={t.profile.stats.rank} value={rankPosition ? `#${rankPosition}` : t.profile.stats.unranked} />
        <TeamMetric icon={Gamepad2} label={t.profile.playerPublic.matchesPlayed} value={String(stats.matches)} />
        <TeamMetric icon={Users} label={t.profile.tabs.team} value={String(teamsCount)} />
      </div>
    </TeamPanel>
  )
}

function PlayerCurrentTeams({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const teams = data.playerTeams ?? []

  return (
    <TeamPanel
      eyebrow={t.profile.playerPublic.currentTeamEyebrow}
      title={t.profile.playerPublic.currentTeamTitle}
      description={t.profile.playerPublic.currentTeamDescription}
    >
      {teams.length === 0 ? (
        <TeamEmptyState icon={Users} message={t.profile.playerPublic.noTeamLinked} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={team.href}
              className="group flex min-w-0 items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-4 transition hover:border-emerald-400/25 hover:bg-white/[0.035]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-white/45">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-bold text-white transition group-hover:text-emerald-300">
                      {team.name}
                    </p>
                    <RoleBadge role={team.role} />
                  </div>
                  {team.status && (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                      {displayStatusLabel(team.status, t)}
                    </p>
                  )}
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/45 transition group-hover:border-emerald-400/20 group-hover:text-emerald-300 sm:inline-flex">
                {t.profile.playerPublic.viewTeam}
                <ExternalLink className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </TeamPanel>
  )
}

function PlayerStatsPanel({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const stats = getPlayerProfileStats(data)
  const bestPlacement = getBestPlayerPlacement(data)
  const rating = getProfileRating(data)

  return (
    <TeamPanel
      eyebrow={t.profile.playerPublic.statsEyebrow}
      title={t.profile.playerPublic.statsTitle}
      description={t.profile.playerPublic.statsDescription}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TeamMetric icon={Gamepad2} label={t.profile.playerPublic.matchesPlayed} value={String(stats.matches)} />
        <TeamMetric icon={Trophy} label={t.profile.stats.wins} value={String(stats.wins)} />
        <TeamMetric icon={Swords} label={t.profile.stats.losses} value={String(stats.losses)} />
        <TeamMetric icon={TrendingUp} label={t.profile.stats.winRate} value={`${stats.winRate}%`} />
        <TeamMetric icon={Shield} label={t.profile.stats.streak} value={stats.streak} />
        <TeamMetric icon={Calendar} label={t.profile.teamPublic.tournamentsPlayed} value={String(data.playerTournamentHistory?.length ?? 0)} />
        <TeamMetric icon={Medal} label={t.profile.teamPublic.bestPlacement} value={bestPlacement ? `#${bestPlacement}` : t.profile.playerPublic.notEnoughData} />
        <TeamMetric icon={Trophy} label={t.profile.stats.rating} value={String(rating)} />
      </div>
    </TeamPanel>
  )
}

function PlayerGameStats({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const gameStats = data.playerGameStats ?? []

  return (
    <TeamPanel
      eyebrow={t.profile.playerPublic.gameStatsEyebrow}
      title={t.profile.playerPublic.gameStatsTitle}
      description={t.profile.playerPublic.gameStatsDescription}
    >
      {gameStats.length === 0 ? (
        <TeamEmptyState icon={Gamepad2} message={t.profile.playerPublic.noGameStats} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {gameStats.map((item) => (
            <div key={item.game} className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="break-words text-sm font-bold text-white">{item.game}</h3>
                {item.rating !== null && (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    ELO {item.rating}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <MiniMetric label={t.profile.playerPublic.matchesShort} value={String(item.matches)} />
                <MiniMetric label={t.profile.stats.wins} value={String(item.wins)} />
                <MiniMetric label={t.profile.stats.losses} value={String(item.losses)} />
                <MiniMetric label={t.profile.stats.winRate} value={`${item.winRate}%`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </TeamPanel>
  )
}

function PlayerRecentMatches({ data }: { data: PublicProfileData }) {
  const { t, lang } = useLanguage()
  const matches = data.playerMatchHistory ?? []

  return (
    <TeamPanel
      eyebrow={t.profile.recentMatchesEyebrow}
      title={t.profile.recentMatchesTitle}
      description={t.profile.playerPublic.matchesDescription}
    >
      {matches.length === 0 ? (
        <TeamEmptyState icon={Swords} message={t.profile.playerPublic.noMatches} />
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-white">
                  {t.profile.vs} {match.opponent}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {match.tournament_name}
                  {match.game ? ` · ${match.game}` : ""}
                  {match.date ? ` · ${formatProfileDate(match.date, lang)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {match.scoreline && <span className="font-mono text-white/55">{match.scoreline}</span>}
                <ResultBadge result={match.result} />
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-white/45">
                  {match.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeamPanel>
  )
}

function PlayerTournamentHistory({ data }: { data: PublicProfileData }) {
  const { t, lang } = useLanguage()
  const history = data.playerTournamentHistory ?? []

  return (
    <TeamPanel
      eyebrow={t.profile.teamPublic.tournamentHistoryEyebrow}
      title={t.profile.teamPublic.tournamentHistoryTitle}
      description={t.profile.playerPublic.tournamentHistoryDescription}
    >
      {history.length === 0 ? (
        <TeamEmptyState icon={Calendar} message={t.profile.playerPublic.noTournaments} />
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-xl border border-white/5 bg-black/20 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-white">{item.tournament_name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  {item.game && <span>{item.game}</span>}
                  <span>{item.participant_type === "team" ? t.profile.meta.team : t.profile.meta.player}</span>
                  {item.team_name && <span>{item.team_name}</span>}
                  {item.registration_status && <span>{displayStatusLabel(item.registration_status, t)}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {item.placement && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                    #{item.placement}
                  </span>
                )}
                <span className="text-xs font-semibold text-white/45">
                  {formatProfileDate(item.event_date ?? item.created_at, lang) ?? t.profile.meta.tba}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeamPanel>
  )
}

function PlayerAchievements({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const achievements = getPlayerAchievements(data)

  return (
    <TeamPanel
      eyebrow={t.profile.teamPublic.achievementsEyebrow}
      title={t.profile.teamPublic.achievementsTitle}
      description={t.profile.playerPublic.achievementsDescription}
    >
      <AchievementsSection achievements={achievements} emptyMessage={t.profile.playerPublic.noAchievements} />
    </TeamPanel>
  )
}

function TeamProfileContent({
  data,
  managerControls,
}: {
  data: PublicProfileData
  managerControls?: ReactNode
}) {
  const { t } = useLanguage()
  const tabs: ProfileTabItem<TeamProfileTab>[] = [
    { id: "overview", label: t.profile.tabs.overview },
    { id: "roster", label: t.profile.tabs.roster },
    { id: "stats", label: t.profile.tabs.stats },
    { id: "matches", label: t.profile.tabs.matches },
    { id: "tournaments", label: t.profile.tabs.tournaments },
    { id: "achievements", label: t.profile.tabs.achievements },
  ]
  const [activeTab, setActiveTab] = useProfileTab(
    ["overview", "roster", "stats", "matches", "tournaments", "achievements"] as const,
    "overview",
  )

  return (
    <div className="mt-6 space-y-6">
      <ProfileTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "overview" && <TeamQuickMeta data={data} />}
      {activeTab === "roster" && (
        <>
          <TeamRosterSection data={data} />
          {managerControls}
        </>
      )}
      {activeTab === "stats" && <TeamStatsPanel data={data} />}
      {activeTab === "matches" && <TeamRecentMatches data={data} />}
      {activeTab === "tournaments" && <TeamTournamentHistory data={data} />}
      {activeTab === "achievements" && <TeamAchievements data={data} />}
    </div>
  )
}

type TeamProfileTab = "overview" | "roster" | "stats" | "matches" | "tournaments" | "achievements"

function TeamQuickMeta({ data }: { data: PublicProfileData }) {
  const { t, lang } = useLanguage()
  const members = data.teamMembers ?? []
  const mainPlayers = members.filter((member) => member.role !== "substitute").length
  const substitutes = members.filter((member) => member.role === "substitute").length
  const createdAt = formatProfileDate(data.profile.created_at, lang)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TeamMetric icon={Users} label={t.profile.teamPublic.members} value={String(members.length)} />
      <TeamMetric icon={Shield} label={t.profile.teamPublic.mainPlayers} value={String(mainPlayers)} />
      <TeamMetric icon={User} label={t.profile.teamPublic.substitutes} value={String(substitutes)} />
      <TeamMetric icon={Calendar} label={t.profile.teamPublic.createdAt} value={createdAt ?? t.profile.meta.tba} />
    </div>
  )
}

function TeamRosterSection({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const members = data.teamMembers ?? []

  return (
    <TeamPanel
      eyebrow={t.profile.teamPublic.rosterEyebrow}
      title={t.profile.teamPublic.rosterTitle}
      description={t.profile.teamPublic.rosterDescription}
    >
      {members.length === 0 ? (
        <TeamEmptyState icon={Users} message={t.profile.emptyConnectionsTeams} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((member) => (
            <TeamRosterCard key={member.player_id} member={member} />
          ))}
        </div>
      )}
    </TeamPanel>
  )
}

function TeamRosterCard({ member }: { member: PublicTeamMember }) {
  const { t } = useLanguage()
  const avatarUrl = withAvatarCacheBust(member.avatar_url, null)

  return (
    <Link
      href={member.href}
      className="group flex min-w-0 items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-4 transition hover:border-emerald-400/25 hover:bg-white/[0.035]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-black text-white/45">
            {member.display_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-bold text-white transition group-hover:text-emerald-300">
              {member.display_name}
            </p>
            <RoleBadge role={member.role} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/45">
            {member.real_name && <span className="break-words">{member.real_name}</span>}
            {member.region && <span className="break-words">{member.region}</span>}
          </div>
        </div>
      </div>
      <span className="hidden shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/45 transition group-hover:border-emerald-400/20 group-hover:text-emerald-300 sm:inline-flex">
        {t.profile.teamPublic.viewPlayer}
        <ExternalLink className="h-3 w-3" />
      </span>
    </Link>
  )
}

function TeamStatsPanel({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const { stats } = data
  const tournamentsPlayed = data.teamTournamentHistory?.length ?? 0
  const placements = (data.teamTournamentHistory ?? [])
    .map((item) => item.placement)
    .filter((placement): placement is number => placement !== null)
  const bestPlacement = placements.length > 0 ? Math.min(...placements) : null
  const streakLabel =
    stats.currentStreak.result && stats.currentStreak.count > 0
      ? `${stats.currentStreak.count}${stats.currentStreak.result === "win" ? "W" : "L"}`
      : t.profile.stats.none

  return (
    <TeamPanel
      eyebrow={t.profile.teamPublic.statsEyebrow}
      title={t.profile.teamPublic.statsTitle}
      description={t.profile.teamPublic.statsDescription}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TeamMetric icon={Gamepad2} label={t.profile.teamPublic.matchesPlayed} value={String(stats.totalMatches)} />
        <TeamMetric icon={Trophy} label={t.profile.stats.wins} value={String(stats.wins)} />
        <TeamMetric icon={Swords} label={t.profile.stats.losses} value={String(stats.losses)} />
        <TeamMetric icon={TrendingUp} label={t.profile.stats.winRate} value={`${stats.winRate}%`} />
        <TeamMetric icon={Shield} label={t.profile.stats.streak} value={streakLabel} />
        <TeamMetric icon={Calendar} label={t.profile.teamPublic.tournamentsPlayed} value={String(tournamentsPlayed)} />
        <TeamMetric
          icon={Medal}
          label={t.profile.teamPublic.bestPlacement}
          value={bestPlacement ? `#${bestPlacement}` : t.profile.teamPublic.notEnoughData}
        />
      </div>
    </TeamPanel>
  )
}

function TeamRecentMatches({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const recent = data.stats.recentHistory.slice(0, 8)

  return (
    <TeamPanel
      eyebrow={t.profile.recentMatchesEyebrow}
      title={t.profile.recentMatchesTitle}
      description={t.profile.teamPublic.matchesDescription}
    >
      {recent.length === 0 ? (
        <TeamEmptyState icon={Swords} message={t.profile.teamPublic.noCompletedMatches} />
      ) : (
        <div className="space-y-3">
          {recent.map((match) => (
            <div
              key={match.id}
              className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-white">
                  {t.profile.vs} {match.opponent}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {data.tournamentName ?? t.profile.meta.tournamentTba} · {match.round}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {match.scoreline && <span className="font-mono text-white/55">{match.scoreline}</span>}
                <span
                  className={
                    match.result === "win"
                      ? "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-bold text-emerald-300"
                      : "rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 font-bold text-red-300"
                  }
                >
                  {match.result === "win" ? t.profile.win : t.profile.loss}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeamPanel>
  )
}

function TeamTournamentHistory({ data }: { data: PublicProfileData }) {
  const { t, lang } = useLanguage()
  const history = data.teamTournamentHistory ?? []

  return (
    <TeamPanel
      eyebrow={t.profile.teamPublic.tournamentHistoryEyebrow}
      title={t.profile.teamPublic.tournamentHistoryTitle}
      description={t.profile.teamPublic.tournamentHistoryDescription}
    >
      {history.length === 0 ? (
        <TeamEmptyState icon={Calendar} message={t.profile.teamPublic.noTournaments} />
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-xl border border-white/5 bg-black/20 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-white">{item.tournament_name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  {item.game && <span>{item.game}</span>}
                  {item.tournament_status && <span>{displayStatusLabel(item.tournament_status, t)}</span>}
                  {item.registration_status && <span>{displayStatusLabel(item.registration_status, t)}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {item.placement && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                    #{item.placement}
                  </span>
                )}
                <span className="text-xs font-semibold text-white/45">
                  {formatProfileDate(item.event_date ?? item.created_at, lang) ?? t.profile.meta.tba}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeamPanel>
  )
}

function TeamAchievements({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const achievements = getTeamAchievements(data)

  return (
    <TeamPanel
      eyebrow={t.profile.teamPublic.achievementsEyebrow}
      title={t.profile.teamPublic.achievementsTitle}
      description={t.profile.teamPublic.achievementsDescription}
    >
      <AchievementsSection achievements={achievements} emptyMessage={t.profile.teamPublic.noAchievements} />
    </TeamPanel>
  )
}

function TeamPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-white/[0.025] p-5 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur sm:p-6">
      <div className="mb-5 border-b border-white/5 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function TeamMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        <Icon className="h-3.5 w-3.5 text-emerald-300" />
        <span className="break-words">{label}</span>
      </div>
      <p className="mt-2 break-words text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.025] px-2 py-2">
      <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function TeamEmptyState({
  icon: Icon,
  message,
}: {
  icon: typeof Shield
  message: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 max-w-lg text-sm leading-6 text-white/50">{message}</p>
    </div>
  )
}

function RoleBadge({ role }: { role: PublicTeamMember["role"] | PublicPlayerTeam["role"] }) {
  const { t } = useLanguage()
  const label =
    role === "owner"
      ? t.profile.meta.owner
      : role === "captain"
        ? t.profile.meta.captain
        : role === "substitute"
          ? t.profile.meta.substitute
          : t.profile.meta.member
  const className =
    role === "owner"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : role === "captain"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : role === "substitute"
          ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
          : "border-white/10 bg-white/5 text-white/60"

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  )
}

function ResultBadge({ result }: { result: "win" | "loss" | "draw" }) {
  const { t } = useLanguage()
  const className =
    result === "win"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : result === "loss"
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-white/10 bg-white/5 text-white/55"
  const label = result === "win" ? t.profile.win : result === "loss" ? t.profile.loss : t.profile.playerPublic.draw

  return (
    <span className={`rounded-full border px-3 py-1 font-bold ${className}`}>
      {label}
    </span>
  )
}

function displayStatusLabel(status: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (status === "approved" || status === "pending" || status === "rejected") {
    return t.profile.meta[status]
  }

  return status
}

function getPlayerProfileStats(data: PublicProfileData) {
  const finished = (data.playerMatchHistory ?? []).filter((match) => match.status === "finished")
  const wins = finished.filter((match) => match.result === "win").length
  const losses = finished.filter((match) => match.result === "loss").length
  const matches = finished.length
  const latest = finished[0]
  let streakCount = 0

  if (latest && latest.result !== "draw") {
    for (const match of finished) {
      if (match.result !== latest.result) break
      streakCount += 1
    }
  }

  return {
    matches,
    wins,
    losses,
    winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
    streak:
      latest && latest.result !== "draw" && streakCount > 0
        ? `${streakCount}${latest.result === "win" ? "W" : "L"}`
        : data.playerMatchHistory && data.playerMatchHistory.length > 0
          ? "0"
          : "0",
  }
}

function getBestPlayerPlacement(data: PublicProfileData) {
  const placements = (data.playerTournamentHistory ?? [])
    .map((item) => item.placement)
    .filter((placement): placement is number => placement !== null)

  return placements.length > 0 ? Math.min(...placements) : null
}

function formatProfileDate(date: string | null | undefined, lang: string) {
  if (!date) return null

  return new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function getProfileRating(data: PublicProfileData) {
  return data.ranking?.rating ?? data.profile.rating ?? 1000
}

function getProfileRankPosition(data: PublicProfileData) {
  return data.ranking?.rankPosition ?? data.profile.rank_position
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-5 text-center">
      <p className="text-xs tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-bold text-foreground">
        {value}
      </p>
    </div>
  )
}

export function PublicProfileLoading() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <section className="relative z-10 px-4 pb-16 pt-28 md:pt-36">
        <div className="mx-auto max-w-6xl">
          <div className="glass-card h-72 animate-pulse rounded-2xl" />
        </div>
      </section>
      <Footer />
    </main>
  )
}

export function PublicProfileError({
  message,
  kind = "team",
  userProfile = null,
}: {
  message: string
  kind?: "team" | "player"
  userProfile?: UserProfile | null
}) {
  const { t } = useLanguage()
  const eyebrow = kind === "player" ? t.profile.playerProfile : t.profile.teamProfile

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <MotionProvider>
        <Navbar homeHref="/" navHrefPrefix="/" participantLabel={kind === "player" ? "Players" : "Teams"} userProfile={userProfile} />
        <ProfileSectionEmpty
          eyebrow={eyebrow}
          title={t.profile.somethingWentOffline}
          message={message}
        />
      </MotionProvider>
      <Footer />
    </main>
  )
}

function ProfileImage({
  imageUrl,
  imageVersion,
  name,
  kind,
}: {
  imageUrl: string | null
  imageVersion: string | null
  name: string
  kind: "team" | "player"
}) {
  const avatarUrl = withAvatarCacheBust(imageUrl, imageVersion)

  return (
    <div
      className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-shadow duration-300 md:h-36 md:w-36"
      style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`${name} ${kind === "team" ? "logo" : "avatar"}`}
          className="h-full w-full object-cover"
        />
      ) : kind === "team" ? (
        <Shield className="h-14 w-14 text-primary md:h-16 md:w-16" />
      ) : (
        <User className="h-14 w-14 text-primary md:h-16 md:w-16" />
      )}
    </div>
  )
}

function MetaPill({
  label,
  value,
  empty = "TBA",
}: {
  label: string
  value?: string | null
  empty?: string
}) {
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
      style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
    >
      <span className="text-primary">{label}:</span> {value ?? empty}
    </span>
  )
}

function ProfileSectionEmpty({
  eyebrow,
  title,
  message,
}: {
  eyebrow: string
  title: string
  message: string
}) {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <EmptyState>{message}</EmptyState>
      </div>
    </section>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="glass-card mx-auto max-w-xl rounded-xl p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

function Divider() {
  return (
    <div
      className="mx-auto h-px max-w-xl"
      style={{
        background:
          "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
      }}
    />
  )
}
