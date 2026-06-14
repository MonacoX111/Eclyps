import "server-only"

import { cookies } from "next/headers"
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSession,
} from "@/lib/admin-auth"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData } from "@/lib/data/homepage"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type AiContextNotice = {
  scope: string
  message: string
}

export type AiLiveContext = {
  generatedAt: string
  viewer: {
    authenticated: boolean
    isAdmin: boolean
    profile: null | {
      id: string
      discordUsername: string
      displayName: string
    }
  }
  public: {
    activeTournament: null | {
      id: string
      name: string
      game: string | null
      status: string | null
      participantType: string | null
      eventDate: string | null
      checkInOpensAt: string | null
      checkInClosesAt: string | null
      registration: {
        approved: number
        pending: number
        capacity: number | null
      } | null
    }
    upcomingMatches: Array<{
      id: string
      round: string | null
      teams: [string | null, string | null]
      status: string
      scheduledAt: string | null
      scheduleNote: string | null
    }>
    bracket: null | {
      title: string
      rounds: number
      matches: number
      status: string | null
      champion: string | null
    }
    latestResults: Array<{
      team: string | null
      placement: number | null
      label: string | null
      scoreline: string | null
    }>
  }
  user: null | {
    player: null | {
      id: string
      displayName: string
      status: string | null
      region: string | null
      rating: number | null
      wins: number | null
      losses: number | null
      seed: number | null
    }
    teams: Array<{
      id: string
      name: string
      status: string | null
      role: "owner" | "captain" | "member" | "substitute"
      roster?: Array<{
        displayName: string
        role: string | null
        status: string | null
      }>
    }>
    registrations: Array<{
      id: string
      tournamentName: string | null
      type: string | null
      status: string | null
      checkInStatus: string | null
      createdAt: string | null
    }>
    invites: {
      incoming: Array<{
        id: string
        teamName: string | null
        inviterName: string | null
        createdAt: string | null
      }>
      joinRequests: Array<{
        id: string
        teamName: string | null
        status: string | null
        createdAt: string | null
      }>
    }
    upcomingMatches: AiLiveContext["public"]["upcomingMatches"]
    notifications: {
      unreadCount: number
      latest: Array<{
        type: string
        title: string
        message: string
        read: boolean
        createdAt: string | null
      }>
    }
  }
  admin: null | {
    pendingRegistrations: number
    pendingPlayerApplications: number
    pendingTeams: number
    openDisputes: number
    upcomingMatches: number
  }
  notices: AiContextNotice[]
}

type SupabaseAdmin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>

export async function buildAiLiveContext(): Promise<AiLiveContext> {
  const generatedAt = new Date().toISOString()
  const notices: AiContextNotice[] = []
  const [homepageData, userProfile, isAdmin] = await Promise.all([
    getHomepageData().catch((error) => {
      console.error("AI context: failed to load public homepage data", error)
      notices.push({ scope: "public", message: "Public site data could not be loaded." })
      return null
    }),
    getCurrentUserProfile().catch((error) => {
      console.error("AI context: failed to resolve user profile", error)
      notices.push({ scope: "viewer", message: "Viewer profile could not be resolved." })
      return null
    }),
    getIsAdminViewer().catch((error) => {
      console.error("AI context: failed to validate admin session", error)
      return false
    }),
  ])

  const publicContext = {
    activeTournament: homepageData?.tournament
      ? {
          id: homepageData.tournament.id,
          name:
            homepageData.tournament.display_name ??
            homepageData.tournament.title ??
            homepageData.tournament.name ??
            "Tournament",
          game: homepageData.tournament.game,
          status: homepageData.tournament.status,
          participantType: homepageData.tournament.participant_type,
          eventDate: homepageData.tournament.event_date,
          checkInOpensAt: homepageData.tournament.check_in_opens_at,
          checkInClosesAt: homepageData.tournament.check_in_closes_at,
          registration: homepageData.registrationSummary
            ? {
                approved: homepageData.registrationSummary.approvedCount,
                pending: homepageData.registrationSummary.pendingCount,
                capacity: homepageData.registrationSummary.capacity,
              }
            : null,
        }
      : null,
    upcomingMatches: (homepageData?.matches ?? [])
      .filter((match) => match.status !== "finished")
      .slice(0, 8)
      .map(compactMatch),
    bracket: homepageData?.publicBracket
      ? {
          title: homepageData.publicBracket.labels.title,
          rounds: homepageData.publicBracket.rounds.length,
          matches: homepageData.publicBracket.rounds.reduce(
            (count, round) => count + round.matches.length,
            0,
          ),
          status:
            homepageData.publicBracket.rounds
              .flatMap((round) => round.matches)
              .find((match) => match.status === "live")?.status ??
            homepageData.publicBracket.rounds.at(-1)?.matches.at(-1)?.status ??
            null,
          champion: homepageData.publicBracket.champion ?? null,
        }
      : null,
    latestResults: (homepageData?.results ?? []).slice(0, 8).map((result) => ({
      team: result.team,
      placement: result.placement,
      label: result.label,
      scoreline: result.scoreline,
    })),
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const [userContext, adminContext] = await Promise.all([
    userProfile && supabaseAdmin
      ? buildUserContext({
          supabaseAdmin,
          userProfile,
          homepageData,
          notices,
        })
      : Promise.resolve(null),
    isAdmin && supabaseAdmin
      ? buildAdminContext(supabaseAdmin, notices)
      : Promise.resolve(null),
  ])

  if (userProfile && !supabaseAdmin) {
    notices.push({
      scope: "user",
      message: "Private account data is unavailable because the server data client is not configured.",
    })
  }

  return {
    generatedAt,
    viewer: {
      authenticated: Boolean(userProfile),
      isAdmin,
      profile: userProfile
        ? {
            id: userProfile.id,
            discordUsername: userProfile.discord_username,
            displayName: userProfile.display_name,
          }
        : null,
    },
    public: publicContext,
    user: userContext,
    admin: adminContext,
    notices,
  }
}

async function getIsAdminViewer() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  return isValidAdminSession(sessionCookie)
}

async function buildUserContext({
  supabaseAdmin,
  userProfile,
  homepageData,
  notices,
}: {
  supabaseAdmin: SupabaseAdmin
  userProfile: NonNullable<Awaited<ReturnType<typeof getCurrentUserProfile>>>
  homepageData: Awaited<ReturnType<typeof getHomepageData>> | null
  notices: AiContextNotice[]
}): Promise<AiLiveContext["user"]> {
  const [playersResult, registrationsResult, notificationsResult, invitesResult, joinRequestsResult] =
    await Promise.all([
      supabaseAdmin
        .from("players")
        .select("id, user_id, owner_user_id, name, nickname, display_name, status, region, rating, wins, losses, seed")
        .or(`owner_user_id.eq.${userProfile.id},user_id.eq.${userProfile.auth_user_id}`)
        .limit(5),
      supabaseAdmin
        .from("tournament_registrations")
        .select("id, tournament_id, registration_type, status, check_in_status, created_at, participant_id, source_player_id, source_team_id, team_id, player_id, tournaments:tournaments(name)")
        .eq("user_profile_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("notifications")
        .select("id, type, title, message, read_at, created_at")
        .eq("user_profile_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabaseAdmin
        .from("team_invites")
        .select("id, team_id, inviter_player_id, status, created_at, teams:teams(name), players!team_invites_inviter_player_id_fkey(display_name, nickname, name)")
        .eq("invited_user_profile_id", userProfile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("team_join_requests")
        .select("id, team_id, status, created_at, teams:teams(name)")
        .eq("requester_user_profile_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ])

  const players = rowsOrNotice(playersResult, notices, "user.players")
  const playerIds = players.map((player) => readString(player.id)).filter(isString)
  const primaryPlayer = players[0] ?? null

  const teams = playerIds.length > 0
    ? await loadUserTeams(supabaseAdmin, playerIds, notices)
    : []
  const registrations = rowsOrNotice(registrationsResult, notices, "user.registrations")
  const notifications = rowsOrNotice(notificationsResult, notices, "user.notifications")
  const invites = rowsOrNotice(invitesResult, notices, "user.invites")
  const joinRequests = rowsOrNotice(joinRequestsResult, notices, "user.joinRequests")

  const participantIds = new Set<string>()
  registrations.forEach((registration) => {
    ;[
      registration.participant_id,
      registration.source_player_id,
      registration.source_team_id,
      registration.team_id,
      registration.player_id,
    ].forEach((id) => {
      if (typeof id === "string") participantIds.add(id)
    })
  })
  ;(homepageData?.participants ?? []).forEach((participant) => {
    if (
      (participant.source_player_id && playerIds.includes(participant.source_player_id)) ||
      (participant.source_team_id && teams.some((team) => team.id === participant.source_team_id))
    ) {
      participantIds.add(participant.id)
    }
  })

  return {
    player: primaryPlayer
      ? {
          id: readString(primaryPlayer.id) ?? "",
          displayName:
            readString(primaryPlayer.display_name) ??
            readString(primaryPlayer.nickname) ??
            readString(primaryPlayer.name) ??
            userProfile.display_name,
          status: readString(primaryPlayer.status),
          region: readString(primaryPlayer.region),
          rating: readNumber(primaryPlayer.rating),
          wins: readNumber(primaryPlayer.wins),
          losses: readNumber(primaryPlayer.losses),
          seed: readNumber(primaryPlayer.seed),
        }
      : null,
    teams,
    registrations: registrations.map((registration) => ({
      id: readString(registration.id) ?? "",
      tournamentName: readJoinedName(registration.tournaments),
      type: readString(registration.registration_type),
      status: readString(registration.status),
      checkInStatus: readString(registration.check_in_status),
      createdAt: readString(registration.created_at),
    })),
    invites: {
      incoming: invites.map((invite) => ({
        id: readString(invite.id) ?? "",
        teamName: readJoinedName(invite.teams),
        inviterName: readDisplayName(invite.players),
        createdAt: readString(invite.created_at),
      })),
      joinRequests: joinRequests.map((request) => ({
        id: readString(request.id) ?? "",
        teamName: readJoinedName(request.teams),
        status: readString(request.status),
        createdAt: readString(request.created_at),
      })),
    },
    upcomingMatches: (homepageData?.matches ?? [])
      .filter(
        (match) =>
          match.status !== "finished" &&
          ((match.participant_1_id && participantIds.has(match.participant_1_id)) ||
            (match.participant_2_id && participantIds.has(match.participant_2_id))),
      )
      .slice(0, 6)
      .map(compactMatch),
    notifications: {
      unreadCount: notifications.filter((notification) => !notification.read_at).length,
      latest: notifications.map((notification) => ({
        type: readString(notification.type) ?? "notification",
        title: readString(notification.title) ?? "",
        message: readString(notification.message) ?? "",
        read: Boolean(notification.read_at),
        createdAt: readString(notification.created_at),
      })),
    },
  }
}

async function loadUserTeams(
  supabaseAdmin: SupabaseAdmin,
  playerIds: string[],
  notices: AiContextNotice[],
): Promise<NonNullable<AiLiveContext["user"]>["teams"]> {
  const [ownedResult, membershipsResult] = await Promise.all([
    supabaseAdmin
      .from("teams")
      .select("id, name, status, owner_player_id")
      .in("owner_player_id", playerIds),
    supabaseAdmin
      .from("team_members")
      .select("team_id, player_id, role")
      .in("player_id", playerIds),
  ])

  const ownedTeams = rowsOrNotice(ownedResult, notices, "user.ownedTeams")
  const memberships = rowsOrNotice(membershipsResult, notices, "user.teamMemberships")
  const teamIds = Array.from(
    new Set([
      ...ownedTeams.map((team) => readString(team.id)).filter(isString),
      ...memberships.map((membership) => readString(membership.team_id)).filter(isString),
    ]),
  )

  if (teamIds.length === 0) return []

  const teamsResult = await supabaseAdmin
    .from("teams")
    .select("id, name, status, owner_player_id")
    .in("id", teamIds)
  const teamRows = rowsOrNotice(teamsResult, notices, "user.teams")
  const roleByTeam = new Map<string, "owner" | "captain" | "member" | "substitute">()

  ownedTeams.forEach((team) => {
    const teamId = readString(team.id)
    if (teamId) roleByTeam.set(teamId, "owner")
  })
  memberships.forEach((membership) => {
    const teamId = readString(membership.team_id)
    if (!teamId || roleByTeam.get(teamId) === "owner") return
    roleByTeam.set(teamId, normalizeRole(readString(membership.role)))
  })

  const managerTeamIds = teamIds.filter((teamId) => {
    const role = roleByTeam.get(teamId)
    return role === "owner" || role === "captain"
  })
  const rosterByTeam = await loadRosterByTeam(supabaseAdmin, managerTeamIds, notices)

  return teamRows.map((team) => {
    const teamId = readString(team.id) ?? ""
    const role = roleByTeam.get(teamId) ?? "member"

    return {
      id: teamId,
      name: readString(team.name) ?? "Team",
      status: readString(team.status),
      role,
      ...(rosterByTeam.has(teamId) ? { roster: rosterByTeam.get(teamId) } : {}),
    }
  })
}

async function loadRosterByTeam(
  supabaseAdmin: SupabaseAdmin,
  teamIds: string[],
  notices: AiContextNotice[],
) {
  const rosterByTeam = new Map<string, Array<{ displayName: string; role: string | null; status: string | null }>>()
  if (teamIds.length === 0) return rosterByTeam

  const result = await supabaseAdmin
    .from("team_members")
    .select("team_id, role, players:players(display_name, nickname, name, status)")
    .in("team_id", teamIds)
    .limit(80)
  const rows = rowsOrNotice(result, notices, "user.teamRosters")

  rows.forEach((row) => {
    const teamId = readString(row.team_id)
    if (!teamId) return
    const roster = rosterByTeam.get(teamId) ?? []
    roster.push({
      displayName: readDisplayName(row.players) ?? "Player",
      role: readString(row.role),
      status: readString(readFirst(row.players)?.status),
    })
    rosterByTeam.set(teamId, roster)
  })

  return rosterByTeam
}

async function buildAdminContext(
  supabaseAdmin: SupabaseAdmin,
  notices: AiContextNotice[],
): Promise<AiLiveContext["admin"]> {
  const [registrations, applications, teams, disputes, matches] = await Promise.all([
    supabaseAdmin
      .from("tournament_registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("player_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("match_disputes")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "under_review"]),
    supabaseAdmin
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "upcoming"),
  ])

  return {
    pendingRegistrations: countOrNotice(registrations, notices, "admin.pendingRegistrations"),
    pendingPlayerApplications: countOrNotice(applications, notices, "admin.pendingPlayerApplications"),
    pendingTeams: countOrNotice(teams, notices, "admin.pendingTeams"),
    openDisputes: countOrNotice(disputes, notices, "admin.openDisputes"),
    upcomingMatches: countOrNotice(matches, notices, "admin.upcomingMatches"),
  }
}

function compactMatch(match: {
  id: string
  round: string | null
  bracket_round?: string | null
  team1: string | null
  team2: string | null
  status: string
  scheduled_at: string | null
  schedule_note: string | null
}) {
  return {
    id: match.id,
    round: match.round ?? match.bracket_round ?? null,
    teams: [match.team1, match.team2] as [string | null, string | null],
    status: match.status,
    scheduledAt: match.scheduled_at,
    scheduleNote: match.schedule_note,
  }
}

function rowsOrNotice<T extends { error?: unknown; data?: unknown }>(
  result: T,
  notices: AiContextNotice[],
  scope: string,
) {
  if (result.error) {
    console.error(`AI context: failed to load ${scope}`, result.error)
    notices.push({ scope, message: "This data could not be loaded." })
    return [] as Record<string, unknown>[]
  }

  return Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : []
}

function countOrNotice(
  result: { error?: unknown; count?: number | null },
  notices: AiContextNotice[],
  scope: string,
) {
  if (result.error) {
    console.error(`AI context: failed to count ${scope}`, result.error)
    notices.push({ scope, message: "This admin summary could not be loaded." })
    return 0
  }

  return result.count ?? 0
}

function normalizeRole(role: string | null): "owner" | "captain" | "member" | "substitute" {
  if (role === "captain") return "captain"
  if (role === "sub" || role === "substitute") return "substitute"
  return "member"
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function readFirst(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return value[0] && typeof value[0] === "object" ? value[0] : null
  }

  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function readJoinedName(value: unknown) {
  return readString(readFirst(value)?.name)
}

function readDisplayName(value: unknown) {
  const row = readFirst(value)
  return (
    readString(row?.display_name) ??
    readString(row?.nickname) ??
    readString(row?.name)
  )
}
