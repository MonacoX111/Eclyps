"use client"

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type PlayerStatsChartsGame = {
  game: string
  wins: number
  losses: number
  winRate: number
}

export type PlayerStatsChartsLabels = {
  winRateByGame: string
  distribution: string
  wins: string
  losses: string
  winRate: string
}

const WIN_COLOR = "#34d399"
const LOSS_COLOR = "#f87171"

export function PlayerStatsCharts({
  games,
  labels,
}: {
  games: PlayerStatsChartsGame[]
  labels: PlayerStatsChartsLabels
}) {
  if (!games.length) return null

  const totalWins = games.reduce((sum, g) => sum + g.wins, 0)
  const totalLosses = games.reduce((sum, g) => sum + g.losses, 0)
  const pieData = [
    { name: labels.wins, value: totalWins, color: WIN_COLOR },
    { name: labels.losses, value: totalLosses, color: LOSS_COLOR },
  ].filter((d) => d.value > 0)

  const barData = games.map((g) => ({ game: g.game, winRate: g.winRate }))

  return (
    <div className="mb-5 grid gap-4 lg:grid-cols-2">
      {/* Win-rate per game */}
      <div className="rounded-xl border border-white/5 bg-black/20 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary/70">
          {labels.winRateByGame}
        </p>
        <ResponsiveContainer width="100%" height={Math.max(140, barData.length * 46)}>
          <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="game"
              width={90}
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#0b0f0d",
                border: "1px solid rgba(52,211,153,0.25)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}%`, labels.winRate]}
            />
            <Bar dataKey="winRate" radius={[0, 6, 6, 0]} fill={WIN_COLOR} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wins vs losses distribution */}
      <div className="rounded-xl border border-white/5 bg-black/20 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary/70">
          {labels.distribution}
        </p>
        {pieData.length === 0 ? null : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                stroke="none"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0b0f0d",
                  border: "1px solid rgba(52,211,153,0.25)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: WIN_COLOR }} />
            {labels.wins}: {totalWins}
          </span>
          <span className="flex items-center gap-1.5 text-red-300">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: LOSS_COLOR }} />
            {labels.losses}: {totalLosses}
          </span>
        </div>
      </div>
    </div>
  )
}
