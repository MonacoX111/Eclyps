"use client"

import { useEffect, useState } from "react"
import { clearRecentRegistrationDecisions, reviewRegistration } from "@/app/admin/actions"
import Image from "next/image"
import type { AdminRegistration } from "@/lib/admin/registrations"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback } from "@/lib/admin/types"
import { createTournamentNameMap } from "@/lib/admin/view-helpers"
import {
  AdminEmptyState,
  AdminSection,
  innerPanelClassName,
  pillClassName,
  recordClassName,
} from "@/components/admin/admin-section"
import { useLanguage } from "@/components/language-provider"

export function RegistrationsPanel({
  registrations,
  tournaments,
  fetchError,
  feedback,
  filter,
}: {
  registrations: AdminRegistration[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
  filter?: string
}) {
  const { t, lang } = useLanguage()
  const tournamentNames = createTournamentNameMap(tournaments)
  const [activeFilter, setActiveFilter] = useState<RegistrationFilter>(
    normalizeRegistrationFilter(filter),
  )

  useEffect(() => {
    setActiveFilter(normalizeRegistrationFilter(filter))
  }, [filter])

  const handleFilterChange = (nextFilter: RegistrationFilter) => {
    setActiveFilter(nextFilter)

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", "applications")
      url.searchParams.set("registrationFilter", nextFilter)
      window.history.replaceState(null, "", url.toString())
    }
  }

  const filteredRegistrations = filterRegistrations(registrations, activeFilter)
  const pendingRegistrations = filteredRegistrations.filter(
    (registration) => registration.status === "pending",
  )
  const approvedRegistrations = registrations.filter(
    (registration) => registration.status === "approved",
  )
  const missingCheckIns = approvedRegistrations.filter(
    (registration) => registration.check_in_status !== "checked_in",
  )
  const checkedInRegistrations = approvedRegistrations.filter(
    (registration) => registration.check_in_status === "checked_in",
  )
  const reviewedRegistrations = filteredRegistrations
    .filter((registration) => registration.status !== "pending" && registration.reviewed_at)
    .sort((left, right) => getTime(right.reviewed_at) - getTime(left.reviewed_at))
    .slice(0, 8)

  return (
    <AdminSection
      id="registrations"
      title={t.admin.registrations.title}
      description={t.admin.registrations.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="registrations"
    >
      <RegistrationQueueSummary
        lang={lang}
        total={registrations.length}
        visible={filteredRegistrations.length}
        pending={pendingRegistrations.length}
        approved={approvedRegistrations.length}
        checkedIn={checkedInRegistrations.length}
        missingCheckIns={missingCheckIns.length}
        onFilterChange={handleFilterChange}
      />

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        {registrationFilters.map((item) => {
          const label =
            item.value === "all"
              ? t.admin.extra.all
              : item.value === "pending"
              ? t.admin.extra.pending
              : item.value === "approved"
              ? t.admin.extra.approved
              : item.value === "checked-in"
              ? t.admin.extra.checkedIn
              : t.admin.extra.notCheckedIn
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleFilterChange(item.value)}
              className={`rounded-full border px-3 py-1.5 transition cursor-pointer ${
                item.value === activeFilter
                  ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.registrations.pendingRegistrations}</h3>
          {pendingRegistrations.length === 0 ? (
            <AdminEmptyState>{t.admin.registrations.noPending}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {pendingRegistrations.map((registration) => (
                <RegistrationRecord
                  key={registration.id}
                  registration={registration}
                  tournamentName={
                    tournamentNames.get(registration.tournament_id) ??
                    t.admin.registrations.unknownTournament
                  }
                  showActions
                />
              ))}
            </div>
          )}
        </article>

        <article className={innerPanelClassName}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-medium">{t.admin.registrations.recentDecisions}</h3>
            {reviewedRegistrations.length > 0 ? (
              <ClearRecentDecisionsForm
                label={lang === "uk" ? "Очистити" : "Clear"}
                confirmMessage={
                  lang === "uk"
                    ? "Прибрати всі нещодавні рішення з цього блоку? Статуси заявок не зміняться."
                    : "Clear all recent decisions from this block? Registration statuses will not change."
                }
              />
            ) : null}
          </div>
          {reviewedRegistrations.length === 0 ? (
            <AdminEmptyState>{t.admin.registrations.noReviewed}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {reviewedRegistrations.map((registration) => (
                <RegistrationRecord
                  key={registration.id}
                  registration={registration}
                  tournamentName={
                    tournamentNames.get(registration.tournament_id) ??
                    t.admin.registrations.unknownTournament
                  }
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function ClearRecentDecisionsForm({
  label,
  confirmMessage,
}: {
  label: string
  confirmMessage: string
}) {
  return (
    <form action={clearRecentRegistrationDecisions}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm(confirmMessage)) event.preventDefault()
        }}
        className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100"
      >
        {label}
      </button>
    </form>
  )
}

function RegistrationQueueSummary({
  lang,
  total,
  visible,
  pending,
  approved,
  checkedIn,
  missingCheckIns,
  onFilterChange,
}: {
  lang: string
  total: number
  visible: number
  pending: number
  approved: number
  checkedIn: number
  missingCheckIns: number
  onFilterChange: (filter: RegistrationFilter) => void
}) {
  const isUk = lang === "uk"
  const checkInRate = approved > 0 ? Math.round((checkedIn / approved) * 100) : 0
  const cards = [
    {
      id: "pending",
      label: isUk ? "Очікують рішення" : "Awaiting decision",
      value: pending,
      filter: "pending" as const,
      tone: pending > 0 ? "warning" : "neutral",
    },
    {
      id: "missing-check-in",
      label: isUk ? "Approved без check-in" : "Approved without check-in",
      value: missingCheckIns,
      filter: "not-checked-in" as const,
      tone: missingCheckIns > 0 ? "warning" : "neutral",
    },
    {
      id: "checked-in",
      label: isUk ? "Check-in rate" : "Check-in rate",
      value: `${checkInRate}%`,
      filter: "checked-in" as const,
      tone: checkInRate >= 80 ? "success" : "neutral",
    },
  ] as const

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300/75">
            {isUk ? "Черга реєстрацій" : "Registration queue"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {pending > 0
              ? isUk ? "Почни з pending заявок" : "Start with pending entries"
              : missingCheckIns > 0
                ? isUk ? "Контролюй check-in перед стартом" : "Monitor check-in before start"
                : isUk ? "Черга виглядає чисто" : "Queue looks clean"}
          </h3>
          <p className="mt-1 text-sm text-white/55">
            {isUk
              ? `Показано ${visible} із ${total} реєстрацій. Карти нижче ведуть до потрібного фільтра.`
              : `Showing ${visible} of ${total} registrations. Cards below jump to the right filter.`}
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
          {approved} {isUk ? "підтверджено" : "approved"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterChange(card.filter)}
            className={`rounded-xl border px-4 py-3 text-left transition hover:bg-white/[0.03] cursor-pointer ${
              card.tone === "success"
                ? "border-emerald-300/25 bg-emerald-300/10"
                : card.tone === "warning"
                  ? "border-amber-300/25 bg-amber-300/10"
                  : "border-white/10 bg-black/20"
            }`}
          >
            <span className="block text-2xl font-black text-white">{card.value}</span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RegistrationRecord({
  registration,
  tournamentName,
  showActions = false,
}: {
  registration: AdminRegistration
  tournamentName: string
  showActions?: boolean
}) {
  const { t, lang } = useLanguage()
  const displayParticipantType =
    registration.participant_type === "player"
      ? t.admin.registrations.playerType
      : t.admin.registrations.teamType

  const status = registration.status
  const displayStatus =
    status === "approved"
      ? t.admin.extra.approved
      : status === "rejected"
      ? t.admin.extra.rejected
      : t.admin.extra.pending

  const displayCheckInStatus =
    registration.check_in_status === "checked_in"
      ? t.admin.registrations.checkedInStatus
      : t.admin.registrations.notCheckedInStatus

  return (
    <div className={recordClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="break-words font-medium">{registration.display_name}</h4>
          <p className="mt-1 break-words text-sm text-white/55">
            {tournamentName} {"\u2022"} {displayParticipantType}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {registration.registration_type ? (
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-emerald-300 font-medium">
                {registration.registration_type === "player"
                  ? t.admin.registrations.globalPlayer
                  : t.admin.registrations.globalTeam}
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/50">
                {t.admin.registrations.legacySignup}
              </span>
            )}
            {registration.owner_profile ? (
              <span className={`${pillClassName} inline-flex items-center gap-2`}>
                {registration.owner_profile.avatar_url ? (
                  <Image
                    src={registration.owner_profile.avatar_url}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover"
                  />
                ) : null}
                {t.admin.registrations.discordLabel}{registration.owner_profile.discord_username}
              </span>
            ) : null}
            <span className={getCheckInPillClassName(registration.check_in_status)}>
              {displayCheckInStatus}
            </span>
            {registration.checked_in_at ? (
              <span className={pillClassName}>
                {t.admin.registrations.checkedIn}{formatDateTime(registration.checked_in_at, lang)}
              </span>
            ) : null}
            {registration.region ? (
              <span className={pillClassName}>{registration.region}</span>
            ) : null}
            {registration.contact_email ? (
              <span className={pillClassName}>{registration.contact_email}</span>
            ) : null}
            {registration.contact_handle ? (
              <span className={pillClassName}>{registration.contact_handle}</span>
            ) : null}
          </div>
        </div>
        <span className={pillClassName}>{displayStatus}</span>
      </div>

      {registration.participant_type === "team" && registration.roster.length > 0 ? (
        <RegistrationRoster roster={registration.roster} />
      ) : null}

      {showActions ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
          <RegistrationDecisionForm
            id={registration.id}
            status="approved"
            label={t.admin.registrations.approve}
            confirmMessage={
              lang === "uk"
                ? `Підтвердити реєстрацію "${registration.display_name}"?`
                : `Approve registration "${registration.display_name}"?`
            }
          />
          <RegistrationDecisionForm
            id={registration.id}
            status="rejected"
            label={t.admin.registrations.reject}
            confirmMessage={
              lang === "uk"
                ? `Відхилити реєстрацію "${registration.display_name}"?`
                : `Reject registration "${registration.display_name}"?`
            }
            danger
          />
        </div>
      ) : null}
    </div>
  )
}

function RegistrationRoster({
  roster,
}: {
  roster: AdminRegistration["roster"]
}) {
  const { t } = useLanguage()
  const mainPlayers = roster.filter((entry) => entry.roster_role === "main")
  const substitutes = roster.filter((entry) => entry.roster_role === "substitute")
  const captain = roster.find((entry) => entry.is_captain)

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium uppercase tracking-[0.18em] text-primary/80">
          {t.admin.registrations.roster}
        </span>
        {captain ? (
          <span className={pillClassName}>{t.admin.registrations.captainLabel}{captain.nickname}</span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RosterGroup title={t.admin.registrations.mainPlayers} entries={mainPlayers} />
        <RosterGroup title={t.admin.registrations.substitutes} entries={substitutes} emptyLabel={t.admin.registrations.noSubstitutes} />
      </div>
    </div>
  )
}

function RosterGroup({
  title,
  entries,
  emptyLabel,
}: {
  title: string
  entries: AdminRegistration["roster"]
  emptyLabel?: string
}) {
  const { t } = useLanguage()
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">{emptyLabel ?? t.admin.registrations.noEntries}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {entries.map((entry) => (
            <span key={entry.id} className={pillClassName}>
              {entry.nickname}
              {entry.is_captain ? " (C)" : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RegistrationDecisionForm({
  id,
  status,
  label,
  confirmMessage,
  danger = false,
}: {
  id: string
  status: "approved" | "rejected"
  label: string
  confirmMessage: string
  danger?: boolean
}) {
  return (
    <form action={reviewRegistration}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm(confirmMessage)) event.preventDefault()
        }}
        className={
          danger
            ? "w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10"
            : "w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-medium text-black transition hover:bg-emerald-200"
        }
      >
        {label}
      </button>
    </form>
  )
}

const registrationFilters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "checked-in", label: "Checked in" },
  { value: "not-checked-in", label: "Not checked in" },
] as const

type RegistrationFilter = (typeof registrationFilters)[number]["value"]

function normalizeRegistrationFilter(value: string | undefined): RegistrationFilter {
  return registrationFilters.some((item) => item.value === value)
    ? (value as RegistrationFilter)
    : "all"
}

function filterRegistrations(
  registrations: AdminRegistration[],
  filter: RegistrationFilter,
) {
  if (filter === "pending") {
    return registrations.filter((registration) => registration.status === "pending")
  }

  if (filter === "approved") {
    return registrations.filter((registration) => registration.status === "approved")
  }

  if (filter === "checked-in") {
    return registrations.filter((registration) => registration.check_in_status === "checked_in")
  }

  if (filter === "not-checked-in") {
    return registrations.filter(
      (registration) =>
        registration.status === "approved" &&
        registration.check_in_status !== "checked_in",
    )
  }

  return registrations
}

function getCheckInPillClassName(status: AdminRegistration["check_in_status"]) {
  return status === "checked_in"
    ? "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100"
    : pillClassName
}

function formatDateTime(value: string, lang: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function getTime(value: string | null) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}
