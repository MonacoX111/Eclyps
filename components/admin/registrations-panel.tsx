import { reviewRegistration } from "@/app/admin/actions"
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
  const tournamentNames = createTournamentNameMap(tournaments)
  const activeFilter = normalizeRegistrationFilter(filter)
  const filteredRegistrations = filterRegistrations(registrations, activeFilter)
  const pendingRegistrations = filteredRegistrations.filter(
    (registration) => registration.status === "pending",
  )
  const reviewedRegistrations = filteredRegistrations
    .filter((registration) => registration.status !== "pending")
    .slice(0, 8)

  return (
    <AdminSection
      id="registrations"
      title="Registrations"
      description="Review tournament signups before they become approved participants."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="registrations"
    >
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        {registrationFilters.map((item) => (
          <a
            key={item.value}
            href={`/admin?registrationFilter=${item.value}#registrations`}
            className={`rounded-full border px-3 py-1.5 transition ${
              item.value === activeFilter
                ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Pending registrations</h3>
          {pendingRegistrations.length === 0 ? (
            <AdminEmptyState>No pending registrations.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {pendingRegistrations.map((registration) => (
                <RegistrationRecord
                  key={registration.id}
                  registration={registration}
                  tournamentName={
                    tournamentNames.get(registration.tournament_id) ??
                    "Unknown tournament"
                  }
                  showActions
                />
              ))}
            </div>
          )}
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Recent decisions</h3>
          {reviewedRegistrations.length === 0 ? (
            <AdminEmptyState>No reviewed registrations yet.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {reviewedRegistrations.map((registration) => (
                <RegistrationRecord
                  key={registration.id}
                  registration={registration}
                  tournamentName={
                    tournamentNames.get(registration.tournament_id) ??
                    "Unknown tournament"
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

function RegistrationRecord({
  registration,
  tournamentName,
  showActions = false,
}: {
  registration: AdminRegistration
  tournamentName: string
  showActions?: boolean
}) {
  return (
    <div className={recordClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="break-words font-medium">{registration.display_name}</h4>
          <p className="mt-1 break-words text-sm text-white/55">
            {tournamentName} {"\u2022"} {formatType(registration.participant_type)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {registration.registration_type ? (
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-emerald-300 font-medium">
                {registration.registration_type === "player" ? "Global Player" : "Global Team"}
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/50">
                Legacy Signup
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
                Discord: {registration.owner_profile.discord_username}
              </span>
            ) : null}
            <span className={getCheckInPillClassName(registration.check_in_status)}>
              {formatCheckInStatus(registration.check_in_status)}
            </span>
            {registration.checked_in_at ? (
              <span className={pillClassName}>
                Checked in {formatDateTime(registration.checked_in_at)}
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
        <span className={pillClassName}>{formatStatus(registration.status)}</span>
      </div>

      {registration.participant_type === "team" && registration.roster.length > 0 ? (
        <RegistrationRoster roster={registration.roster} />
      ) : null}

      {showActions ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
          <RegistrationDecisionForm
            id={registration.id}
            status="approved"
            label="Approve"
          />
          <RegistrationDecisionForm
            id={registration.id}
            status="rejected"
            label="Reject"
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
  const mainPlayers = roster.filter((entry) => entry.roster_role === "main")
  const substitutes = roster.filter((entry) => entry.roster_role === "substitute")
  const captain = roster.find((entry) => entry.is_captain)

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium uppercase tracking-[0.18em] text-primary/80">
          Roster
        </span>
        {captain ? (
          <span className={pillClassName}>Captain: {captain.nickname}</span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RosterGroup title="Main players" entries={mainPlayers} />
        <RosterGroup title="Substitutes" entries={substitutes} emptyLabel="No substitutes" />
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
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">{emptyLabel ?? "No entries"}</p>
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
  danger = false,
}: {
  id: string
  status: "approved" | "rejected"
  label: string
  danger?: boolean
}) {
  return (
    <form action={reviewRegistration}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
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

function formatType(type: AdminRegistration["participant_type"]) {
  return type === "player" ? "Player" : "Team"
}

function formatStatus(status: AdminRegistration["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
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

function formatCheckInStatus(status: AdminRegistration["check_in_status"]) {
  return status === "checked_in" ? "Checked in" : "Not checked in"
}

function getCheckInPillClassName(status: AdminRegistration["check_in_status"]) {
  return status === "checked_in"
    ? "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100"
    : pillClassName
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
