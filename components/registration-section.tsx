"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { submitTournamentRegistration } from "@/app/actions/registrations"
import { SectionHeading } from "@/components/section-heading"
import type {
  RegistrationParticipantType,
  TournamentRegistrationSummary,
} from "@/lib/data/registrations"

type RegistrationSectionProps = {
  summaries: TournamentRegistrationSummary[]
  participantLabel: "Teams" | "Players"
  initialType?: RegistrationParticipantType
  feedback?: RegistrationFeedback | null
}

export type RegistrationFeedback = {
  tone: "success" | "error"
  message: string
}

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none transition focus:border-primary/60"

export function RegistrationSection({
  summaries,
  participantLabel,
  initialType,
  feedback,
}: RegistrationSectionProps) {
  const defaultType = initialType ?? (participantLabel === "Players" ? "player" : "team")
  const [participantType, setParticipantType] =
    useState<RegistrationParticipantType>(defaultType)
  const summaryByType = useMemo(
    () => new Map(summaries.map((summary) => [summary.participantType, summary])),
    [summaries],
  )
  const summary = summaryByType.get(participantType) ?? summaries[0] ?? null

  if (!summary) return null

  const isDisabled = summary.isClosed || summary.isFull
  const typeLabel = participantType === "player" ? "Player" : "Team"

  return (
    <section className="relative z-10 px-4 py-24" id="registration">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow="Registration" title={`Join the ${participantLabel}`} />

        <div className="glass-card mx-auto grid gap-6 rounded-2xl p-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-8">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                {summary.statusLabel}
              </p>
              <RegistrationTypeControl
                value={participantType}
                onChange={setParticipantType}
              />
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <RegistrationStat label="Approved" value={String(summary.approvedCount)} />
                <RegistrationStat label="Pending" value={String(summary.pendingCount)} />
                <RegistrationStat
                  label="Slots left"
                  value={summary.slotsLeft === null ? "TBA" : String(summary.slotsLeft)}
                />
                <RegistrationStat
                  label="Capacity"
                  value={summary.capacity === null ? "TBA" : String(summary.capacity)}
                />
              </dl>
            </div>

            {feedback ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  feedback.tone === "success"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-red-300/20 bg-red-300/10 text-red-100"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}
          </div>

          <form action={submitTournamentRegistration} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="tournament_id" value={summary.tournamentId} />
            <input type="hidden" name="participant_type" value={participantType} />
            <RegistrationField label={`${typeLabel} name`}>
              <input
                name="display_name"
                required
                disabled={isDisabled}
                className={inputClassName}
                placeholder={participantType === "player" ? "Nickname or real name" : "Team name"}
              />
            </RegistrationField>
            <RegistrationField label="Contact email">
              <input
                name="contact_email"
                type="email"
                disabled={isDisabled}
                className={inputClassName}
                placeholder="captain@example.com"
              />
            </RegistrationField>
            <RegistrationField label="Discord / Telegram">
              <input
                name="contact_handle"
                disabled={isDisabled}
                className={inputClassName}
                placeholder="@handle"
              />
            </RegistrationField>
            <RegistrationField label="Region">
              <input
                name="region"
                disabled={isDisabled}
                className={inputClassName}
                placeholder="Ukraine, EU, North America"
              />
            </RegistrationField>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isDisabled}
                className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
              >
                {isDisabled ? summary.statusLabel : `Register ${typeLabel}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function RegistrationTypeControl({
  value,
  onChange,
}: {
  value: RegistrationParticipantType
  onChange: (value: RegistrationParticipantType) => void
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
      {(["team", "player"] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`rounded-lg px-3 py-2 text-sm transition ${
            value === type
              ? "bg-primary text-black"
              : "text-white/65 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          {type === "team" ? "Team" : "Player"}
        </button>
      ))}
    </div>
  )
}

function RegistrationField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-2 text-sm text-white/75">
      <span className="block">{label}</span>
      {children}
    </label>
  )
}

function RegistrationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  )
}
