import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { MatchScheduleItem } from "@/components/match-schedule"
import type { ResultCard } from "@/components/results"
import { formatEventMonthYear } from "@/lib/date-format"
import { getLanguage } from "@/lib/i18n/server"
import { getDisplayGameName } from "@/lib/games"
import { getMatchesForTournament, type TournamentMatch } from "@/lib/data/matches"
import {
  readNullableInteger,
  readNullableString,
  readNonNegativeInteger,
  readParticipantType,
  readStringId,
} from "@/lib/data/normalize"
import { getResultsForTournament, type TournamentResult } from "@/lib/data/results"
import { formatMatchScheduleTime } from "@/lib/matches/schedule"
import {
  calculateEloRankings,
  findRankingRow,
  type RankingParticipant,
  type RankingRow,
} from "@/lib/rankings/elo"
import {
  calculateParticipantStats,
  filterDuplicateBracketMatches,
  type ParticipantStats,
} from "@/lib/stats/participants"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { supabase } from "@/lib/supabase/client"

export type PublicProfileKind = "team" | "player"

export type PublicProfileRecord = {
  id: string
  tournament_id: string
  kind: PublicProfileKind
  name: string
  display_name: string
  nickname: string | null
  region: string | null
  image_url: string | null
  image_updated_at: string | null
  seed: number | null
  rating: number | null
  rating_matches_played: number | null
  rank_position: number | null
  wins: number
  losses: number
  participant_id: string | null
  status: string | null
  captain_name: string | null
  member_count: number | null
  user_id?: string | null
  discord_username?: string | null
  owner_player_id?: string | null
  created_at?: string | null
}

export type PublicProfileConnection = {
  id: string
  label: string
  href?: string
  meta?: string | null
}

export type PublicProfileData = {
  profile: PublicProfileRecord
  tournamentName: string | null
  connections: PublicProfileConnection[]
  stats: ParticipantStats
  ranking: RankingRow | null
  matches: MatchScheduleItem[]
  results: ResultCard[]
  teamMembers?: PublicTeamMember[]
  teamTournamentHistory?: PublicTeamTournamentHistory[]
  playerTeams?: PublicPlayerTeam[]
  playerTournamentHistory?: PublicPlayerTournamentHistory[]
  playerMatchHistory?: PublicPlayerMatchHistory[]
  playerGameStats?: PublicPlayerGameStat[]
}

export type PublicTeamMember = {
  player_id: string
  role: "owner" | "captain" | "member" | "substitute"
  display_name: string
  real_name: string | null
  region: string | null
  avatar_url: string | null
  href: string
}

export type PublicTeamTournamentHistory = {
  id: string
  tournament_id: string
  tournament_name: string
  game: string | null
  tournament_status: string | null
  registration_status: string | null
  participant_id: string | null
  placement: number | null
  event_date: string | null
  created_at: string | null
}

export type PublicPlayerTeam = {
  id: string
  name: string
  status: string | null
  role: "owner" | "captain" | "member" | "substitute"
  logo_url: string | null
  href: string
}

export type PublicPlayerTournamentHistory = {
  id: string
  tournament_id: string
  tournament_name: string
  game: string | null
  tournament_status: string | null
  registration_status: string | null
  participant_type: "player" | "team"
  team_name: string | null
  participant_id: string | null
  placement: number | null
  event_date: string | null
  created_at: string | null
}

export type PublicPlayerMatchHistory = {
  id: string
  tournament_id: string
  tournament_name: string
  game: string | null
  opponent: string
  date: string | null
  scoreline: string | null
  result: "win" | "loss" | "draw"
  status: "upcoming" | "live" | "finished"
}

export type PublicPlayerGameStat = {
  game: string
  matches: number
  wins: number
  losses: number
  winRate: number
  rating: number | null
}

type ProfileParticipant = {
  id: string
  tournament_id: string
  participant_type: PublicProfileKind
  display_name: string
  region: string | null
  seed: number | null
  logo_url: string | null
  avatar_url: string | null
  source_team_id: string | null
  source_player_id: string | null
}

type ProfileTournament = {
  id: string
  name: string | null
  event_date: string | null
}

type ProfileTeam = {
  id: string
  tournament_id: string
  name: string
  seed: number | null
  rating: number | null
  rating_matches_played: number | null
  rank_position: number | null
  wins: number
  losses: number
  status: string | null
  owner_player_id?: string | null
  logo_url?: string | null
  created_at?: string | null
}

type ProfilePlayer = {
  id: string
  tournament_id: string | null
  name: string
  nickname: string | null
  region: string | null
  display_name: string
  seed: number | null
  rating: number | null
  rating_matches_played: number | null
  rank_position: number | null
  wins: number
  losses: number
  status: string | null
  user_id: string | null
  owner_profile: ProfilePlayerOwnerProfile | null
}

type ProfilePlayerOwnerProfile = {
  avatar_url: string | null
  discord_username: string | null
  display_name: string | null
  updated_at: string | null
}

const PLAYER_SELECT_WITH_REGION =
  "id, tournament_id, name, nickname, region, seed, rating, rating_matches_played, rank_position, wins, losses, status, user_id, owner_profile:user_profiles!players_owner_user_id_fkey(avatar_url, discord_username, display_name, updated_at)"
const PLAYER_SELECT_WITH_REGION_NO_RATING =
  "id, tournament_id, name, nickname, region, seed, wins, losses, status, user_id, owner_profile:user_profiles!players_owner_user_id_fkey(avatar_url, discord_username, display_name, updated_at)"
const PLAYER_SELECT_FALLBACK =
  "id, tournament_id, name, nickname, seed, wins, losses, status, user_id"
const TEAM_SELECT_WITH_RATING =
  "id, tournament_id, name, seed, rating, rating_matches_played, rank_position, wins, losses, status, owner_player_id, logo_url, created_at"
const TEAM_SELECT_FALLBACK = "id, tournament_id, name, seed, wins, losses, status, owner_player_id, logo_url, created_at"
const PARTICIPANT_SELECT_WITH_REGION =
  "id, tournament_id, participant_type, display_name, region, seed, logo_url, avatar_url, source_team_id, source_player_id"
const PARTICIPANT_SELECT_FALLBACK =
  "id, tournament_id, participant_type, display_name, seed, logo_url, avatar_url, source_team_id, source_player_id"

export async function getPublicTeamProfile(
  id: string,
): Promise<PublicProfileData | null> {
  return getPublicProfile("team", id)
}

export async function getPublicPlayerProfile(
  id: string,
): Promise<PublicProfileData | null> {
  return getPublicProfile("player", id)
}

async function getPublicProfile(
  kind: PublicProfileKind,
  id: string,
): Promise<PublicProfileData | null> {
  noStore()

  if (!supabase) {
    console.warn("Skipping public profile query because Supabase is not configured.")
    return null
  }

  const routePlayer = kind === "player" ? await findPlayer(id) : null
  const participant = routePlayer ? null : await findParticipant(kind, id)
  const sourceId =
    kind === "team" ? participant?.source_team_id : participant?.source_player_id

  const source =
    kind === "team"
      ? await findTeam(sourceId ?? id)
      : routePlayer ??
        await findPlayerForProfile({
          id,
          participant,
          sourceId,
        })

  if (!source && !participant) return null

  const sourceParticipant =
    participant ??
    (source
      ? await findParticipantBySource(kind, source.id)
      : null)
  const tournamentId = sourceParticipant?.tournament_id ?? (kind === "team" ? source?.tournament_id : null)

  const [tournament, matches, results, rankingParticipants] = tournamentId
    ? await Promise.all([
        findTournament(tournamentId),
        getMatchesForTournament(tournamentId),
        getResultsForTournament(tournamentId),
        fetchRankingParticipants(tournamentId, kind),
      ])
    : [null, [], [], []]

  const lang = await getLanguage()

  // Resolve captain display name & member count & team members if it is a team
  let captainName: string | null = null
  let memberCount: number | null = null
  let status: string | null = null
  let teamMembers: PublicTeamMember[] = []
  let teamTournamentHistory: PublicTeamTournamentHistory[] = []
  let playerTeams: PublicPlayerTeam[] = []
  let playerTournamentHistory: PublicPlayerTournamentHistory[] = []
  let playerMatchHistory: PublicPlayerMatchHistory[] = []
  let playerGameStats: PublicPlayerGameStat[] = []
  let connections: PublicProfileConnection[] = []

  if (kind === "team") {
    const teamId = source?.id ?? id
    const teamSource = source as ProfileTeam | null
    const membersRes = await supabase
      .from("team_members")
      .select(`
        player_id,
        role,
        players!team_members_player_id_fkey(display_name, nickname, name, real_name, region, avatar_url)
      `)
      .eq("team_id", teamId)

    if (membersRes.data) {
      teamMembers = (membersRes.data ?? [])
        .map((m: any) => {
          const displayName = m.players?.display_name ?? m.players?.nickname ?? m.players?.name ?? "Unknown player"
          const role = teamSource?.owner_player_id === m.player_id ? "owner" : normalizePublicTeamRole(m.role)

          return {
            player_id: m.player_id,
            role,
            display_name: displayName,
            real_name: m.players?.real_name ?? null,
            region: m.players?.region ?? null,
            avatar_url: m.players?.avatar_url ?? null,
            href: `/players/${m.player_id}`,
          }
        })
        .sort(comparePublicTeamMembers)

      memberCount = teamMembers.length

      const captain = teamMembers.find((m) => m.role === "captain") ?? teamMembers.find((m) => m.role === "owner")
      if (captain) {
        captainName = captain.display_name
      }
    }

    if (source && "status" in source) {
      status = source.status
    }

    teamTournamentHistory = await getTeamTournamentHistory(teamId, profileNameCandidates(source, sourceParticipant))
  } else if (kind === "player") {
    const playerId = source?.id ?? id

    // Fetch team memberships
    const membershipsRes = await supabase
      .from("team_members")
      .select(`
        role,
        team:teams(id, name, status, logo_url)
      `)
      .eq("player_id", playerId)

    // Fetch owned teams
    const ownedTeamsRes = await supabase
      .from("teams")
      .select("id, name, status, logo_url")
      .eq("owner_player_id", playerId)

    const teamMap = new Map<string, PublicPlayerTeam>()

    if (membershipsRes.data) {
      for (const m of membershipsRes.data) {
        const t = m.team as any
        if (t && t.id && t.status === "approved") {
          teamMap.set(t.id, {
            id: t.id,
            name: t.name,
            status: t.status,
            logo_url: t.logo_url,
            role: normalizePublicTeamRole(m.role),
            href: `/teams/${t.id}`,
          })
        }
      }
    }

    if (ownedTeamsRes.data) {
      for (const t of ownedTeamsRes.data) {
        if (t.status === "approved") {
          if (!teamMap.has(t.id)) {
            teamMap.set(t.id, {
              id: t.id,
              name: t.name,
              status: t.status,
              logo_url: t.logo_url,
              role: "owner",
              href: `/teams/${t.id}`,
            })
          } else {
            const existing = teamMap.get(t.id)
            if (existing) {
              teamMap.set(t.id, {
                ...existing,
                role: "owner",
              })
            }
          }
        }
      }
    }

    playerTeams = Array.from(teamMap.values()).sort(comparePublicPlayerTeams)

    connections = playerTeams.map((t) => ({
      id: t.id,
      label: t.name,
      href: `/teams/${t.id}`,
      meta: t.role === "owner" ? "Власник" : t.role === "captain" ? "Капітан" : t.role === "substitute" ? "Запасний" : "Учасник",
      logoUrl: t.logo_url ?? null,
      role: t.role,
    }))

    const playerHistory = await getPlayerPublicHistory({
      playerId,
      playerNameCandidates: profileNameCandidates(source, sourceParticipant),
      playerTeams,
      profileRating: source && "rating" in source ? source.rating : null,
    })
    playerTournamentHistory = playerHistory.tournaments
    playerMatchHistory = playerHistory.matches
    playerGameStats = playerHistory.gameStats
  }

  const profile = toPublicProfileRecord({
    kind,
    participant: sourceParticipant,
    source,
    status,
    captainName,
    memberCount,
  })

  return {
    profile,
    tournamentName: tournament?.name ?? null,
    connections,
    stats: calculateParticipantStats({
      matches,
      identity: {
        participantId: profile.participant_id,
        displayName: profile.display_name,
        name: profile.name,
        nickname: profile.nickname,
      },
    }),
    ranking: findRankingRow(
      calculateEloRankings({
        participants: rankingParticipants,
        matches,
        participantType: kind,
      }),
      profile.participant_id,
      profile.display_name,
    ),
    matches: getProfileMatches(matches, profile),
    results: getProfileResults(results, tournament, profile, lang),
    teamMembers,
    teamTournamentHistory,
    playerTeams,
    playerTournamentHistory,
    playerMatchHistory,
    playerGameStats,
  }
}

async function findParticipant(kind: PublicProfileKind, id: string) {
  const byId = await findParticipantById(kind, id)
  if (byId) return byId

  return findParticipantBySource(kind, id)
}

async function findParticipantById(kind: PublicProfileKind, id: string) {
  try {
    const result = await supabase!
      .from("participants")
      .select(PARTICIPANT_SELECT_WITH_REGION)
      .eq("id", id)
      .eq("participant_type", kind)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await supabase!
        .from("participants")
        .select(PARTICIPANT_SELECT_FALLBACK)
        .eq("id", id)
        .eq("participant_type", kind)
        .maybeSingle()

      if (fallbackResult.error) {
        if (!isMissingRelationError(fallbackResult.error)) {
          console.error("Failed to fetch public participant by id:", fallbackResult.error)
        }
        return null
      }

      return fallbackResult.data ? normalizeParticipant(fallbackResult.data) : null
    }

    if (result.error) {
      if (!isMissingRelationError(result.error)) {
        console.error("Failed to fetch public participant by id:", result.error)
      }
      return null
    }

    return result.data ? normalizeParticipant(result.data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public participant by id:", error)
    return null
  }
}

async function findParticipantBySource(kind: PublicProfileKind, id: string) {
  const sourceColumn = kind === "team" ? "source_team_id" : "source_player_id"

  try {
    const result = await supabase!
      .from("participants")
      .select(PARTICIPANT_SELECT_WITH_REGION)
      .eq(sourceColumn, id)
      .eq("participant_type", kind)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await supabase!
        .from("participants")
        .select(PARTICIPANT_SELECT_FALLBACK)
        .eq(sourceColumn, id)
        .eq("participant_type", kind)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallbackResult.error) {
        if (!isMissingRelationError(fallbackResult.error)) {
          console.error("Failed to fetch public participant by source:", fallbackResult.error)
        }
        return null
      }

      return fallbackResult.data ? normalizeParticipant(fallbackResult.data) : null
    }

    if (result.error) {
      if (!isMissingRelationError(result.error)) {
        console.error("Failed to fetch public participant by source:", result.error)
      }
      return null
    }

    return result.data ? normalizeParticipant(result.data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public participant by source:", error)
    return null
  }
}

async function findTeam(id: string | null): Promise<ProfileTeam | null> {
  if (!id) return null
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("teams")
      .select(TEAM_SELECT_WITH_RATING)
      .eq("id", id)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await profileClient
        .from("teams")
        .select(TEAM_SELECT_FALLBACK)
        .eq("id", id)
        .maybeSingle()

      if (fallbackResult.error) {
        console.error("Failed to fetch public team profile:", fallbackResult.error)
        return null
      }

      return fallbackResult.data ? normalizeTeam(fallbackResult.data) : null
    }

    if (result.error) {
      console.error("Failed to fetch public team profile:", result.error)
      return null
    }

    return result.data ? normalizeTeam(result.data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public team profile:", error)
    return null
  }
}

async function findPlayer(id: string | null): Promise<ProfilePlayer | null> {
  if (!id) return null
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("players")
      .select(PLAYER_SELECT_WITH_REGION)
      .eq("id", id)
      .maybeSingle()

    if (result.error && isMissingColumnError(result.error)) {
      return findPlayerWithFallbackSelect(profileClient, id)
    }

    if (result.error) {
      console.error("Failed to fetch public player profile:", result.error)
      return null
    }

    const player = result.data ? normalizePlayer(result.data) : null
    if (!player || player.region) return player

    const country = await findPlayerCountry(id)
    return country ? { ...player, region: country } : player
  } catch (error) {
    console.error("Unexpected error while fetching public player profile:", error)
    return null
  }
}

async function findPlayerWithFallbackSelect(
  profileClient: SupabaseClient,
  id: string,
): Promise<ProfilePlayer | null> {
  const result = await profileClient
    .from("players")
    .select(PLAYER_SELECT_WITH_REGION_NO_RATING)
    .eq("id", id)
    .maybeSingle()

  if (result.error && isMissingColumnError(result.error)) {
    const fallbackResult = await profileClient
      .from("players")
      .select(PLAYER_SELECT_FALLBACK)
      .eq("id", id)
      .maybeSingle()

    if (fallbackResult.error) {
      console.error("Failed to fetch public player profile:", fallbackResult.error)
      return null
    }

    const player = fallbackResult.data ? normalizePlayer(fallbackResult.data) : null
    if (!player || player.region) return player

    const country = await findPlayerCountry(id)
    return country ? { ...player, region: country } : player
  }

  if (result.error) {
    console.error("Failed to fetch public player profile:", result.error)
    return null
  }

  const player = result.data ? normalizePlayer(result.data) : null
  if (!player || player.region) return player

  const country = await findPlayerCountry(id)
  return country ? { ...player, region: country } : player
}

async function findPlayerForProfile({
  id,
  participant,
  sourceId,
}: {
  id: string
  participant: ProfileParticipant | null
  sourceId: string | null | undefined
}) {
  const sourcePlayer = await findPlayer(sourceId ?? null)
  if (sourcePlayer) return sourcePlayer

  const routePlayer = await findPlayer(id)
  if (routePlayer) return routePlayer

  return participant ? findPlayerByParticipant(participant) : null
}

async function findPlayerByParticipant(
  participant: ProfileParticipant,
): Promise<ProfilePlayer | null> {
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("players")
      .select(PLAYER_SELECT_WITH_REGION)
      .eq("tournament_id", participant.tournament_id)

    if (result.error && isMissingColumnError(result.error)) {
      return findPlayerByParticipantWithFallbackSelect(
        profileClient,
        participant,
      )
    }

    if (result.error) {
      console.error("Failed to fetch public players by participant:", result.error)
      return null
    }

    const player = resolvePlayerByParticipant(result.data, participant)
    if (!player || player.region) return player

    const country = await findPlayerCountry(player.id)
    return country ? { ...player, region: country } : player
  } catch (error) {
    console.error("Unexpected error while fetching public players by participant:", error)
    return null
  }
}

async function findPlayerByParticipantWithFallbackSelect(
  profileClient: SupabaseClient,
  participant: ProfileParticipant,
): Promise<ProfilePlayer | null> {
  const result = await profileClient
    .from("players")
    .select(PLAYER_SELECT_WITH_REGION_NO_RATING)
    .eq("tournament_id", participant.tournament_id)

  if (result.error && isMissingColumnError(result.error)) {
    const fallbackResult = await profileClient
      .from("players")
      .select(PLAYER_SELECT_FALLBACK)
      .eq("tournament_id", participant.tournament_id)

    if (fallbackResult.error) {
      console.error("Failed to fetch public players by participant:", fallbackResult.error)
      return null
    }

    const player = resolvePlayerByParticipant(fallbackResult.data, participant)
    if (!player || player.region) return player

    const country = await findPlayerCountry(player.id)
    return country ? { ...player, region: country } : player
  }

  if (result.error) {
    console.error("Failed to fetch public players by participant:", result.error)
    return null
  }

  const player = resolvePlayerByParticipant(result.data, participant)
  if (!player || player.region) return player

  const country = await findPlayerCountry(player.id)
  return country ? { ...player, region: country } : player
}

async function findPlayerCountry(id: string) {
  const profileClient = createProfileReadClient()

  try {
    const { data, error } = await profileClient
      .from("players")
      .select("country")
      .eq("id", id)
      .maybeSingle()

    if (error) return null

    return readNullableString(data?.country)
  } catch {
    return null
  }
}

function createProfileReadClient() {
  return createSupabaseAdminClient() ?? supabase!
}

async function findTournament(id: string): Promise<ProfileTournament | null> {
  try {
    const { data, error } = await supabase!
      .from("tournaments")
      .select("id, name, event_date")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Failed to fetch public profile tournament:", error)
      return null
    }

    return data ? normalizeTournament(data) : null
  } catch (error) {
    console.error("Unexpected error while fetching public profile tournament:", error)
    return null
  }
}

function toPublicProfileRecord({
  kind,
  participant,
  source,
  status = null,
  captainName = null,
  memberCount = null,
}: {
  kind: PublicProfileKind
  participant: ProfileParticipant | null
  source: ProfileTeam | ProfilePlayer | null
  status?: string | null
  captainName?: string | null
  memberCount?: number | null
}): PublicProfileRecord {
  const displayName =
    participant?.display_name ??
    (source && "display_name" in source ? source.display_name : source?.name) ??
    "Untitled profile"

  const effectiveStatus = status ?? (source && "status" in source ? source.status : null) ?? null

  return {
    id: source?.id ?? participant?.id ?? "",
    tournament_id: source?.tournament_id ?? participant?.tournament_id ?? "",
    kind,
    name: source?.name ?? displayName,
    display_name: displayName,
    nickname: source && "nickname" in source ? source.nickname : null,
    region: source && "region" in source ? source.region ?? participant?.region ?? null : participant?.region ?? null,
    image_url:
      kind === "team"
        ? participant?.logo_url ?? participant?.avatar_url ?? (source && "logo_url" in source ? source.logo_url : null) ?? null
        : source && "owner_profile" in source
          ? source.owner_profile?.avatar_url ?? participant?.avatar_url ?? participant?.logo_url ?? null
          : participant?.avatar_url ?? participant?.logo_url ?? null,
    image_updated_at:
      kind === "player" && source && "owner_profile" in source
        ? source.owner_profile?.updated_at ?? null
        : null,
    seed: participant?.seed ?? source?.seed ?? null,
    rating: source?.rating ?? null,
    rating_matches_played: source?.rating_matches_played ?? null,
    rank_position: source?.rank_position ?? null,
    wins: source?.wins ?? 0,
    losses: source?.losses ?? 0,
    participant_id: participant?.id ?? null,
    status: effectiveStatus,
    captain_name: captainName,
    member_count: memberCount,
    user_id: source && "user_id" in source ? source.user_id : null,
    discord_username: source && "owner_profile" in source ? source.owner_profile?.discord_username ?? null : null,
    owner_player_id: source && "owner_player_id" in source ? source.owner_player_id : null,
    created_at: source && "created_at" in source ? source.created_at ?? null : null,
  }
}

function getProfileMatches(
  matches: TournamentMatch[],
  profile: PublicProfileRecord,
): MatchScheduleItem[] {
  const connectedMatches = matches.filter((match) =>
    isMatchConnectedToProfile(match, profile),
  )

  return filterDuplicateBracketMatches(connectedMatches)
    .slice(0, 6)
    .map((match) => ({
      id: match.id,
      round: formatRoundLabel(match.round),
      teamA: match.team1 ?? "TBD",
      teamB: match.team2 ?? "TBD",
      time: formatMatchScheduleTime({
        scheduledAt: match.scheduled_at,
        timezone: match.timezone,
        scheduleNote: match.schedule_note,
      }),
      status: match.status,
      score1: match.score1,
      score2: match.score2,
    }))
}

async function getTeamTournamentHistory(
  teamId: string,
  nameCandidates: string[],
): Promise<PublicTeamTournamentHistory[]> {
  try {
    const registrationsResult = await supabase!
      .from("tournament_registrations")
      .select(`
        id,
        tournament_id,
        status,
        participant_id,
        created_at,
        tournaments:tournaments(id, name, game, status, event_date)
      `)
      .or(`team_id.eq.${teamId},source_team_id.eq.${teamId}`)
      .order("created_at", { ascending: false })

    if (registrationsResult.error) {
      if (!isMissingColumnError(registrationsResult.error)) {
        console.error("Failed to fetch team tournament history:", registrationsResult.error)
      }
      return []
    }

    const rows = registrationsResult.data ?? []
    if (rows.length === 0) return []

    const tournamentIds = rows
      .map((row: any) => readStringId(row.tournament_id))
      .filter((value): value is string => Boolean(value))

    const resultsByParticipant = new Map<string, number>()
    const resultsByTournamentAndName = new Map<string, number>()

    if (tournamentIds.length > 0) {
      const resultsResult = await supabase!
        .from("results")
        .select("tournament_id, participant_id, team, placement")
        .in("tournament_id", tournamentIds)

      if (!resultsResult.error) {
        for (const result of resultsResult.data ?? []) {
          const participantId = readStringId((result as any).participant_id)
          const placement = readNullableInteger((result as any).placement)
          const tournamentId = readStringId((result as any).tournament_id)
          const teamName = readNullableString((result as any).team)

          if (participantId && placement !== null) {
            resultsByParticipant.set(participantId, placement)
          }

          if (tournamentId && teamName && placement !== null) {
            resultsByTournamentAndName.set(`${tournamentId}:${normalizeName(teamName)}`, placement)
          }
        }
      }
    }

    return rows.map((row: any) => {
      const tournament = row.tournaments as any
      const participantId = readStringId(row.participant_id)
      const tournamentId = readStringId(row.tournament_id) ?? ""
      const placement =
        (participantId ? resultsByParticipant.get(participantId) : undefined) ??
        nameCandidates
          .map((name) => resultsByTournamentAndName.get(`${tournamentId}:${normalizeName(name)}`))
          .find((value) => value !== undefined) ??
        null

      return {
        id: readStringId(row.id) ?? `${tournamentId}-${readNullableString(row.created_at) ?? "registration"}`,
        tournament_id: tournamentId,
        tournament_name: readNullableString(tournament?.name) ?? "Tournament",
        game: getDisplayGameName(readNullableString(tournament?.game)),
        tournament_status: readNullableString(tournament?.status),
        registration_status: readNullableString(row.status),
        participant_id: participantId,
        placement,
        event_date: readNullableString(tournament?.event_date),
        created_at: readNullableString(row.created_at),
      }
    })
  } catch (error) {
    console.error("Unexpected error while fetching team tournament history:", error)
    return []
  }
}

async function getPlayerPublicHistory({
  playerId,
  playerNameCandidates,
  playerTeams,
  profileRating,
}: {
  playerId: string
  playerNameCandidates: string[]
  playerTeams: PublicPlayerTeam[]
  profileRating: number | null
}): Promise<{
  tournaments: PublicPlayerTournamentHistory[]
  matches: PublicPlayerMatchHistory[]
  gameStats: PublicPlayerGameStat[]
}> {
  const empty = { tournaments: [], matches: [], gameStats: [] }
  const teamIds = playerTeams.map((team) => team.id)
  const teamById = new Map(playerTeams.map((team) => [team.id, team]))

  try {
    const registrationFilters = [
      `player_id.eq.${playerId}`,
      `source_player_id.eq.${playerId}`,
      ...(teamIds.length > 0
        ? [`team_id.in.(${teamIds.join(",")})`, `source_team_id.in.(${teamIds.join(",")})`]
        : []),
    ]

    const registrationsResult = await supabase!
      .from("tournament_registrations")
      .select(`
        id,
        tournament_id,
        status,
        registration_type,
        player_id,
        source_player_id,
        team_id,
        source_team_id,
        participant_id,
        created_at,
        tournaments:tournaments(id, name, game, status, event_date)
      `)
      .or(registrationFilters.join(","))
      .order("created_at", { ascending: false })

    if (registrationsResult.error) {
      if (!isMissingColumnError(registrationsResult.error)) {
        console.error("Failed to fetch player tournament history:", registrationsResult.error)
      }
      return empty
    }

    const rows = registrationsResult.data ?? []
    if (rows.length === 0) return empty

    const tournamentIds = Array.from(
      new Set(
        rows
          .map((row: any) => readStringId(row.tournament_id))
          .filter((value): value is string => Boolean(value)),
      ),
    )

    const [matchesByTournament, resultsByTournament] = await Promise.all([
      Promise.all(tournamentIds.map((tournamentId) => getMatchesForTournament(tournamentId))),
      Promise.all(tournamentIds.map((tournamentId) => getResultsForTournament(tournamentId))),
    ])

    const results = resultsByTournament.flat()
    const resultPlacementByParticipant = new Map<string, number>()
    const resultPlacementByTournamentAndName = new Map<string, number>()

    for (const result of results) {
      if (result.placement === null) continue

      if (result.participant_id) {
        resultPlacementByParticipant.set(result.participant_id, result.placement)
      }

      if (result.team) {
        resultPlacementByTournamentAndName.set(
          `${result.tournament_id}:${normalizeName(result.team)}`,
          result.placement,
        )
      }
    }

    const participantIds = new Set<string>()
    const namesByTournament = new Map<string, Set<string>>()
    const tournamentMeta = new Map<string, { name: string; game: string | null; status: string | null; eventDate: string | null }>()

    const tournaments = rows.map((row: any) => {
      const tournament = row.tournaments as any
      const tournamentId = readStringId(row.tournament_id) ?? ""
      const participantId = readStringId(row.participant_id)
      const teamId = readStringId(row.team_id) ?? readStringId(row.source_team_id)
      const team = teamId ? teamById.get(teamId) : null
      const participantType = team ? "team" : "player"
      const names = namesByTournament.get(tournamentId) ?? new Set<string>()
      const nameCandidates = team ? [team.name] : playerNameCandidates

      for (const name of nameCandidates) {
        names.add(normalizeName(name))
      }
      namesByTournament.set(tournamentId, names)

      if (participantId) {
        participantIds.add(participantId)
      }

      tournamentMeta.set(tournamentId, {
        name: readNullableString(tournament?.name) ?? "Tournament",
        game: getDisplayGameName(readNullableString(tournament?.game)),
        status: readNullableString(tournament?.status),
        eventDate: readNullableString(tournament?.event_date),
      })

      const placement =
        (participantId ? resultPlacementByParticipant.get(participantId) : undefined) ??
        nameCandidates
          .map((name) => resultPlacementByTournamentAndName.get(`${tournamentId}:${normalizeName(name)}`))
          .find((value) => value !== undefined) ??
        null

      return {
        id: readStringId(row.id) ?? `${tournamentId}-${participantType}`,
        tournament_id: tournamentId,
        tournament_name: readNullableString(tournament?.name) ?? "Tournament",
        game: getDisplayGameName(readNullableString(tournament?.game)),
        tournament_status: readNullableString(tournament?.status),
        registration_status: readNullableString(row.status),
        participant_type: participantType,
        team_name: team?.name ?? null,
        participant_id: participantId,
        placement,
        event_date: readNullableString(tournament?.event_date),
        created_at: readNullableString(row.created_at),
      } satisfies PublicPlayerTournamentHistory
    })

    const matches = filterDuplicateBracketMatches(matchesByTournament.flat())
      .filter((match) => isMatchConnectedToPlayerHistory(match, participantIds, namesByTournament))
      .map((match) => toPublicPlayerMatchHistory(match, participantIds, namesByTournament, tournamentMeta))
      .filter((match): match is PublicPlayerMatchHistory => match !== null)
      .sort(comparePlayerMatchHistoryNewestFirst)
      .slice(0, 10)

    return {
      tournaments,
      matches,
      gameStats: buildPlayerGameStats(matches, profileRating),
    }
  } catch (error) {
    console.error("Unexpected error while fetching player public history:", error)
    return empty
  }
}

function getProfileResults(
  results: TournamentResult[],
  tournament: ProfileTournament | null,
  profile: PublicProfileRecord,
  lang?: "uk" | "en",
): ResultCard[] {
  const placements = results
    .filter((result) => isResultConnectedToProfile(result, profile))
    .filter(
      (result): result is TournamentResult & { placement: 1 | 2 | 3; team: string } =>
        (result.placement === 1 ||
          result.placement === 2 ||
          result.placement === 3) &&
          Boolean(result.team),
    )
    .map((result) => ({
      placement: result.placement,
      team: result.team,
    }))

  if (placements.length === 0) return []

  return [
    {
      season: tournament?.name ?? "Tournament result",
      placements,
      mvp: results.find((result) => result.placement === 1)?.mvp ?? null,
      date: formatEventMonthYear(tournament?.event_date, lang),
    },
  ]
}

function isMatchConnectedToProfile(
  match: TournamentMatch,
  profile: PublicProfileRecord,
) {
  const participantId = profile.participant_id
  const names = new Set(
    [profile.display_name, profile.name, profile.nickname]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeName(value)),
  )

  return (
    (participantId &&
      (match.participant_1_id === participantId ||
        match.participant_2_id === participantId)) ||
    names.has(normalizeName(match.team1)) ||
    names.has(normalizeName(match.team2))
  )
}

function isResultConnectedToProfile(
  result: TournamentResult,
  profile: PublicProfileRecord,
) {
  const participantId = profile.participant_id
  const names = new Set(
    [profile.display_name, profile.name, profile.nickname]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeName(value)),
  )

  return (
    (participantId && result.participant_id === participantId) ||
    names.has(normalizeName(result.team))
  )
}

function normalizePublicTeamRole(role: unknown): PublicTeamMember["role"] {
  if (role === "owner") return "owner"
  if (role === "captain") return "captain"
  if (role === "substitute" || role === "sub") return "substitute"
  return "member"
}

function comparePublicTeamMembers(a: PublicTeamMember, b: PublicTeamMember) {
  const priority: Record<PublicTeamMember["role"], number> = {
    owner: 0,
    captain: 1,
    member: 2,
    substitute: 3,
  }

  return priority[a.role] - priority[b.role] || a.display_name.localeCompare(b.display_name)
}

function comparePublicPlayerTeams(a: PublicPlayerTeam, b: PublicPlayerTeam) {
  const priority: Record<PublicPlayerTeam["role"], number> = {
    owner: 0,
    captain: 1,
    member: 2,
    substitute: 3,
  }

  return priority[a.role] - priority[b.role] || a.name.localeCompare(b.name)
}

function isMatchConnectedToPlayerHistory(
  match: TournamentMatch,
  participantIds: Set<string>,
  namesByTournament: Map<string, Set<string>>,
) {
  const names = namesByTournament.get(match.tournament_id) ?? new Set<string>()

  return Boolean(
    (match.participant_1_id && participantIds.has(match.participant_1_id)) ||
      (match.participant_2_id && participantIds.has(match.participant_2_id)) ||
      names.has(normalizeName(match.team1)) ||
      names.has(normalizeName(match.team2)),
  )
}

function toPublicPlayerMatchHistory(
  match: TournamentMatch,
  participantIds: Set<string>,
  namesByTournament: Map<string, Set<string>>,
  tournamentMeta: Map<string, { name: string; game: string | null; status: string | null; eventDate: string | null }>,
): PublicPlayerMatchHistory | null {
  const slot = getPlayerHistoryMatchSlot(match, participantIds, namesByTournament)
  if (!slot) return null

  const result = getPlayerHistoryMatchResult(match, slot.slot)
  const tournament = tournamentMeta.get(match.tournament_id)

  return {
    id: match.id,
    tournament_id: match.tournament_id,
    tournament_name: tournament?.name ?? "Tournament",
    game: getDisplayGameName(tournament?.game),
    opponent: slot.opponentName ?? "TBD",
    date: match.scheduled_at ?? tournament?.eventDate ?? null,
    scoreline:
      match.score1 !== null && match.score2 !== null
        ? `${match.score1}-${match.score2}`
        : null,
    result,
    status: match.status,
  }
}

function getPlayerHistoryMatchSlot(
  match: TournamentMatch,
  participantIds: Set<string>,
  namesByTournament: Map<string, Set<string>>,
) {
  const names = namesByTournament.get(match.tournament_id) ?? new Set<string>()

  if (match.participant_1_id && participantIds.has(match.participant_1_id)) {
    return { slot: 1 as const, opponentName: match.team2 }
  }

  if (match.participant_2_id && participantIds.has(match.participant_2_id)) {
    return { slot: 2 as const, opponentName: match.team1 }
  }

  if (names.has(normalizeName(match.team1))) {
    return { slot: 1 as const, opponentName: match.team2 }
  }

  if (names.has(normalizeName(match.team2))) {
    return { slot: 2 as const, opponentName: match.team1 }
  }

  return null
}

function getPlayerHistoryMatchResult(match: TournamentMatch, slot: 1 | 2): PublicPlayerMatchHistory["result"] {
  if (match.status !== "finished") return "draw"

  if (match.winner_participant_id) {
    if (slot === 1) return match.participant_1_id === match.winner_participant_id ? "win" : "loss"
    return match.participant_2_id === match.winner_participant_id ? "win" : "loss"
  }

  if (match.score1 === null || match.score2 === null || match.score1 === match.score2) {
    return "draw"
  }

  if (slot === 1) return match.score1 > match.score2 ? "win" : "loss"
  return match.score2 > match.score1 ? "win" : "loss"
}

function comparePlayerMatchHistoryNewestFirst(
  left: PublicPlayerMatchHistory,
  right: PublicPlayerMatchHistory,
) {
  return getPublicHistoryTime(right.date) - getPublicHistoryTime(left.date)
}

function getPublicHistoryTime(date: string | null) {
  if (!date) return 0
  const time = new Date(date).getTime()
  return Number.isNaN(time) ? 0 : time
}

function buildPlayerGameStats(
  matches: PublicPlayerMatchHistory[],
  profileRating: number | null,
): PublicPlayerGameStat[] {
  const statsByGame = new Map<string, PublicPlayerGameStat>()

  for (const match of matches.filter((item) => item.status === "finished")) {
    const game = match.game ?? "Other"
    const current = statsByGame.get(game) ?? {
      game,
      matches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      rating: null,
    }

    current.matches += 1
    if (match.result === "win") current.wins += 1
    if (match.result === "loss") current.losses += 1
    current.winRate = current.matches > 0 ? Math.round((current.wins / current.matches) * 100) : 0
    statsByGame.set(game, current)
  }

  if (statsByGame.size === 1 && profileRating !== null) {
    const only = Array.from(statsByGame.values())[0]
    only.rating = profileRating
  }

  return Array.from(statsByGame.values()).sort((a, b) => a.game.localeCompare(b.game))
}

function profileNameCandidates(
  source: ProfileTeam | ProfilePlayer | null,
  participant: ProfileParticipant | null,
) {
  return Array.from(
    new Set(
      [
        participant?.display_name,
        source?.name,
        source && "display_name" in source ? source.display_name : null,
        source && "nickname" in source ? source.nickname : null,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function resolvePlayerByParticipant(
  rows: Record<string, unknown>[] | null,
  participant: ProfileParticipant,
) {
  const players = (rows ?? [])
    .map(normalizePlayer)
    .filter((player): player is ProfilePlayer => player !== null)
  const participantName = normalizeName(participant.display_name)

  return (
    players.find((player) => normalizeName(player.nickname) === participantName) ??
    players.find((player) => normalizeName(player.name) === participantName) ??
    players.find((player) => normalizeName(player.display_name) === participantName) ??
    null
  )
}

async function fetchRankingParticipants(
  tournamentId: string,
  kind: PublicProfileKind,
): Promise<RankingParticipant[]> {
  try {
    const result = await supabase!
      .from("participants")
      .select(PARTICIPANT_SELECT_WITH_REGION)
      .eq("tournament_id", tournamentId)
      .eq("participant_type", kind)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true })

    if (result.error && isMissingColumnError(result.error)) {
      const fallbackResult = await supabase!
        .from("participants")
        .select(PARTICIPANT_SELECT_FALLBACK)
        .eq("tournament_id", tournamentId)
        .eq("participant_type", kind)
        .order("seed", { ascending: true, nullsFirst: false })
        .order("display_name", { ascending: true })

      if (fallbackResult.error) {
        console.error("Failed to fetch ranking participants:", fallbackResult.error)
        return []
      }

      return createRankingParticipants(fallbackResult.data, kind)
    }

    if (result.error) {
      console.error("Failed to fetch ranking participants:", result.error)
      return []
    }

    return createRankingParticipants(result.data, kind)
  } catch (error) {
    console.error("Unexpected error while fetching ranking participants:", error)
    return []
  }
}

async function createRankingParticipants(
  rows: Record<string, unknown>[] | null,
  kind: PublicProfileKind,
) {
  const participants = (rows ?? [])
    .map(normalizeParticipant)
    .filter((participant): participant is ProfileParticipant => participant !== null)
  const startingRatings = await fetchParticipantStartingRatings(participants, kind)

  return participants.map((participant) => ({
    id: participant.id,
    displayName: participant.display_name,
    participantType: kind,
    startingRating: startingRatings.get(participant.id) ?? null,
  }))
}

async function fetchParticipantStartingRatings(
  participants: ProfileParticipant[],
  kind: PublicProfileKind,
) {
  const sourceIds = participants
    .map((participant) =>
      kind === "team" ? participant.source_team_id : participant.source_player_id,
    )
    .filter((id): id is string => Boolean(id))

  if (sourceIds.length === 0) return new Map<string, number>()

  const ratingsBySourceId =
    kind === "team"
      ? await fetchTeamRatings(sourceIds)
      : await fetchPlayerRatings(sourceIds)

  return new Map(
    participants
      .map((participant) => {
        const sourceId =
          kind === "team" ? participant.source_team_id : participant.source_player_id
        const rating = sourceId ? ratingsBySourceId.get(sourceId) : null

        return rating ? ([participant.id, rating] as const) : null
      })
      .filter((entry): entry is readonly [string, number] => entry !== null),
  )
}

async function fetchTeamRatings(ids: string[]) {
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("teams")
      .select("id, rating")
      .in("id", ids)

    if (result.error && isMissingColumnError(result.error)) {
      return new Map<string, number>()
    }

    if (result.error) {
      console.error("Failed to fetch team ratings:", result.error)
      return new Map<string, number>()
    }

    return readRatingMap(result.data)
  } catch (error) {
    console.error("Unexpected error while fetching team ratings:", error)
    return new Map<string, number>()
  }
}

async function fetchPlayerRatings(ids: string[]) {
  const profileClient = createProfileReadClient()

  try {
    const result = await profileClient
      .from("players")
      .select("id, rating")
      .in("id", ids)

    if (result.error && isMissingColumnError(result.error)) {
      return new Map<string, number>()
    }

    if (result.error) {
      console.error("Failed to fetch player ratings:", result.error)
      return new Map<string, number>()
    }

    return readRatingMap(result.data)
  } catch (error) {
    console.error("Unexpected error while fetching player ratings:", error)
    return new Map<string, number>()
  }
}

function readRatingMap(rows: Record<string, unknown>[] | null) {
  return new Map(
    (rows ?? [])
      .map((row) => {
        const id = readStringId(row.id)
        const rating = readNullableInteger(row.rating)

        return id && rating ? ([id, rating] as const) : null
      })
      .filter((entry): entry is readonly [string, number] => entry !== null),
  )
}

function normalizeParticipant(
  row: Record<string, unknown>,
): ProfileParticipant | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const displayName = readNullableString(row.display_name)
  const participantType = readParticipantType(row.participant_type)

  if (!id || !tournamentId || !displayName) return null

  return {
    id,
    tournament_id: tournamentId,
    participant_type: participantType,
    display_name: displayName,
    region: readNullableString(row.region),
    seed: readNullableInteger(row.seed),
    logo_url: readNullableString(row.logo_url),
    avatar_url: readNullableString(row.avatar_url),
    source_team_id: readStringId(row.source_team_id),
    source_player_id: readStringId(row.source_player_id),
  }
}

function normalizeTeam(row: Record<string, unknown>): ProfileTeam | null {
  const id = readStringId(row.id)
  const name = readNullableString(row.name)

  if (!id || !name) return null

  return {
    id,
    tournament_id: readStringId(row.tournament_id) ?? "",
    name,
    seed: readNullableInteger(row.seed),
    rating: readNullableInteger(row.rating),
    rating_matches_played: readNullableInteger(row.rating_matches_played),
    rank_position: readNullableInteger(row.rank_position),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
    status: readNullableString(row.status),
    owner_player_id: readStringId(row.owner_player_id),
    logo_url: readNullableString(row.logo_url),
    created_at: readNullableString(row.created_at),
  }
}

function normalizePlayerOwnerProfile(
  value: unknown,
): ProfilePlayerOwnerProfile | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null

  const record = row as Record<string, unknown>
  const avatarUrl = readNullableString(record.avatar_url)
  const discordUsername = readNullableString(record.discord_username)
  const displayName = readNullableString(record.display_name)
  const updatedAt = readNullableString(record.updated_at)

  if (!avatarUrl && !discordUsername && !displayName && !updatedAt) return null

  return {
    avatar_url: avatarUrl,
    discord_username: discordUsername,
    display_name: displayName,
    updated_at: updatedAt,
  }
}

function normalizePlayer(row: Record<string, unknown>): ProfilePlayer | null {
  const id = readStringId(row.id)
  const tournamentId = readStringId(row.tournament_id)
  const name = readNullableString(row.name)
  const nickname = readNullableString(row.nickname)
  const region = readNullableString(row.region)

  if (!id || !name) return null

  return {
    id,
    tournament_id: tournamentId,
    name,
    nickname,
    region,
    display_name: nickname ?? name,
    seed: readNullableInteger(row.seed),
    rating: readNullableInteger(row.rating),
    rating_matches_played: readNullableInteger(row.rating_matches_played),
    rank_position: readNullableInteger(row.rank_position),
    wins: readNonNegativeInteger(row.wins),
    losses: readNonNegativeInteger(row.losses),
    status: readNullableString(row.status),
    user_id: readStringId(row.user_id),
    owner_profile: normalizePlayerOwnerProfile(row.owner_profile),
  }
}

function normalizeTournament(row: Record<string, unknown>): ProfileTournament | null {
  const id = readStringId(row.id)
  if (!id) return null

  return {
    id,
    name: readNullableString(row.name),
    event_date: readNullableString(row.event_date),
  }
}

function formatRoundLabel(round: string | null) {
  if (!round) return "Matches"

  const normalized = round.toLowerCase()
  if (normalized === "quarterfinal") return "Quarterfinals"
  if (normalized === "semifinal") return "Semifinals"
  if (normalized === "final" || normalized === "grand final") return "Grand Final"

  return round
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function isMissingRelationError(error: { code?: string }) {
  return error.code === "42P01" || error.code === "42703" || error.code === "PGRST200"
}

function isMissingColumnError(error: { code?: string }) {
  return error.code === "42703" || error.code === "PGRST204"
}
