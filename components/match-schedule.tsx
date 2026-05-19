"use client"

import { m } from "framer-motion"
import { Clock, Play } from "lucide-react"
import { SectionHeading } from "@/components/section-heading"

export type MatchScheduleItem = {
  id: string
  round: string
  teamA: string
  teamB: string
  time?: string | null
  status: "upcoming" | "live" | "finished"
  score1?: number | null
  score2?: number | null
}

type MatchScheduleProps = {
  matches?: MatchScheduleItem[]
}

export function MatchSchedule({ matches = [] }: MatchScheduleProps) {
  if (matches.length === 0) return null

  const schedule = groupMatchesByRound(matches)

  return (
    <section className="relative z-10 px-4 py-24" id="schedule">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow="Battle Calendar" title="Match Schedule" />

        <div className="space-y-12">
          {schedule.map((round, ri) => (
            <m.div
              key={round.round}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: ri * 0.1 }}
            >
              <h3 className="mb-4 flex items-center gap-3 text-lg font-bold text-primary">
                <span
                  className="h-px flex-1"
                  style={{ background: "oklch(0.78 0.18 165 / 0.2)" }}
                />
                {round.round}
                <span
                  className="h-px flex-1"
                  style={{ background: "oklch(0.78 0.18 165 / 0.2)" }}
                />
              </h3>

              <div className="flex flex-wrap justify-center gap-3">
                {round.matches.map((match, mi) => (
                  <div
                    key={`${round.round}-${mi}`}
                    className="glass-card flex w-full flex-col items-center gap-3 rounded-xl px-6 py-4 transition-all duration-300 sm:flex-row sm:justify-between"
                  >
                    {/* Teams */}
                    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-3 text-center sm:justify-start sm:text-left">
                      <span className="min-w-0 break-words font-semibold text-foreground">
                        {match.teamA}
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-primary"
                            style={{ background: "oklch(0.78 0.18 165 / 0.1)" }}>
                        VS
                      </span>
                      <span className="min-w-0 break-words font-semibold text-foreground">
                        {match.teamB}
                      </span>
                    </div>

                    {/* Time & Status */}
                    <div className="flex max-w-full flex-wrap items-center justify-center gap-4 text-sm sm:justify-end">
                      {match.time ? (
                        <span className="flex max-w-full items-center gap-1.5 break-words font-mono text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {match.time}
                        </span>
                      ) : null}
                      {match.status === "upcoming" ? (
                        <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary"
                              style={{ background: "oklch(0.78 0.18 165 / 0.1)" }}>
                          <Play className="h-3 w-3" />
                          Upcoming
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary"
                              style={{ background: "oklch(0.78 0.18 165 / 0.1)" }}>
                          <Play className="h-3 w-3" />
                          {formatStatusLabel(match.status)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function groupMatchesByRound(matches: MatchScheduleItem[]) {
  return matches.reduce<Array<{ round: string; matches: MatchScheduleItem[] }>>(
    (groups, match) => {
      const existingGroup = groups.find((group) => group.round === match.round)

      if (existingGroup) {
        existingGroup.matches.push(match)
      } else {
        groups.push({ round: match.round, matches: [match] })
      }

      return groups
    },
    [],
  )
}

function formatStatusLabel(status: MatchScheduleItem["status"]) {
  return status === "finished" ? "Finished" : status === "live" ? "Live" : "Upcoming"
}
