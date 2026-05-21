import type React from "react"
import { submitTournamentRegistration } from "@/app/actions/registrations"
import { SectionHeading } from "@/components/section-heading"
import type { TournamentRegistrationSummary } from "@/lib/data/registrations"

type RegistrationSectionProps = {
  summary: TournamentRegistrationSummary | null
  participantLabel: "Teams" | "Players"
  tournamentName?: string | null
  feedback?: RegistrationFeedback | null
}

export type RegistrationFeedback = {
  tone: "success" | "error"
  message: string
}

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none transition focus:border-primary/60"

export function RegistrationSection({
  summary,
  participantLabel,
  tournamentName,
  feedback,
}: RegistrationSectionProps) {
  if (!summary) return null

  const isDisabled = summary.isClosed || summary.isFull
  const typeLabel = summary.participantType === "player" ? "Player" : "Team"
  const typeLabelPlural = summary.participantType === "player" ? "players" : "teams"
  const visibleTournamentName = tournamentName?.trim() || "Active tournament"
  const disabledTitle = summary.isFull ? "Registration is full." : "Registration is closed."
  const disabledMessage = summary.isFull
    ? `This tournament has reached the maximum number of ${typeLabelPlural}.`
    : `Registration is closed for this ${typeLabelPlural} tournament.`

  return (
    <section className="relative z-10 px-4 py-24" id="registration">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow="Registration" title={visibleTournamentName}>
          <span className="glass-card mt-4 inline-flex max-w-full break-words rounded-full px-4 py-1.5 text-center text-sm font-medium uppercase tracking-widest text-primary">
            Join the {participantLabel}
          </span>
        </SectionHeading>

        <div className="glass-card mx-auto grid gap-6 rounded-2xl p-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-8">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                {summary.statusLabel}
              </p>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/65">
                {typeLabel} tournament
              </p>
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
            {isDisabled ? (
              <div className="sm:col-span-2 rounded-xl border border-red-300/30 bg-red-300/10 px-4 py-4 shadow-[0_0_32px_rgba(248,113,113,0.16)]">
                <p className="text-sm font-semibold text-red-100">
                  {disabledTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {disabledMessage}
                </p>
              </div>
            ) : null}
            <input type="hidden" name="tournament_id" value={summary.tournamentId} />
            <input type="hidden" name="participant_type" value={summary.participantType} />
            <div
              className={`grid gap-3 sm:col-span-2 sm:grid-cols-2 ${
                isDisabled
                  ? "rounded-xl border border-white/10 bg-black/20 p-3 opacity-60"
                  : ""
              }`}
            >
              <RegistrationField label={`${typeLabel} name`}>
                <input
                  name="display_name"
                  required
                  disabled={isDisabled}
                  className={inputClassName}
                  placeholder={summary.participantType === "player" ? "Nickname or real name" : "Team name"}
                />
              </RegistrationField>
              {summary.participantType === "team" ? (
                <RegistrationField label="Captain nickname">
                  <input
                    name="captain_nickname"
                    required
                    disabled={isDisabled}
                    className={inputClassName}
                    placeholder="Captain in-game name"
                  />
                </RegistrationField>
              ) : null}
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
              {summary.participantType === "team" ? (
                <TeamRosterFields disabled={isDisabled} />
              ) : null}
            </div>
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

function TeamRosterFields({ disabled }: { disabled: boolean }) {
  return (
    <div className="sm:col-span-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          Team roster
        </p>
        <p className="text-sm text-white/55">
          Submit 5 main players and up to 2 substitutes.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4, 5].map((index) => (
          <RegistrationField key={index} label={`Main player ${index}`}>
            <input
              name={`roster_main_${index}`}
              required
              disabled={disabled}
              className={inputClassName}
              placeholder={`Player ${index} nickname`}
            />
          </RegistrationField>
        ))}
        {[1, 2].map((index) => (
          <RegistrationField key={index} label={`Substitute ${index}`}>
            <input
              name={`roster_sub_${index}`}
              disabled={disabled}
              className={inputClassName}
              placeholder="Optional nickname"
            />
          </RegistrationField>
        ))}
      </div>
    </div>
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
