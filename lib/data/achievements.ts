import type { PublicProfileData, PublicPlayerMatchHistory } from "@/lib/data/profiles"

export type AchievementTier = "bronze" | "silver" | "gold" | "emerald"
export type AchievementSource = "status" | "matches" | "results" | "rating" | "manual"
export type AchievementKey =
  | "verifiedPlayer"
  | "verifiedTeam"
  | "firstMatch"
  | "champion"
  | "finalist"
  | "topSeed"
  | "winStreak"
  | "undefeated"

export type Achievement = {
  id: string
  labelKey: AchievementKey
  descriptionKey: AchievementKey
  icon: string
  tier?: AchievementTier
  source: AchievementSource
}

export function getPlayerAchievements(playerData: PublicProfileData) {
  return derivePlayerAchievements(playerData)
}

export function getTeamAchievements(teamData: PublicProfileData) {
  return deriveTeamAchievements(teamData)
}

export function derivePlayerAchievements(data: PublicProfileData): Achievement[] {
  const achievements: Achievement[] = []
  const history = data.playerTournamentHistory ?? []
  const matches = data.playerMatchHistory ?? []

  if (data.profile.status === "approved") {
    achievements.push(createAchievement("verified-player", "verifiedPlayer", "ShieldCheck", "emerald", "status"))
  }

  if (matches.some((match) => match.status === "finished") || data.stats.totalMatches > 0) {
    achievements.push(createAchievement("player-first-match", "firstMatch", "Swords", "bronze", "matches"))
  }

  if (history.some((item) => item.placement === 1)) {
    achievements.push(createAchievement("player-champion", "champion", "Crown", "gold", "results"))
  }

  if (history.some((item) => item.placement === 2)) {
    achievements.push(createAchievement("player-finalist", "finalist", "Medal", "silver", "results"))
  }

  if (isTopSeed(data.profile.seed)) {
    achievements.push(createAchievement("player-top-seed", "topSeed", "BadgeCheck", "emerald", "rating"))
  }

  if (hasPlayerWinStreak(data, matches)) {
    achievements.push(createAchievement("player-win-streak", "winStreak", "Flame", "gold", "matches"))
  }

  return achievements
}

export function deriveTeamAchievements(data: PublicProfileData): Achievement[] {
  const achievements: Achievement[] = []
  const history = data.teamTournamentHistory ?? []
  const stats = data.stats

  if (data.profile.status === "approved") {
    achievements.push(createAchievement("verified-team", "verifiedTeam", "ShieldCheck", "emerald", "status"))
  }

  if (stats.totalMatches > 0 || stats.recentHistory.length > 0) {
    achievements.push(createAchievement("team-first-match", "firstMatch", "Swords", "bronze", "matches"))
  }

  if (history.some((item) => item.placement === 1)) {
    achievements.push(createAchievement("team-champion", "champion", "Crown", "gold", "results"))
  }

  if (history.some((item) => item.placement === 2)) {
    achievements.push(createAchievement("team-finalist", "finalist", "Medal", "silver", "results"))
  }

  if (stats.wins > 0 && stats.losses === 0) {
    achievements.push(createAchievement("team-undefeated", "undefeated", "Trophy", "gold", "matches"))
  }

  if (isTopSeed(data.profile.seed)) {
    achievements.push(createAchievement("team-top-seed", "topSeed", "BadgeCheck", "emerald", "rating"))
  }

  return achievements
}

function createAchievement(
  id: string,
  key: AchievementKey,
  icon: string,
  tier: AchievementTier,
  source: AchievementSource,
): Achievement {
  return {
    id,
    labelKey: key,
    descriptionKey: key,
    icon,
    tier,
    source,
  }
}

function isTopSeed(seed: number | null) {
  return typeof seed === "number" && seed >= 1 && seed <= 3
}

function hasPlayerWinStreak(data: PublicProfileData, matches: PublicPlayerMatchHistory[]) {
  if (data.stats.currentStreak.result === "win" && data.stats.currentStreak.count >= 3) {
    return true
  }

  return countConsecutiveWins(matches) >= 3
}

function countConsecutiveWins(matches: PublicPlayerMatchHistory[]) {
  let streak = 0

  for (const match of matches) {
    if (match.status !== "finished") continue
    if (match.result !== "win") break

    streak += 1
  }

  return streak
}
