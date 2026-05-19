"use client"

import { m } from "framer-motion"
import { Trophy, Medal, Award } from "lucide-react"
import { SectionHeading } from "@/components/section-heading"

export type ResultCard = {
  season: string
  placements: Array<{
    placement: 1 | 2 | 3
    team: string
  }>
  mvp?: string | null
  date?: string | null
}

type ResultsProps = {
  results?: ResultCard[]
}

export function Results({ results = [] }: ResultsProps) {
  return (
    <section className="relative z-10 px-4 py-24" id="results">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="Hall of Legends" title="Past Results" />

        {results.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            No recent results yet.
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {results.map((result, i) => {
              const placements = Array.isArray(result.placements)
                ? result.placements
                : []

              return (
                <m.div
                  key={result.season}
                  className="glass-card w-full overflow-hidden rounded-2xl transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ background: "oklch(0.78 0.18 165 / 0.05)" }}
              >
                <h3 className="min-w-0 break-words text-lg font-bold text-foreground">
                  {result.season}
                </h3>
                {result.date ? (
                  <span className="shrink-0 font-mono text-sm text-muted-foreground">
                    {result.date}
                  </span>
                ) : null}
              </div>

              {/* Placements */}
              {placements.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-4 p-6">
                  {placements.map((placement) => (
                    <div
                      key={placement.placement}
                      className="flex w-full items-center gap-4 rounded-xl p-4 sm:w-[calc((100%-2rem)/3)]"
                      style={{
                        background:
                          placement.placement === 1
                            ? "oklch(0.78 0.18 165 / 0.06)"
                            : "oklch(0.78 0.18 165 / 0.03)",
                      }}
                    >
                      {placement.placement === 1 ? (
                        <Trophy className="h-8 w-8 shrink-0 text-primary" />
                      ) : placement.placement === 2 ? (
                        <Medal className="h-8 w-8 shrink-0 text-muted-foreground" />
                      ) : (
                        <Award className="h-8 w-8 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={
                            placement.placement === 1
                              ? "text-xs tracking-wider uppercase text-primary"
                              : "text-xs tracking-wider uppercase text-muted-foreground"
                          }
                        >
                          {placement.placement === 1
                            ? "Champion"
                            : placement.placement === 2
                              ? "Runner-up"
                              : "3rd Place"}
                        </p>
                        <p
                          className={
                            placement.placement === 1
                              ? "break-words font-bold text-foreground"
                              : "break-words font-semibold text-foreground"
                          }
                        >
                          {placement.team}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* MVP */}
              {result.mvp ? (
                <div className="border-t border-border/50 px-6 py-3">
                  <span className="break-words text-sm text-muted-foreground">
                    Season MVP:{" "}
                    <span className="font-semibold text-primary">
                      {result.mvp}
                    </span>
                  </span>
                </div>
              ) : null}
                </m.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
