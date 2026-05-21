import type React from "react"
import Image from "next/image"
import { submitTournamentRegistration } from "@/app/actions/registrations"
import { DiscordLoginOnboarding } from "@/components/discord-login-onboarding"
import { SectionHeading } from "@/components/section-heading"
import type { PlatformUserState } from "@/lib/auth/player-state"
import type { TournamentRegistrationSummary } from "@/lib/data/registrations"

type RegistrationSectionProps = {
  summary: TournamentRegistrationSummary | null
  participantLabel: "Teams" | "Players"
  tournamentName?: string | null
  feedback?: RegistrationFeedback | null
  platformState?: PlatformUserState
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
  platformState,
}: RegistrationSectionProps) {
  if (!summary) return null

  const userProfile = platformState?.userProfile ?? null
  const approvedPlayer = platformState?.approvedPlayer ?? null
  const playerApplication = platformState?.playerApplication ?? null
  const tournamentRegistration = platformState?.tournamentRegistration ?? null
  const isDisabled = summary.isClosed || summary.isFull
  const typeLabel = summary.participantType === "player" ? "Player" : "Team"
  const typeLabelPlural = summary.participantType === "player" ? "players" : "teams"
  const visibleTournamentName = tournamentName?.trim() || "Active tournament"
  const disabledTitle = summary.isFull ? "Registration is full." : "Registration is closed."
  const disabledMessage = summary.isFull
    ? `This tournament has reached the maximum number of ${typeLabelPlural}.`
    : `Registration is closed for this ${typeLabelPlural} tournament.`
  const isTournamentPending = tournamentRegistration?.status === "pending"
  const isTournamentApproved = tournamentRegistration?.status === "approved"
  const canSubmit =
    !isDisabled &&
    Boolean(approvedPlayer) &&
    !isTournamentPending &&
    !isTournamentApproved
  const applicationStatus = playerApplication?.status ?? null

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
            {userProfile && !approvedPlayer ? (
              <PlayerApplicationState status={applicationStatus} />
            ) : null}
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
            {!isDisabled && !userProfile ? (
              <div className="sm:col-span-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-4 shadow-[0_0_32px_rgba(0,200,150,0.12)]">
                <p className="text-sm font-semibold text-primary">
                  Discord login required
                </p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Registrations are tied to Discord accounts for ownership and check-in.
                </p>
                <div className="mt-4">
                  <LoginButton />
                </div>
              </div>
            ) : null}
            {userProfile ? (
              <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                {userProfile.avatar_url ? (
                  <Image
                    src={userProfile.avatar_url}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full border border-primary/30 object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                    {userProfile.discord_username.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary/70">
                    Discord account
                  </p>
                  <p className="truncate text-sm font-medium text-white/80">
                    {userProfile.discord_username}
                  </p>
                </div>
              </div>
            ) : null}
            {!isDisabled && approvedPlayer ? (
              <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                Approved player: {approvedPlayer.nickname ?? approvedPlayer.name}
              </div>
            ) : null}
            {!isDisabled && isTournamentPending ? (
              <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4 text-sm text-amber-100">
                Your tournament registration is pending admin approval.
              </div>
            ) : null}
            {!isDisabled && isTournamentApproved ? (
              <div className="sm:col-span-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-4 text-sm text-primary">
                You are approved for this tournament.
              </div>
            ) : null}
            <input type="hidden" name="tournament_id" value={summary.tournamentId} />
            <input type="hidden" name="participant_type" value={summary.participantType} />
            <div
              className={`grid gap-3 sm:col-span-2 sm:grid-cols-2 ${
                !canSubmit
                  ? "rounded-xl border border-white/10 bg-black/20 p-3 opacity-60"
                  : ""
              }`}
            >
              <RegistrationField label={`${typeLabel} name`}>
                <input
                  name="display_name"
                  required
                  disabled={!canSubmit}
                  className={inputClassName}
                  defaultValue={
                    summary.participantType === "player" && approvedPlayer
                      ? approvedPlayer.nickname ?? approvedPlayer.name
                      : undefined
                  }
                  placeholder={summary.participantType === "player" ? "Nickname or real name" : "Team name"}
                />
              </RegistrationField>
              {summary.participantType === "team" ? (
                <RegistrationField label="Captain nickname">
                  <input
                    name="captain_nickname"
                    required
                    disabled={!canSubmit}
                    className={inputClassName}
                    placeholder="Captain in-game name"
                  />
                </RegistrationField>
              ) : null}
              <RegistrationField label="Contact email">
                <input
                  name="contact_email"
                  type="email"
                  disabled={!canSubmit}
                  className={inputClassName}
                  placeholder="captain@example.com"
                />
              </RegistrationField>
              <RegistrationField label="Discord / Telegram">
                <input
                  name="contact_handle"
                  disabled={!canSubmit}
                  className={inputClassName}
                  placeholder="@handle"
                />
              </RegistrationField>
              <RegistrationField label="Region">
                <input
                  name="region"
                  disabled={!canSubmit}
                  className={inputClassName}
                  placeholder="Ukraine, EU, North America"
                />
              </RegistrationField>
              {summary.participantType === "team" ? (
                <TeamRosterFields disabled={!canSubmit} />
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
              >
                {isDisabled
                  ? summary.statusLabel
                  : isTournamentPending
                    ? "Tournament approval pending"
                    : isTournamentApproved
                      ? "Tournament approved"
                      : approvedPlayer
                    ? `Register ${typeLabel}`
                    : userProfile
                      ? applicationStatus === "pending"
                        ? "Player application pending"
                        : "Player approval required"
                      : "Login with Discord to register"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function PlayerApplicationState({
  status,
}: {
  status: "pending" | "approved" | "rejected" | null
}) {
  if (status === "pending") {
    return (
      <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4">
        <p className="text-sm font-semibold text-amber-100">
          Player application pending
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          An admin needs to approve your Eclyps player application before
          tournament registration unlocks.
        </p>
      </div>
    )
  }

  return (
    <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4">
      <p className="text-sm font-semibold text-amber-100">
        Player application not found
      </p>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Your Discord account is connected, but no player application was found.
        Log out and use Login with Discord again, then choose Yes to create the
        application automatically.
      </p>
      {status === "rejected" ? (
        <p className="mt-2 text-sm text-red-100">
          Your previous player application was rejected.
        </p>
      ) : null}
    </div>
  )
}

function LoginButton() {
  return (
    <DiscordLoginOnboarding
      className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-black transition hover:bg-primary/90"
    />
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
