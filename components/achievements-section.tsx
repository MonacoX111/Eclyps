"use client"

import {
  BadgeCheck,
  Crown,
  Flame,
  Medal,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import type { Achievement, AchievementKey, AchievementTier } from "@/lib/data/achievements"

type AchievementsSectionProps = {
  achievements: Achievement[]
  emptyMessage: string
}

const achievementIcons = {
  BadgeCheck,
  Crown,
  Flame,
  Medal,
  ShieldCheck,
  Swords,
  Trophy,
}

export function AchievementsSection({ achievements, emptyMessage }: AchievementsSectionProps) {
  const { t } = useLanguage()

  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300">
          <Medal className="h-5 w-5" />
        </div>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/50">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((achievement) => {
        const Icon = getAchievementIcon(achievement.icon)

        return (
          <div
            key={achievement.id}
            className={`rounded-xl border p-4 ${getTierClassName(achievement.tier)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="break-words font-bold text-white">
                  {getAchievementLabel(t, achievement.labelKey)}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-white/45">
                  {getAchievementDescription(t, achievement.descriptionKey)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getAchievementIcon(icon: string) {
  return achievementIcons[icon as keyof typeof achievementIcons] ?? Medal
}

function getTierClassName(tier?: AchievementTier) {
  if (tier === "gold") return "border-amber-400/15 bg-amber-400/5"
  if (tier === "silver") return "border-white/10 bg-white/[0.035]"
  if (tier === "bronze") return "border-orange-300/15 bg-orange-300/5"

  return "border-emerald-400/15 bg-emerald-400/5"
}

function getAchievementLabel(t: ReturnType<typeof useLanguage>["t"], key: AchievementKey) {
  return t.profile.achievements.labels[key]
}

function getAchievementDescription(t: ReturnType<typeof useLanguage>["t"], key: AchievementKey) {
  return t.profile.achievements.descriptions[key]
}
