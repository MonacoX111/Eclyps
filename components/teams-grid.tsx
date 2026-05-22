"use client"

import { m } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Shield } from "lucide-react"
import { SectionHeading } from "@/components/section-heading"

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
}

export function TeamsGrid({
  teams = [],
  participantLabel = "Teams",
}: TeamsGridProps) {
  const sectionId = participantLabel === "Players" ? "players" : "teams"
  const emptyLabel = participantLabel.toLowerCase()

  return (
    <section className="relative z-10 px-4 py-24" id={sectionId}>
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Combatants" title={`Registered ${participantLabel}`} />

        {teams.length === 0 ? (
          <p className="glass-card mx-auto mt-12 max-w-xl rounded-xl p-6 text-center text-sm text-muted-foreground">
            No registered {emptyLabel} yet.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {teams.map((team, i) => (
              <m.div
                key={team.id}
                className="glass-card group relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-xl p-6 transition-all duration-300 sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
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
      </div>
    </section>
  )
}

function TeamCardContent({ team }: { team: TeamCard }) {
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

      <div className="text-center">
        <h3 className="break-words text-lg font-bold text-foreground">
          {team.name}
        </h3>
        {team.subtitle && (
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {team.subtitle}
          </p>
        )}
        <p className="mb-3 break-all font-mono text-xs text-muted-foreground">
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
      className="flex w-full flex-col items-center gap-4"
      aria-label={`Open ${team.name} profile`}
    >
      {content}
    </Link>
  )
}

function CardAvatar({ team }: { team: TeamCard }) {
  if (team.avatarUrl) {
    return (
      <div
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-primary/25 transition-shadow duration-300 group-hover:shadow-[var(--glow)]"
        style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
      >
        <Image
          src={team.avatarUrl}
          alt={team.avatarAlt ? `${team.avatarAlt} Discord avatar` : ""}
          width={64}
          height={64}
          className="h-full w-full rounded-xl object-cover"
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
