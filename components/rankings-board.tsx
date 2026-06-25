"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Crown, Medal, Trophy } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export type RankingRow = {
  id: string
  name: string
  tag: string
  wins: number
  losses: number
  href: string
  avatarUrl: string | null
}

type RankingsBoardProps = {
  players: RankingRow[]
  teams: RankingRow[]
}

function winRate(r: RankingRow) {
  const total = r.wins + r.losses
  return total === 0 ? 0 : Math.round((r.wins / total) * 100)
}

// Ranking score: reward wins, lightly penalise losses, tie-break by win rate.
function score(r: RankingRow) {
  return r.wins * 3 - r.losses + winRate(r) / 100
}

function rankColor(rank: number) {
  if (rank === 1) return "text-yellow-300"
  if (rank === 2) return "text-slate-200"
  if (rank === 3) return "text-amber-500"
  return "text-muted-foreground"
}

export function RankingsBoard({ players, teams }: RankingsBoardProps) {
  const { t, lang } = useLanguage()
  const isUk = lang === "uk"
  const [tab, setTab] = useState<"players" | "teams">("players")

  const rows = (tab === "players" ? players : teams)
    .slice()
    .sort((a, b) => score(b) - score(a))

  const labels = {
    title: isUk ? "Рейтинг" : "Rankings",
    subtitle: isUk
      ? "Найкращі гравці та команди за результатами матчів"
      : "Top players and teams by match performance",
    players: isUk ? "Гравці" : "Players",
    teams: isUk ? "Команди" : "Teams",
    rank: "#",
    name: isUk ? "Імʼя" : "Name",
    record: isUk ? "В–П" : "W–L",
    winRate: isUk ? "% перемог" : "Win rate",
    points: isUk ? "Очки" : "Points",
    empty: isUk ? "Поки немає даних для рейтингу." : "No ranking data yet.",
  }

  return (
    <section className="relative z-10 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <Trophy className="h-6 w-6" />
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{labels.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex justify-center gap-2">
          {(["players", "teams"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === key
                  ? "bg-primary text-black"
                  : "border border-white/10 bg-black/30 text-muted-foreground hover:border-primary/40"
              }`}
            >
              {key === "players" ? labels.players : labels.teams}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <div className="grid grid-cols-[48px_1fr_72px_80px_72px] gap-2 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <span>{labels.rank}</span>
              <span>{labels.name}</span>
              <span className="text-center">{labels.record}</span>
              <span className="text-center">{labels.winRate}</span>
              <span className="text-right">{labels.points}</span>
            </div>
            {rows.map((row, i) => {
              const rank = i + 1
              return (
                <Link
                  key={row.id}
                  href={row.href}
                  className="grid grid-cols-[48px_1fr_72px_80px_72px] items-center gap-2 border-b border-white/5 px-4 py-3 text-sm transition last:border-0 hover:bg-white/[0.03]"
                >
                  <span className={`flex items-center gap-1 font-black ${rankColor(rank)}`}>
                    {rank === 1 ? <Crown className="h-4 w-4" /> : rank <= 3 ? <Medal className="h-4 w-4" /> : null}
                    {rank}
                  </span>
                  <span className="flex items-center gap-3 truncate">
                    {row.avatarUrl ? (
                      <Image src={row.avatarUrl} alt={row.name} width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{row.tag}</span>
                    )}
                    <span className="truncate font-semibold text-foreground">{row.name}</span>
                  </span>
                  <span className="text-center text-muted-foreground">{row.wins}–{row.losses}</span>
                  <span className="text-center font-semibold text-emerald-300">{winRate(row)}%</span>
                  <span className="text-right font-black text-primary">{Math.max(0, Math.round(score(row)))}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
