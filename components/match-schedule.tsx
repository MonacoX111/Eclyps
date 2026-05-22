"use client"

import { m } from "framer-motion"
import { AlertTriangle, Clock, Play } from "lucide-react"
import { submitMatchDispute } from "@/app/actions/disputes"
import { SectionHeading } from "@/components/section-heading"
import type { PublicMatchDisputeSummary } from "@/lib/data/disputes"

export type MatchScheduleItem = {
  id: string
  round: string
  teamA: string
  teamB: string
  time?: string | null
  status: "upcoming" | "live" | "finished"
  score1?: number | null
  score2?: number | null
  participant1Id?: string | null
  participant2Id?: string | null
}

type MatchScheduleProps = {
  matches?: MatchScheduleItem[]
  userParticipantId?: string | null
  disputes?: PublicMatchDisputeSummary[]
  feedback?: {
    tone: "success" | "error"
    message: string
  } | null
}

export function MatchSchedule({
  matches = [],
  userParticipantId = null,
  disputes = [],
  feedback = null,
}: MatchScheduleProps) {
  const schedule = groupMatchesByRound(matches)
  const disputesByMatchId = new Map(disputes.map((dispute) => [dispute.match_id, dispute]))

  return (
    <section className="relative z-10 px-4 py-24" id="schedule">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow="Battle Calendar" title="Match Schedule" />
        {feedback ? (
          <div
            className={`glass-card mx-auto mb-8 max-w-xl rounded-xl px-4 py-3 text-center text-sm ${
              feedback.tone === "success" ? "text-primary" : "text-red-100"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {schedule.length === 0 ? (
          <ScheduleEmptyState />
        ) : (
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
                {round.matches.map((match, mi) => {
                  const userCanReport = isUserMatchParticipant(match, userParticipantId)
                  const dispute = disputesByMatchId.get(match.id) ?? null

                  return (
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
                    {userCanReport ? (
                      <MatchDisputeControl match={match} dispute={dispute} />
                    ) : null}
                  </div>
                  )
                })}
              </div>
            </m.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MatchDisputeControl({
  match,
  dispute,
}: {
  match: MatchScheduleItem
  dispute: PublicMatchDisputeSummary | null
}) {
  if (dispute) {
    return (
      <div className="w-full rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary sm:ml-auto sm:max-w-sm">
        Dispute {formatDisputeStatus(dispute.status)}: {dispute.title}
      </div>
    )
  }

  return (
    <details className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:ml-auto sm:max-w-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-white/75">
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Report Dispute
        </span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/70">
          Match issue
        </span>
      </summary>
      <form action={submitMatchDispute} className="mt-4 grid gap-3">
        <input type="hidden" name="match_id" value={match.id} />
        <label className="grid gap-2 text-sm text-white/70">
          <span>Type</span>
          <select name="dispute_type" className={disputeInputClassName} defaultValue="wrong_result">
            <option value="no_show">No show</option>
            <option value="wrong_result">Wrong result</option>
            <option value="cheating">Cheating</option>
            <option value="connection_issue">Connection issue</option>
            <option value="rule_violation">Rule violation</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-white/70">
          <span>Title</span>
          <input name="title" required className={disputeInputClassName} placeholder="Short issue summary" />
        </label>
        <label className="grid gap-2 text-sm text-white/70">
          <span>Description</span>
          <textarea name="description" required rows={3} className={disputeInputClassName} placeholder="What happened?" />
        </label>
        <label className="grid gap-2 text-sm text-white/70">
          <span>Evidence link</span>
          <input name="evidence_url" type="url" className={disputeInputClassName} placeholder="https://..." />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-primary/90"
        >
          Submit Dispute
        </button>
      </form>
    </details>
  )
}

const disputeInputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-white outline-none transition focus:border-primary/60"

function isUserMatchParticipant(match: MatchScheduleItem, userParticipantId: string | null) {
  return Boolean(
    userParticipantId &&
      (match.participant1Id === userParticipantId ||
        match.participant2Id === userParticipantId),
  )
}

function formatDisputeStatus(status: PublicMatchDisputeSummary["status"]) {
  return status.replaceAll("_", " ")
}

function ScheduleEmptyState() {
  return (
    <div className="glass-card mx-auto max-w-xl rounded-xl px-5 py-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
        Schedule is not available yet.
      </p>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Match times will appear here once they are announced.
      </p>
    </div>
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
