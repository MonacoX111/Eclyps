"use client"

import React, { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import Image from "next/image"
import { checkInTournament } from "@/app/actions/check-ins"
import { submitTournamentRegistration } from "@/app/actions/registrations"
import { DiscordLoginOnboarding } from "@/components/discord-login-onboarding"
import { SectionHeading } from "@/components/section-heading"
import { PlayerOnboardingModal } from "@/components/player-onboarding-modal"
import { useLanguage } from "@/components/language-provider"
import type { PlatformUserState } from "@/lib/auth/player-state"
import {
  formatKyivCheckInDateWithLabel,
  getCheckInWindowStateUtc,
} from "@/lib/check-ins/time"
import type { TournamentRegistrationSummary } from "@/lib/data/registrations"

type RegistrationSectionProps = {
  summary: TournamentRegistrationSummary | null
  participantLabel: "Teams" | "Players"
  tournamentName?: string | null
  feedback?: RegistrationFeedback | null
  checkInFeedback?: RegistrationFeedback | null
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
  checkInFeedback,
  platformState,
}: RegistrationSectionProps) {
  const { t, lang } = useLanguage()

  if (!summary) return null

  const userProfile = platformState?.userProfile ?? null
  const approvedPlayer = platformState?.approvedPlayer ?? null
  const playerApplication = platformState?.playerApplication ?? null
  const tournamentRegistration = platformState?.tournamentRegistration ?? null
  const isDisabled = summary.isClosed || summary.isFull
  
  const typeLabel = summary.participantType === "player" 
    ? t.roleOnboarding.guides.player.label 
    : t.roleOnboarding.guides.captain.label

  const typeLabelPlural = summary.participantType === "player" 
    ? t.navbar.players 
    : t.navbar.teams

  const visibleTournamentName = tournamentName?.trim() || t.registration.activeTournament
  
  const disabledTitle = summary.isFull ? t.registration.disabled.isFullTitle : t.registration.disabled.isClosedTitle
  const disabledMessage = summary.isFull
    ? (summary.participantType === "player" ? t.registration.disabled.isFullMessagePlayers : t.registration.disabled.isFullMessageTeams)
    : (summary.participantType === "player" ? t.registration.disabled.isClosedMessagePlayers : t.registration.disabled.isClosedMessageTeams)

  const isTournamentPending = tournamentRegistration?.status === "pending"
  const isTournamentApproved = tournamentRegistration?.status === "approved"
  
  const checkInState = getCheckInState({
    summary,
    hasUser: Boolean(userProfile),
    hasApprovedPlayer: Boolean(approvedPlayer),
    registration: tournamentRegistration,
    t,
  })
  
  const manageableTeams = platformState?.manageableTeams ?? []
  const approvedTeams = manageableTeams.filter((t) => t.status === "approved")
  
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState(approvedTeams[0]?.id ?? "")

  useEffect(() => {
    if (approvedTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(approvedTeams[0].id)
    }
  }, [approvedTeams, selectedTeamId])

  const selectedTeam = approvedTeams.find((t) => t.id === selectedTeamId)
  const isTeamAlreadyRegistered = summary.participantType === "team" && selectedTeam?.isRegistered
  const isTeamEligible = summary.participantType !== "team" || (selectedTeam && selectedTeam.eligibility?.allowed)

  const canSubmit =
    !isDisabled &&
    Boolean(approvedPlayer) &&
    !isTournamentPending &&
    !isTournamentApproved &&
    (summary.participantType !== "team" || (approvedTeams.length > 0 && !isTeamAlreadyRegistered && isTeamEligible))

  const applicationStatus = playerApplication?.status ?? null

  return (
    <section className="relative z-10 px-4 py-24" id="registration">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow={t.registration.eyebrow} title={visibleTournamentName}>
          <span className="glass-card mt-4 inline-flex max-w-full break-words rounded-full px-4 py-1.5 text-center text-sm font-medium uppercase tracking-widest text-primary">
            {summary.participantType === "player" ? t.registration.joinPlayersTournament : t.registration.joinTeamsTournament}
          </span>
        </SectionHeading>

        <div className="glass-card mx-auto grid gap-6 rounded-2xl p-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-8">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                {summary.statusLabel}
              </p>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/65 uppercase tracking-wide">
                {summary.participantType === "player" ? t.registration.playersTournamentLabel : t.registration.teamsTournamentLabel}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <RegistrationStat label={t.registration.stats.approved} value={String(summary.approvedCount)} />
                <RegistrationStat label={t.registration.stats.pending} value={String(summary.pendingCount)} />
                <RegistrationStat
                  label={t.registration.stats.slotsLeft}
                  value={summary.slotsLeft === null ? t.registration.stats.tba : String(summary.slotsLeft)}
                />
                <RegistrationStat
                  label={t.registration.stats.capacity}
                  value={summary.capacity === null ? t.registration.stats.tba : String(summary.capacity)}
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

            {checkInFeedback ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  checkInFeedback.tone === "success"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-red-300/20 bg-red-300/10 text-red-100"
                }`}
              >
                {checkInFeedback.message}
              </div>
            ) : null}
          </div>

          <div className="grid gap-5">
            <CheckInCard
              state={checkInState}
              tournamentId={summary.tournamentId}
              userProfile={userProfile}
            />

            <form action={submitTournamentRegistration} className="grid gap-3 sm:grid-cols-2">
              {userProfile && !approvedPlayer ? (
                <PlayerApplicationState
                  status={applicationStatus}
                  lang={lang}
                  onApplyClick={() => setShowOnboardingModal(true)}
                />
              ) : null}
              {userProfile && approvedPlayer && summary.participantType === "team" && manageableTeams.length === 0 ? (
                <div className="sm:col-span-2 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-4">
                  <p className="text-sm font-semibold text-red-100">
                    {t.registration.alerts.approvedTeamsOnly}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {t.registration.alerts.noTeamsOwned}
                  </p>
                </div>
              ) : null}
              {userProfile && approvedPlayer && summary.participantType === "team" && manageableTeams.length > 0 && approvedTeams.length === 0 ? (
                <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-100">
                    {t.registration.alerts.approvedTeamsOnly}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {t.registration.alerts.teamsPendingApproval}
                  </p>
                </div>
              ) : null}
              {userProfile && approvedPlayer && summary.participantType === "team" && selectedTeam && !selectedTeam.eligibility?.allowed ? (
                <div className="sm:col-span-2 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-4">
                  <p className="text-sm font-semibold text-red-100">
                    {t.registration.alerts.teamIneligible}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {selectedTeam.eligibility?.reason === "no-captain-assigned"
                      ? t.registration.alerts.noCaptainAssigned
                      : t.registration.alerts.genericIneligible}
                  </p>
                </div>
              ) : null}
              {userProfile && approvedPlayer && summary.participantType === "team" && selectedTeam?.isRegistered ? (
                <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-100">
                    {t.registration.alerts.teamAlreadyRegistered}
                  </p>
                </div>
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
                    {t.registration.discordLoginRequired}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {t.registration.registrationsTiedToDiscord}
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
                      {t.registration.discordAccount}
                    </p>
                    <p className="truncate text-sm font-medium text-white/80">
                      {userProfile.discord_username}
                    </p>
                  </div>
                </div>
              ) : null}
              {!isDisabled && approvedPlayer ? (
                <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  {t.registration.approvedPlayerPrefix} {approvedPlayer.nickname ?? approvedPlayer.name}
                </div>
              ) : null}
              {!isDisabled && isTournamentPending ? (
                <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4 text-sm text-amber-100">
                  {t.registration.pendingAdminApproval}
                </div>
              ) : null}
              {!isDisabled && isTournamentApproved ? (
                <div className="sm:col-span-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-4 text-sm text-primary">
                  {t.registration.approvedForTournament}
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
                {summary.participantType === "team" ? (
                  <RegistrationField label={t.registration.alerts.selectYourTeam}>
                    <select
                      name="team_id"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      disabled={!canSubmit}
                      className={`${inputClassName} cursor-pointer`}
                    >
                      {approvedTeams.map((team) => (
                        <option key={team.id} value={team.id} className="bg-neutral-900 text-white">
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="hidden"
                      name="display_name"
                      value={approvedTeams.find((t) => t.id === selectedTeamId)?.name ?? ""}
                    />
                  </RegistrationField>
                ) : (
                  <RegistrationField label={`${typeLabel} ${t.registration.fields.name.toLowerCase()}`}>
                    <input
                      name="display_name"
                      required
                      disabled={!canSubmit}
                      className={inputClassName}
                      defaultValue={
                        approvedPlayer
                          ? approvedPlayer.nickname ?? approvedPlayer.name
                          : undefined
                      }
                      placeholder={t.registration.fields.placeholderPlayer}
                    />
                  </RegistrationField>
                )}
                {summary.participantType === "team" ? (
                  <RegistrationField label={t.registration.fields.captainNickname}>
                    <input
                      name="captain_nickname"
                      required
                      disabled={!canSubmit}
                      className={inputClassName}
                      placeholder={t.registration.fields.captainPlaceholder}
                      defaultValue={
                        approvedPlayer
                          ? approvedPlayer.nickname ?? approvedPlayer.name
                          : undefined
                      }
                    />
                  </RegistrationField>
                ) : null}

                <RegistrationField label={t.registration.fields.contactHandle}>
                  <input
                    name="contact_handle"
                    disabled={!canSubmit}
                    className={inputClassName}
                    placeholder={t.registration.fields.handlePlaceholder}
                  />
                </RegistrationField>
                <RegistrationField label={t.registration.fields.region}>
                  <input
                    name="region"
                    disabled={!canSubmit}
                    className={inputClassName}
                    placeholder={t.registration.fields.regionPlaceholder}
                  />
                </RegistrationField>
                {summary.participantType === "team" ? (
                  <TeamRosterFields
                    disabled={!canSubmit}
                    teamSize={summary.teamSize}
                    substitutes={summary.substitutes}
                  />
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <SubmitButton
                  isDisabled={!canSubmit}
                  text={
                    isDisabled
                      ? summary.statusLabel
                      : isTournamentPending
                        ? t.registration.buttons.approvalPending
                        : isTournamentApproved
                          ? t.registration.buttons.approved
                          : isTeamAlreadyRegistered
                            ? t.registration.alerts.submitButtonTeamRegistered
                            : approvedPlayer
                              ? (summary.participantType === "player" 
                                  ? t.registration.alertsExtra.registerPlayer
                                  : t.registration.alertsExtra.registerTeam)
                              : userProfile
                                ? applicationStatus === "pending"
                                  ? t.registration.buttons.playerPending
                                  : t.registration.buttons.playerRequired
                                : t.registration.buttons.loginToRegister
                  }
                  processingText={t.registration.alerts.processingText}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      <PlayerOnboardingModal
        userProfile={userProfile}
        hasApprovedPlayer={Boolean(approvedPlayer)}
        hasApplication={Boolean(playerApplication && playerApplication.status === "pending")}
        forceOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
      />
    </section>
  )
}

type CheckInState = {
  label: string
  message: string
  tone: "locked" | "ready" | "success" | "warning"
  canCheckIn: boolean
  checkedInAt: string | null
}

function CheckInCard({
  state,
  tournamentId,
  userProfile,
}: {
  state: CheckInState
  tournamentId: string
  userProfile: PlatformUserState["userProfile"]
}) {
  const { t } = useLanguage()

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-[0_0_42px_rgba(0,200,150,0.10)] ${getCheckInCardClassName(state.tone)}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            {t.registration.checkIn.title}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{state.label}</h3>
          <p className="mt-2 text-sm leading-6 text-white/68">{state.message}</p>
          {state.checkedInAt ? (
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-primary/70">
              {t.registration.checkIn.confirmedAt} {formatKyivCheckInDateWithLabel(state.checkedInAt)}
            </p>
          ) : null}
        </div>
        {state.canCheckIn ? (
          <form action={checkInTournament} className="shrink-0">
            <input type="hidden" name="tournament_id" value={tournamentId} />
            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-black shadow-[0_0_28px_rgba(0,200,150,0.22)] transition hover:bg-primary/90 sm:w-auto cursor-pointer"
            >
              {t.registration.checkIn.checkInButton}
            </button>
          </form>
        ) : !userProfile ? (
          <LoginButton />
        ) : null}
      </div>
    </div>
  )
}

function getCheckInState({
  summary,
  hasUser,
  hasApprovedPlayer,
  registration,
  t,
}: {
  summary: TournamentRegistrationSummary
  hasUser: boolean
  hasApprovedPlayer: boolean
  registration: PlatformUserState["tournamentRegistration"]
  t: any
}): CheckInState {
  if (!hasUser) {
    return {
      label: t.registration.checkIn.states.loginRequired.label,
      message: t.registration.checkIn.states.loginRequired.message,
      tone: "locked",
      canCheckIn: false,
      checkedInAt: null,
    }
  }

  if (!hasApprovedPlayer) {
    return {
      label: t.registration.checkIn.states.playerRequired.label,
      message: t.registration.checkIn.states.playerRequired.message,
      tone: "warning",
      canCheckIn: false,
      checkedInAt: null,
    }
  }

  if (!registration) {
    return {
      label: t.registration.checkIn.states.registrationRequired.label,
      message: t.registration.checkIn.states.registrationRequired.message,
      tone: "locked",
      canCheckIn: false,
      checkedInAt: null,
    }
  }

  if (registration.status === "pending") {
    return {
      label: t.registration.checkIn.states.pending.label,
      message: t.registration.checkIn.states.pending.message,
      tone: "warning",
      canCheckIn: false,
      checkedInAt: null,
    }
  }

  if (registration.check_in_status === "checked_in") {
    return {
      label: t.registration.checkIn.states.success.label,
      message: `${registration.display_name} ${t.registration.checkIn.states.success.message}`,
      tone: "success",
      canCheckIn: false,
      checkedInAt: registration.checked_in_at,
    }
  }

  const windowState = getCheckInWindowState(summary)

  if (windowState === "soon") {
    return {
      label: t.registration.checkIn.states.soon.label,
      message: `${t.registration.checkIn.states.soon.message} ${formatKyivCheckInDateWithLabel(summary.checkInOpensAt)}.`,
      tone: "locked",
      canCheckIn: false,
      checkedInAt: null,
    }
  }

  if (windowState === "closed") {
    return {
      label: t.registration.checkIn.states.closed.label,
      message: summary.checkInClosesAt
        ? `${t.registration.checkIn.states.closed.messageClosed} ${formatKyivCheckInDateWithLabel(summary.checkInClosesAt)}.`
        : t.registration.checkIn.states.closed.messageNotConfigured,
      tone: "locked",
      canCheckIn: false,
      checkedInAt: null,
    }
  }

  return {
    label: t.registration.checkIn.states.ready.label,
    message: `${registration.display_name} ${t.registration.checkIn.states.ready.message}`,
    tone: "ready",
    canCheckIn: true,
    checkedInAt: null,
  }
}

function getCheckInWindowState(summary: TournamentRegistrationSummary) {
  return getCheckInWindowStateUtc({
    opensAt: summary.checkInOpensAt,
    closesAt: summary.checkInClosesAt,
  })
}

function getCheckInCardClassName(tone: CheckInState["tone"]) {
  if (tone === "success") {
    return "border-primary/35 bg-primary/10"
  }

  if (tone === "ready") {
    return "border-primary/30 bg-black/30"
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10"
  }

  return "border-white/10 bg-black/25"
}

function PlayerApplicationState({
  status,
  lang,
  onApplyClick,
}: {
  status: "pending" | "approved" | "rejected" | null
  lang: "uk" | "en"
  onApplyClick: () => void
}) {
  const { t } = useLanguage()

  if (status === "pending") {
    return (
      <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4">
        <p className="text-sm font-semibold text-amber-100">
          {t.registration.alertsExtra.profilePendingTitle}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {t.registration.alertsExtra.profilePendingMessage}
        </p>
      </div>
    )
  }

  if (status === "rejected") {
    return (
      <div className="sm:col-span-2 rounded-xl border border-red-300/25 bg-red-300/10 px-4 py-4 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-red-100">
            {t.registration.alertsExtra.profileRejectedTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/70">
            {t.registration.alertsExtra.profileRejectedMessage}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={onApplyClick}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:bg-primary/90 cursor-pointer shadow-[0_0_24px_rgba(0,200,150,0.18)]"
          >
            {t.playerOnboarding.apply}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sm:col-span-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-4 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-amber-100">
          {t.registration.alertsExtra.profileRequiredTitle}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {t.registration.alertsExtra.profileRequiredMessage}
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={onApplyClick}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:bg-primary/90 cursor-pointer shadow-[0_0_24px_rgba(0,200,150,0.18)]"
        >
          {t.playerOnboarding.apply}
        </button>
      </div>
    </div>
  )
}

function LoginButton() {
  return (
    <DiscordLoginOnboarding
      className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-black transition hover:bg-primary/90 cursor-pointer"
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

function TeamRosterFields({
  disabled,
  teamSize,
  substitutes,
}: {
  disabled: boolean
  teamSize: number
  substitutes: number
}) {
  const { t } = useLanguage()

  return (
    <div className="sm:col-span-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          {t.registration.fields.teamRoster}
        </p>
        <p className="text-sm text-white/55">
          {t.registration.fields.rosterDescription}
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: teamSize }, (_, i) => i + 1).map((index) => (
          <RegistrationField key={`main-${index}`} label={`${t.registration.fields.mainPlayer} ${index}`}>
            <input
              name={`roster_main_${index}`}
              required
              disabled={disabled}
              className={inputClassName}
              placeholder={`${t.registration.fields.playerNicknamePlaceholder}`}
            />
          </RegistrationField>
        ))}
        {Array.from({ length: substitutes }, (_, i) => i + 1).map((index) => (
          <RegistrationField key={`sub-${index}`} label={`${t.registration.fields.substitute} ${index}`}>
            <input
              name={`roster_sub_${index}`}
              disabled={disabled}
              className={inputClassName}
              placeholder={t.registration.fields.optionalPlaceholder}
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

function SubmitButton({
  isDisabled,
  text,
  processingText = "Processing...",
}: {
  isDisabled: boolean
  text: string
  processingText?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={isDisabled || pending}
      className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50 cursor-pointer flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{processingText}</span>
        </>
      ) : (
        text
      )}
    </button>
  )
}
