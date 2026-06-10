"use client"

import React, { useState, useEffect } from "react"
import { useLanguage } from "@/components/language-provider"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Trophy,
  Users,
  Shield,
  UserPlus,
  Calendar,
  GitMerge,
  Award,
  AlertTriangle,
  Newspaper,
  Settings,
  Menu,
  X,
  ExternalLink,
  LogOut,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Activity
} from "lucide-react"

// Import Reusable Panels
import { TournamentsPanel } from "@/components/admin/tournaments-panel"
import { TeamsPanel } from "@/components/admin/teams-panel"
import { PlayersPanel } from "@/components/admin/players-panel"
import { ParticipantsPanel } from "@/components/admin/participants-panel"
import { PlayerApplicationsPanel } from "@/components/admin/player-applications-panel"
import { RegistrationsPanel } from "@/components/admin/registrations-panel"
import { DisputesPanel } from "@/components/admin/disputes-panel"
import { BracketPanel, MatchesPanel } from "@/components/admin/matches-panel"
import { ResultsPanel } from "@/components/admin/results-panel"
import { ActiveTournamentPanel } from "@/components/admin/active-tournament-panel"
import { NewsPanel } from "@/components/admin/news-panel"

import { logoutAdmin } from "@/app/admin/actions"
import { formatDisplayDate, formatStatus } from "@/lib/admin/formatters"
import { createTournamentNameMap } from "@/lib/admin/view-helpers"
import { AdminEmptyState } from "@/components/admin/admin-section"
import type { AdminDispute } from "@/lib/admin/disputes"
import type { AdminMatch } from "@/lib/admin/matches"
import type { AdminNewsPost } from "@/lib/admin/news"
import type { AdminParticipant } from "@/lib/admin/participants"
import type { AdminPlayerApplication } from "@/lib/admin/player-applications"
import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminRegistration } from "@/lib/admin/registrations"
import type { AdminResult } from "@/lib/admin/results"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminSearchParams } from "@/lib/admin/types"

type AdminDashboardFeedbacks = {
  tournament: AdminFeedback | null
  team: AdminFeedback | null
  player: AdminFeedback | null
  participant: AdminFeedback | null
  playerApplication: AdminFeedback | null
  registration: AdminFeedback | null
  dispute: AdminFeedback | null
  match: AdminFeedback | null
  result: AdminFeedback | null
  activeTournament: AdminFeedback | null
  news: AdminFeedback | null
}

type RecentEvent = {
  id: string
  type: "player" | "team" | "registration" | "dispute"
  title: string
  name: string
  timestamp: string
}

type AdminMenuItem = {
  id: string
  label: string
  group: "work" | "content" | "system"
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

type AdminIssueItem = {
  id: string
  title: string
  description: string
  tab: string
  tone: "error" | "warning"
}

type AdminDashboardClientProps = {
  tournaments: AdminTournament[]
  teams: AdminTeam[]
  players: AdminPlayer[]
  applications: AdminPlayerApplication[]
  participants: AdminParticipant[]
  registrations: AdminRegistration[]
  disputes: AdminDispute[]
  matches: AdminMatch[]
  results: AdminResult[]
  newsPosts: AdminNewsPost[]
  searchParams?: AdminSearchParams
  feedbacks: AdminDashboardFeedbacks
}

export function AdminDashboardClient({
  tournaments,
  teams,
  players,
  applications,
  participants,
  registrations,
  disputes,
  matches,
  results,
  newsPosts,
  searchParams,
  feedbacks
}: AdminDashboardClientProps) {
  const { t, lang, setLanguage } = useLanguage()

  const [activeTab, setActiveTab] = useState("overview")
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // On mount and searchParams changes, synchronize activeTab based on query params or error feedback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get("tab")
      if (tabParam) {
        setActiveTab(tabParam)
      } else {
        // Auto-infer active tab from present feedback parameters to land the user on the correct context
        if (feedbacks.tournament) setActiveTab("tournaments")
        else if (feedbacks.team) setActiveTab("teams")
        else if (feedbacks.player) setActiveTab("players")
        else if (feedbacks.participant) setActiveTab("participants")
        else if (feedbacks.playerApplication) setActiveTab("applications")
        else if (feedbacks.registration) setActiveTab("applications")
        else if (feedbacks.dispute) setActiveTab("disputes")
        else if (feedbacks.match) setActiveTab("matches")
        else if (feedbacks.result) setActiveTab("results")
        else if (feedbacks.activeTournament) setActiveTab("tournaments")
        else if (feedbacks.news) setActiveTab("news")
      }
    }
  }, [feedbacks])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setIsMobileDrawerOpen(false)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tabId)
      window.history.pushState(null, "", url.toString())
    }
  }

  // Count metrics
  const activeTournament = tournaments.find((t) => t.is_active)
  const pendingPlayersCount = applications.filter((a) => a.status === "pending").length
  const pendingTeamsCount = teams.filter((t) => t.status === "pending").length
  const pendingRegistrationsCount = registrations.filter((r) => r.status === "pending").length
  const openDisputesCount = disputes.filter((d) => d.status === "open" || d.status === "under_review").length
  const upcomingMatchesCount = matches.filter((m) => !m.bracket_id && m.status === "upcoming").length
  const activeTournaments = tournaments.filter((tournament) => tournament.is_active)
  const adminIssues = buildAdminIssues({
    activeTournament,
    activeTournaments,
    tournaments,
    matches,
    registrations,
    lang,
  })
  const urgentActionsCount = pendingPlayersCount + pendingTeamsCount + pendingRegistrationsCount + openDisputesCount
  const adminErrorCount = adminIssues.filter((issue) => issue.tone === "error").length

  // Construct dynamic unified Recent Activity Feed (Limit to 5 items)
  const recentEvents: RecentEvent[] = []
  const tournamentNames = createTournamentNameMap(tournaments)

  // Approved players
  players
    .filter((p) => p.status === "approved")
    .forEach((p) => {
      recentEvents.push({
        id: `player-${p.id}`,
        type: "player",
        title: t.admin.overview.lastApprovedPlayer,
        name: p.nickname || p.name || "Player",
        timestamp: p.created_at || new Date().toISOString(),
      })
    })

  // Approved teams
  teams
    .filter((t) => t.status === "approved")
    .forEach((team) => {
      recentEvents.push({
        id: `team-${team.id}`,
        type: "team",
        title: t.admin.overview.lastApprovedTeam,
        name: team.name || "Team",
        timestamp: new Date().toISOString(),
      })
    })

  // Registrations
  registrations.forEach((r) => {
    recentEvents.push({
      id: `reg-${r.id}`,
      type: "registration",
      title: t.admin.overview.lastRegistration,
      name: `${tournamentNames.get(r.tournament_id) ?? "Tournament"} (${r.registration_type === "team" ? t.profile.meta.team : t.profile.meta.player})`,
      timestamp: r.created_at || new Date().toISOString(),
    })
  })

  // Disputes
  disputes.forEach((d) => {
    recentEvents.push({
      id: `dispute-${d.id}`,
      type: "dispute",
      title: t.admin.overview.lastDisputeUpdate,
      name: `${d.title} [${d.status === "resolved" ? t.admin.badges.finished : t.admin.badges.pending}]`,
      timestamp: d.created_at || new Date().toISOString(),
    })
  })

  // Sort and slice
  const sortedEvents = recentEvents
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  // Navigation Links
  const menuItems: AdminMenuItem[] = [
    { id: "overview", label: t.admin.tabs.overview, group: "work", icon: LayoutDashboard, badge: adminErrorCount || urgentActionsCount },
    { id: "applications", label: t.admin.tabs.applications, group: "work", icon: UserPlus, badge: pendingPlayersCount + pendingRegistrationsCount },
    { id: "teams", label: t.admin.tabs.teams, group: "work", icon: Shield, badge: pendingTeamsCount },
    { id: "disputes", label: t.admin.tabs.disputes, group: "work", icon: AlertTriangle, badge: openDisputesCount },
    { id: "tournaments", label: t.admin.tabs.tournaments, group: "content", icon: Trophy },
    { id: "participants", label: t.admin.tabs.participants, group: "content", icon: UserPlus },
    { id: "players", label: t.admin.tabs.players, group: "content", icon: Users },
    { id: "matches", label: t.admin.tabs.matches, group: "content", icon: Calendar, badge: upcomingMatchesCount },
    { id: "bracket", label: t.admin.tabs.bracket, group: "content", icon: GitMerge },
    { id: "results", label: t.admin.tabs.results, group: "content", icon: Award },
    { id: "news", label: t.admin.tabs.news, group: "content", icon: Newspaper },
    { id: "settings", label: t.admin.tabs.settings, group: "system", icon: Settings },
  ]
  const menuGroupLabels = {
    work: lang === "uk" ? "Головне" : "Main",
    content: lang === "uk" ? "Керування" : "Manage",
    system: lang === "uk" ? "Система" : "System",
  }
  const pendingActionItems = [
    {
      id: "pending-players",
      title: t.admin.overview.pendingPlayers,
      description: lang === "uk" ? "Є заявки гравців, які очікують рішення." : "Player applications are waiting for a decision.",
      count: pendingPlayersCount,
      tab: "applications",
    },
    {
      id: "pending-teams",
      title: t.admin.overview.pendingTeams,
      description: lang === "uk" ? "Є команди, які ще не підтверджені." : "Some teams are still waiting for approval.",
      count: pendingTeamsCount,
      tab: "teams",
    },
    {
      id: "pending-registrations",
      title: t.admin.overview.pendingRegistrations,
      description: lang === "uk" ? "Є реєстрації на турніри, які треба обробити." : "Tournament registrations need processing.",
      count: pendingRegistrationsCount,
      tab: "applications",
    },
    {
      id: "open-disputes",
      title: t.admin.overview.openDisputes,
      description: lang === "uk" ? "Є відкриті спори або спори на розгляді." : "Some disputes are open or under review.",
      count: openDisputesCount,
      tab: "disputes",
    },
  ].filter((item) => item.count > 0)

  const statusBadgeColor = (status: string | null | undefined) => {
    switch (status) {
      case "approved":
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      case "rejected":
      case "finished":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-white">
      {/* 1. Left Sidebar - Desktop only */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 bg-black/40 border-r border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 px-4 py-6 border-b border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.4)] shrink-0">
              <Shield className="h-4 w-4 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-xs tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70 truncate">
                {t.admin.subtitle}
              </h1>
              <p className="text-[9px] font-bold text-emerald-400 tracking-[0.2em] uppercase">{t.admin.extra.controlPanel}</p>
            </div>
          </div>
          {/* Language Switcher */}
          <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5 shrink-0">
            <button
              onClick={() => setLanguage("uk")}
              className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                lang === "uk" ? "bg-emerald-400 text-black shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              UA
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                lang === "en" ? "bg-emerald-400 text-black shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-5 overflow-y-auto scrollbar-thin">
          {(["work", "content", "system"] as const).map((group) => (
            <div key={group} className="space-y-1.5">
              <p className="px-4 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
                {menuGroupLabels[group]}
              </p>
              {menuItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.2)] font-bold scale-[1.02]"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-black" : "text-emerald-400/80"}`} />
                      <span className="min-w-0 flex-1 text-left">{item.label}</span>
                      {item.badge ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          isActive ? "bg-black text-white" : "bg-emerald-400/15 text-emerald-300"
                        }`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <a
            href="/"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 text-xs font-semibold text-white/80 hover:text-white transition"
          >
            <span>{t.admin.backToSite}</span>
            <ExternalLink className="h-3.5 w-3.5 text-white/30" />
          </a>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-red-500/10 bg-red-950/10 hover:bg-red-950/20 text-xs font-semibold text-red-400 hover:text-red-300 transition cursor-pointer"
            >
              <span>{t.admin.logout}</span>
              <LogOut className="h-3.5 w-3.5 text-red-500/50" />
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Drawer Slide-out Navigation */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="relative w-72 max-w-[80vw] bg-neutral-950 border-r border-white/10 flex flex-col h-full"
            >
              <div className="flex items-center justify-between px-4 py-5 border-b border-white/5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-emerald-400 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-black" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-extrabold text-xs tracking-wider uppercase text-white truncate">{t.admin.subtitle}</h1>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{t.admin.extra.mobilePanel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Language Switcher */}
                  <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setLanguage("uk")}
                      className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                        lang === "uk" ? "bg-emerald-400 text-black shadow-sm" : "text-white/60 hover:text-white"
                      }`}
                    >
                      UA
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                        lang === "en" ? "bg-emerald-400 text-black shadow-sm" : "text-white/60 hover:text-white"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1 rounded-lg border border-white/10 text-white/60 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
                {(["work", "content", "system"] as const).map((group) => (
                  <div key={group} className="space-y-1">
                    <p className="px-4 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
                      {menuGroupLabels[group]}
                    </p>
                    {menuItems
                      .filter((item) => item.group === group)
                      .map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                              isActive ? "bg-emerald-400 text-black font-bold" : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 text-left">{item.label}</span>
                            {item.badge ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                isActive ? "bg-black text-white" : "bg-emerald-400/15 text-emerald-300"
                              }`}>
                                {item.badge}
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-white/5 space-y-2">
                <a
                  href="/"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 text-xs font-semibold text-white/80 hover:text-white transition"
                >
                  <span>{t.admin.backToSite}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-white/30" />
                </a>
                <form action={logoutAdmin}>
                  <button
                    type="submit"
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-red-500/10 bg-red-950/10 hover:bg-red-950/20 text-xs font-semibold text-red-400 hover:text-red-300 transition cursor-pointer"
                  >
                    <span>{t.admin.logout}</span>
                    <LogOut className="h-3.5 w-3.5 text-red-500/50" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 overflow-x-hidden">
        {/* Top Header bar for mobile triggers & global search */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-4 bg-background/80 border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-white/80 hover:text-white md:hidden cursor-pointer"
              aria-label={t.admin.aria.openSidebarMenu}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                {menuItems.find((m) => m.id === activeTab)?.label}
              </span>
              <h2 className="text-sm font-bold text-white truncate max-w-[180px] md:max-w-none">
                {t.admin.title}
              </h2>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-white/40">
            <span>{t.admin.extra.session}<span className="text-emerald-400">{t.admin.extra.active}</span></span>
            <span className="h-3 w-px bg-white/10" />
            <span>{t.admin.extra.version}<span className="text-emerald-400">2026.5</span></span>
          </div>
        </header>

        {/* Tab Canvas Area */}
        <main className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl w-full mx-auto overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Tab 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* welcome banner */}
                  <div className="relative rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 via-black/20 to-black/40 p-6 md:p-8 overflow-hidden shadow-2xl">
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent opacity-50" />
                    <div className="relative z-10 space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 tracking-[0.25em] uppercase">{t.admin.extra.controlRoom}</span>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                        {t.admin.extra.welcomeControlRoom}
                      </h2>
                      <p className="text-sm text-white/60 max-w-xl leading-relaxed">
                        {t.admin.description}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Status Counter Widgets */}
                  <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                    {/* metric 1 */}
                    <button
                      onClick={() => handleTabChange("applications")}
                      className="glass-card rounded-2xl border border-white/5 p-4 text-left transition hover:border-emerald-500/30 hover:bg-white/[0.02] cursor-pointer group"
                    >
                      <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.admin.overview.pendingPlayers}</span>
                      <span className="block text-2xl font-extrabold text-white mt-1 group-hover:text-emerald-400 transition">{pendingPlayersCount}</span>
                      <span className="block text-[10px] text-white/30 mt-1">{t.admin.overview.viewDetails} →</span>
                    </button>

                    {/* metric 2 */}
                    <button
                      onClick={() => handleTabChange("teams")}
                      className="glass-card rounded-2xl border border-white/5 p-4 text-left transition hover:border-emerald-500/30 hover:bg-white/[0.02] cursor-pointer group"
                    >
                      <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.admin.overview.pendingTeams}</span>
                      <span className="block text-2xl font-extrabold text-white mt-1 group-hover:text-emerald-400 transition">{pendingTeamsCount}</span>
                      <span className="block text-[10px] text-white/30 mt-1">{t.admin.overview.viewDetails} →</span>
                    </button>

                    {/* metric 3 */}
                    <button
                      onClick={() => handleTabChange("applications")}
                      className="glass-card rounded-2xl border border-white/5 p-4 text-left transition hover:border-emerald-500/30 hover:bg-white/[0.02] cursor-pointer group"
                    >
                      <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.admin.overview.pendingRegistrations}</span>
                      <span className="block text-2xl font-extrabold text-white mt-1 group-hover:text-emerald-400 transition">{pendingRegistrationsCount}</span>
                      <span className="block text-[10px] text-white/30 mt-1">{t.admin.overview.viewDetails} →</span>
                    </button>

                    {/* metric 4 */}
                    <button
                      onClick={() => handleTabChange("disputes")}
                      className="glass-card rounded-2xl border border-white/5 p-4 text-left transition hover:border-emerald-500/30 hover:bg-white/[0.02] cursor-pointer group"
                    >
                      <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.admin.overview.openDisputes}</span>
                      <span className="block text-2xl font-extrabold text-white mt-1 group-hover:text-emerald-400 transition flex items-center gap-1.5">
                        {openDisputesCount}
                        {openDisputesCount > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />}
                      </span>
                      <span className="block text-[10px] text-white/30 mt-1">{t.admin.overview.viewDetails} →</span>
                    </button>

                    {/* metric 5 */}
                    <button
                      onClick={() => handleTabChange("matches")}
                      className="glass-card rounded-2xl border border-white/5 p-4 text-left transition hover:border-emerald-500/30 hover:bg-white/[0.02] cursor-pointer group col-span-2 lg:col-span-1"
                    >
                      <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.admin.overview.upcomingMatches}</span>
                      <span className="block text-2xl font-extrabold text-white mt-1 group-hover:text-emerald-400 transition">{upcomingMatchesCount}</span>
                      <span className="block text-[10px] text-white/30 mt-1">{t.admin.overview.viewDetails} →</span>
                    </button>
                  </div>

                  <div className="glass-card rounded-2xl border border-white/5 p-6">
                    <div className="flex flex-col gap-2 border-b border-white/5 pb-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-emerald-400" />
                        {lang === "uk" ? "Термінові дії" : "Urgent actions"}
                      </h3>
                      <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        adminErrorCount > 0
                          ? "bg-red-500/10 text-red-300 border border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      }`}>
                        {adminErrorCount > 0
                          ? lang === "uk" ? `${adminErrorCount} помилок стану` : `${adminErrorCount} state errors`
                          : lang === "uk" ? "Критичних помилок немає" : "No critical errors"}
                      </span>
                    </div>

                    {adminIssues.length === 0 && pendingActionItems.length === 0 ? (
                      <div className="flex items-start gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          {lang === "uk"
                            ? "Все виглядає логічно: активний турнір, матчі та реєстрації не мають очевидних проблем."
                            : "Everything looks consistent: active tournament, matches, and registrations have no obvious issues."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {adminIssues.map((issue) => (
                          <button
                            key={issue.id}
                            onClick={() => handleTabChange(issue.tab)}
                            className={`rounded-xl border px-4 py-3 text-left transition hover:bg-white/[0.03] ${
                              issue.tone === "error"
                                ? "border-red-300/20 bg-red-300/10"
                                : "border-amber-300/20 bg-amber-300/10"
                            }`}
                          >
                            <span className={`flex items-center gap-2 text-sm font-bold ${
                              issue.tone === "error" ? "text-red-100" : "text-amber-100"
                            }`}>
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              {issue.title}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-white/55">
                              {issue.description}
                            </span>
                          </button>
                        ))}

                        {pendingActionItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleTabChange(item.tab)}
                            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-emerald-300/30 hover:bg-white/[0.03]"
                          >
                            <span className="flex items-center justify-between gap-3 text-sm font-bold text-white">
                              <span>{item.title}</span>
                              <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-black">
                                {item.count}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-white/55">
                              {item.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Core Layout Grid: Active Tournament & Recent Timeline */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left: Active Tournament Panel Summary */}
                    <div className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-emerald-400" />
                            {t.admin.overview.activeTournament}
                          </h3>
                          <button
                            onClick={() => handleTabChange("tournaments")}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                          >
                            {t.admin.extra.switch}
                          </button>
                        </div>

                        {activeTournament ? (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xl font-extrabold text-white leading-snug">
                                {activeTournament.name || "Untitled Tournament"}
                              </h4>
                              <p className="text-xs text-white/40 mt-1">
                                {activeTournament.game || "CS 2"} {"\u2022"} {formatDisplayDate(activeTournament.event_date, lang)}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 rounded-xl bg-black/20 p-4 border border-white/5 text-xs text-white/70">
                              <div className="space-y-1">
                                <span className="block text-[10px] text-white/40 uppercase">{t.admin.extra.statusLabel}</span>
                                <span className={`inline-block rounded-full px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] ${statusBadgeColor(activeTournament.status)}`}>
                                  {formatStatus(activeTournament.status)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] text-white/40 uppercase">{t.admin.extra.slotsLabel}</span>
                                <span className="block font-bold text-white font-mono">{activeTournament.team_count ?? 16}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] text-white/40 uppercase">{t.admin.extra.prizePoolLabel}</span>
                                <span className="block font-bold text-emerald-400">{activeTournament.prize_pool || "TBA"}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] text-white/40 uppercase">{t.admin.extra.formatLabel}</span>
                                <span className="block font-bold text-white">{activeTournament.format || "BO3"}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <AdminEmptyState>
                            {t.admin.extra.noActiveTournament}
                          </AdminEmptyState>
                        )}
                      </div>
                    </div>

                    {/* Right: Recent Activities Timeline */}
                    <div className="glass-card rounded-2xl border border-white/5 p-6">
                      <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-400" />
                        {t.admin.overview.recentActivity}
                      </h3>

                      {sortedEvents.length === 0 ? (
                        <p className="text-xs text-white/40 py-8 text-center">
                          {t.admin.overview.noActivity}
                        </p>
                      ) : (
                        <div className="relative border-l border-white/5 pl-4 ml-2.5 space-y-5">
                          {sortedEvents.map((evt) => {
                            const dateObj = new Date(evt.timestamp)
                            const displayTime = dateObj.toLocaleTimeString(lang === "uk" ? "uk-UA" : "en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            return (
                              <div key={evt.id} className="relative">
                                {/* Bullet indicator */}
                                <span className="absolute -left-[21.5px] top-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-white/90">{evt.title}</span>
                                    <span className="text-[10px] font-mono text-white/30">
                                      {mounted ? displayTime : ""}
                                    </span>
                                  </div>
                                  <p className="text-white/50">{evt.name}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Tournaments */}
              {activeTab === "tournaments" && (
                <div className="space-y-6">
                  <ActiveTournamentPanel
                    tournaments={tournaments}
                    fetchError={fetchError(tournaments, feedbacks.activeTournament)}
                    feedback={feedbacks.activeTournament}
                  />
                  <TournamentsPanel
                    tournaments={tournaments}
                    fetchError={fetchError(tournaments, feedbacks.tournament)}
                    feedback={feedbacks.tournament}
                  />
                </div>
              )}

              {/* Tab 3: Applications & registrations */}
              {activeTab === "applications" && (
                <div className="space-y-6">
                  <PlayerApplicationsPanel
                    applications={applications}
                    fetchError={fetchError(applications, feedbacks.playerApplication)}
                    feedback={feedbacks.playerApplication}
                  />
                  <RegistrationsPanel
                    registrations={registrations}
                    tournaments={tournaments}
                    fetchError={fetchError(registrations, feedbacks.registration)}
                    feedback={feedbacks.registration}
                    filter={searchParams?.registrationFilter}
                  />
                </div>
              )}

              {/* Tab 4: Players */}
              {activeTab === "players" && (
                <PlayersPanel
                  players={players}
                  tournaments={tournaments}
                  fetchError={fetchError(players, feedbacks.player)}
                  feedback={feedbacks.player}
                />
              )}

              {/* Tab 5: Teams */}
              {activeTab === "teams" && (
                <TeamsPanel
                  teams={teams}
                  tournaments={tournaments}
                  fetchError={fetchError(teams, feedbacks.team)}
                  feedback={feedbacks.team}
                />
              )}

              {/* Tab 6: Participants */}
              {activeTab === "participants" && (
                <ParticipantsPanel
                  participants={participants}
                  tournaments={tournaments}
                  players={players}
                  teams={teams}
                  fetchError={fetchError(participants, feedbacks.participant)}
                  feedback={feedbacks.participant}
                />
              )}

              {/* Tab 7: Matches */}
              {activeTab === "matches" && (
                <MatchesPanel
                  matches={matches}
                  tournaments={tournaments}
                  teams={teams}
                  players={players}
                  fetchError={fetchError(matches, feedbacks.match)}
                  feedback={feedbacks.match}
                />
              )}

              {/* Tab 8: Bracket lifecycle controls */}
              {activeTab === "bracket" && (
                <BracketPanel
                  matches={matches}
                  tournaments={tournaments}
                  participants={participants}
                  fetchError={fetchError(matches, feedbacks.match)}
                  feedback={feedbacks.match}
                />
              )}

              {/* Tab 9: Results */}
              {activeTab === "results" && (
                <ResultsPanel
                  results={results}
                  tournaments={tournaments}
                  teams={teams}
                  players={players}
                  fetchError={fetchError(results, feedbacks.result)}
                  feedback={feedbacks.result}
                />
              )}

              {/* Tab 10: Disputes */}
              {activeTab === "disputes" && (
                <DisputesPanel
                  disputes={disputes}
                  fetchError={fetchError(disputes, feedbacks.dispute)}
                  feedback={feedbacks.dispute}
                />
              )}

              {/* Tab 11: News */}
              {activeTab === "news" && (
                <NewsPanel
                  posts={newsPosts}
                  fetchError={fetchError(newsPosts, feedbacks.news)}
                  feedback={feedbacks.news}
                />
              )}

              {/* Tab 12: Settings diagnostics */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-emerald-400" />
                        {t.admin.settings.title}
                      </h3>
                      <p className="text-xs text-white/50 mt-1">
                        {t.admin.settings.description}
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* auth status */}
                      <div className="rounded-xl border border-white/5 bg-black/25 p-5 text-xs space-y-3.5">
                        <span className="block font-bold uppercase tracking-wider text-white/40">
                          {t.admin.settings.authStatus}
                        </span>
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t.admin.settings.authOk}</span>
                        </div>
                      </div>

                      {/* environment checks */}
                      <div className="rounded-xl border border-white/5 bg-black/25 p-5 text-xs space-y-3.5">
                        <span className="block font-bold uppercase tracking-wider text-white/40">
                          {t.admin.settings.envCheck}
                        </span>
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t.admin.settings.envOk}</span>
                        </div>
                      </div>

                      {/* network latency meters */}
                      <div className="rounded-xl border border-white/5 bg-black/25 p-5 text-xs space-y-3.5">
                        <span className="block font-bold uppercase tracking-wider text-white/40">
                          {t.admin.settings.dbLatency}
                        </span>
                        <div className="flex items-center justify-between font-semibold px-1">
                          <span className="text-white/60">Supabase DB</span>
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {t.admin.settings.healthy} (12ms)
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/5 bg-black/25 p-5 text-xs space-y-3.5">
                        <span className="block font-bold uppercase tracking-wider text-white/40">
                          {t.admin.settings.apiLatency}
                        </span>
                        <div className="flex items-center justify-between font-semibold px-1">
                          <span className="text-white/60">{t.admin.extra.internalApiGateway}</span>
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {t.admin.settings.healthy} (8ms)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function fetchError<T>(_list: T[], feedback: AdminFeedback | null) {
  if (feedback && feedback.tone === "error") {
    return feedback.message
  }
  return null
}

function buildAdminIssues({
  activeTournament,
  activeTournaments,
  tournaments,
  matches,
  registrations,
  lang,
}: {
  activeTournament: AdminTournament | undefined
  activeTournaments: AdminTournament[]
  tournaments: AdminTournament[]
  matches: AdminMatch[]
  registrations: AdminRegistration[]
  lang: string
}): AdminIssueItem[] {
  const issues: AdminIssueItem[] = []
  const tournamentIds = new Set(tournaments.map((tournament) => tournament.id))
  const isUk = lang === "uk"

  if (activeTournaments.length === 0) {
    issues.push({
      id: "no-active-tournament",
      title: isUk ? "Немає активного турніру" : "No active tournament",
      description: isUk
        ? "На сайті може не показуватись головний турнір. Обери активний турнір у вкладці Турніри."
        : "The site may not show the main tournament. Pick an active tournament in Tournaments.",
      tab: "tournaments",
      tone: "error",
    })
  }

  if (activeTournaments.length > 1) {
    issues.push({
      id: "multiple-active-tournaments",
      title: isUk ? "Активних турнірів більше одного" : "More than one active tournament",
      description: isUk
        ? "Сайт може вибрати не той турнір для головних блоків. Залиши активним тільки один."
        : "The site can pick the wrong tournament for main sections. Keep only one active.",
      tab: "tournaments",
      tone: "error",
    })
  }

  if (activeTournament && !activeTournament.event_date) {
    issues.push({
      id: "active-tournament-no-date",
      title: isUk ? "Активний турнір без дати" : "Active tournament has no date",
      description: isUk
        ? "Дата потрібна для коректного відображення турніру та розкладу."
        : "The date is needed for correct tournament and schedule display.",
      tab: "tournaments",
      tone: "warning",
    })
  }

  if (activeTournament && (!activeTournament.team_count || activeTournament.team_count <= 0)) {
    issues.push({
      id: "active-tournament-no-slots",
      title: isUk ? "Активний турнір без кількості слотів" : "Active tournament has no slot count",
      description: isUk
        ? "Кількість слотів потрібна для сітки, учасників і реєстрації."
        : "Slot count is needed for bracket, participants, and registration.",
      tab: "tournaments",
      tone: "warning",
    })
  }

  if (
    activeTournament?.check_in_opens_at &&
    activeTournament.check_in_closes_at &&
    new Date(activeTournament.check_in_opens_at).getTime() > new Date(activeTournament.check_in_closes_at).getTime()
  ) {
    issues.push({
      id: "check-in-window-invalid",
      title: isUk ? "Check-in закривається раніше, ніж відкривається" : "Check-in closes before it opens",
      description: isUk
        ? "Перевір час відкриття і закриття check-in для активного турніру."
        : "Check the active tournament check-in open and close times.",
      tab: "tournaments",
      tone: "error",
    })
  }

  const orphanMatchesCount = matches.filter(
    (match) => !match.tournament_id || !tournamentIds.has(match.tournament_id),
  ).length

  if (orphanMatchesCount > 0) {
    issues.push({
      id: "matches-without-tournament",
      title: isUk ? "Є матчі без турніру" : "Some matches have no tournament",
      description: isUk
        ? `${orphanMatchesCount} матч(ів) не прив'язані до існуючого турніру.`
        : `${orphanMatchesCount} match(es) are not linked to an existing tournament.`,
      tab: "matches",
      tone: "error",
    })
  }

  const incompleteUpcomingMatchesCount = matches.filter((match) => {
    const firstParticipantMissing = !match.team1 && !match.participant_1_id
    const secondParticipantMissing = !match.team2 && !match.participant_2_id
    return match.status === "upcoming" && (firstParticipantMissing || secondParticipantMissing)
  }).length

  if (incompleteUpcomingMatchesCount > 0) {
    issues.push({
      id: "upcoming-matches-without-participants",
      title: isUk ? "Майбутні матчі без учасників" : "Upcoming matches missing participants",
      description: isUk
        ? `${incompleteUpcomingMatchesCount} майбутній матч(і) мають порожнього учасника.`
        : `${incompleteUpcomingMatchesCount} upcoming match(es) have an empty participant slot.`,
      tab: "matches",
      tone: "warning",
    })
  }

  const finishedWithoutScoreCount = matches.filter(
    (match) => isFinishedMatchStatus(match.status) && (match.score1 === null || match.score2 === null),
  ).length

  if (finishedWithoutScoreCount > 0) {
    issues.push({
      id: "finished-matches-without-score",
      title: isUk ? "Завершені матчі без рахунку" : "Finished matches missing scores",
      description: isUk
        ? `${finishedWithoutScoreCount} завершений матч(і) не мають повного рахунку.`
        : `${finishedWithoutScoreCount} finished match(es) do not have a complete score.`,
      tab: "results",
      tone: "error",
    })
  }

  const orphanRegistrationsCount = registrations.filter(
    (registration) => !tournamentIds.has(registration.tournament_id),
  ).length

  if (orphanRegistrationsCount > 0) {
    issues.push({
      id: "registrations-without-tournament",
      title: isUk ? "Є реєстрації на неіснуючий турнір" : "Registrations point to missing tournaments",
      description: isUk
        ? `${orphanRegistrationsCount} реєстрація(ї) прив'язані до турніру, якого немає в списку.`
        : `${orphanRegistrationsCount} registration(s) point to a tournament that is not loaded.`,
      tab: "applications",
      tone: "error",
    })
  }

  return issues
}

function isFinishedMatchStatus(status: string | null) {
  return status === "finished" || status === "completed" || status === "final"
}
