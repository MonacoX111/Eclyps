"use client"

import { useEffect, useMemo, useState } from "react"
import { m } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Search, Shield } from "lucide-react"
import { ListEmptyState } from "@/components/list-empty-state"
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"
import { withAvatarCacheBust } from "@/lib/avatar"

export type TeamCard = {
  id: string
  name: string
  subtitle?: string | null
  tag: string
  wins: number
  losses: number
  rank: number
  profileHref?: string
  avatarUrl?: string | null
  avatarAlt?: string | null
}

type TeamsGridProps = {
  teams?: TeamCard[]
  participantLabel?: "Teams" | "Players"
  title?: string
}

export function TeamsGrid({
  teams = [],
  participantLabel = "Teams",
  title,
}: TeamsGridProps) {
  const { t, lang } = useLanguage()
  const isUk = lang === "uk"
  const sectionId = participantLabel === "Players" ? "players" : "teams"

  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<"rank" | "wins" | "winrate" | "name">("rank")

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = teams.filter((team) => {
      if (!q) return true
      return (
        team.name.toLowerCase().includes(q) ||
        team.tag.toLowerCase().includes(q) ||
        (team.subtitle ?? "").toLowerCase().includes(q)
      )
    })
    const winRate = (tm: TeamCard) => {
      const total = tm.wins + tm.losses
      return total === 0 ? 0 : tm.wins / total
    }
    const sorted = [...list]
    if (sort === "wins") sorted.sort((a, b) => b.wins - a.wins)
    else if (sort === "winrate") sorted.sort((a, b) => winRate(b) - winRate(a))
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name))
    else sorted.sort((a, b) => a.rank - b.rank)
    return sorted
  }, [teams, query, sort])

  return (
    <section className="relative z-10 px-4 py-16 sm:py-24" id={sectionId}>
      <div className="mx-auto max-w-6xl">
        <SectionHeading 
          eyebrow={t.teamsGrid.eyebrow} 
          title={title || (participantLabel === "Players" ? t.teamsGrid.registeredPlayers : t.teamsGrid.registeredTeams)} 
        />

        {teams.length === 0 ? (
          <ListEmptyState variant={participantLabel === "Players" ? "players" : "teams"} />
        ) : (
          <>
            {/* Search + sort bar */}
            <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    participantLabel === "Players"
                      ? isUk ? "Пошук гравця…" : "Search players…"
                      : isUk ? "Пошук команди…" : "Search teams…"
                  }
                  className="w-full rounded-full border border-white/10 bg-black/30 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-black/40"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="w-full max-w-[200px] rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/40"
              >
                <option value="rank">{isUk ? "За рейтингом" : "By rank"}</option>
                <option value="wins">{isUk ? "Найбільше перемог" : "Most wins"}</option>
                <option value="winrate">{isUk ? "Відсоток перемог" : "Win rate"}</option>
                <option value="name">{isUk ? "За назвою (А-Я)" : "Name (A-Z)"}</option>
              </select>
            </div>

            {filteredTeams.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {isUk ? "Нічого не знайдено за вашим запитом." : "No results match your search."}
              </p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {filteredTeams.map((team, i) => (
              <m.div
                key={team.id}
                className="glass-card group relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-xl p-5 transition-all duration-300 sm:w-[calc((100%-1rem)/2)] sm:gap-4 sm:p-6 lg:w-[calc((100%-3rem)/4)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <TeamCardContent team={team} />
                  </m.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function TeamCardContent({ team }: { team: TeamCard }) {
  const { t } = useLanguage()

  const content = (
    <>
      {/* Rank badge */}
      <div
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-primary"
        style={{ background: "oklch(0.78 0.18 165 / 0.1)" }}
      >
        {team.rank}
      </div>

      <CardAvatar team={team} />

      <div className="min-w-0 max-w-full text-center">
        <h3 className="max-w-full break-words text-base font-bold text-foreground sm:text-lg">
          {team.name}
        </h3>
        {team.subtitle && (
          <p className="mt-1 max-w-full break-words text-xs text-muted-foreground">
            {team.subtitle}
          </p>
        )}
        <p className="mb-3 max-w-full break-all font-mono text-xs text-muted-foreground">
          [{team.tag}]
        </p>
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-primary">{team.wins}W</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{team.losses}L</span>
        </div>
      </div>
    </>
  )

  if (!team.profileHref) return content

  return (
    <Link
      href={team.profileHref}
      className="flex w-full min-w-0 flex-col items-center gap-3 sm:gap-4"
      aria-label={t.teamsGrid.openProfileLabel.replace("{name}", team.name)}
    >
      {content}
    </Link>
  )
}

function CardAvatar({ team }: { team: TeamCard }) {
  const { t } = useLanguage()
  const [imageError, setImageError] = useState(false)
  const avatarUrl = withAvatarCacheBust(team.avatarUrl, null)

  useEffect(() => {
    setImageError(false)
  }, [avatarUrl])

  if (avatarUrl && !imageError) {
    return (
      <div
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-primary/25 transition-shadow duration-300 group-hover:shadow-[var(--glow)]"
        style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
      >
        <Image
          src={avatarUrl}
          alt={team.avatarAlt ? t.teamsGrid.discordAvatarAlt.replace("{name}", team.avatarAlt) : ""}
          width={64}
          height={64}
          className="h-full w-full rounded-xl object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-xl transition-shadow duration-300 group-hover:shadow-[var(--glow)]"
      style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
    >
      <Shield className="h-8 w-8 text-primary" />
    </div>
  )
}