"use client"

import type React from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Radio,
  UserCheck,
  Users,
} from "lucide-react"
import type { AdminMatch } from "@/lib/admin/matches"
import type { AdminParticipant } from "@/lib/admin/participants"
import type { AdminRegistration } from "@/lib/admin/registrations"
import type { AdminTournament } from "@/lib/admin/tournaments"
import { AdminEmptyState, AdminSection, innerPanelClassName } from "@/components/admin/admin-section"
import { useLanguage } from "@/components/language-provider"

type TournamentDayPanelProps = {
  tournaments: AdminTournament[]
  registrations: AdminRegistration[]
  participants: AdminParticipant[]
  matches: AdminMatch[]
  onNavigate: (tabId: string) => void
}

export function TournamentDayPanel({
  tournaments,
  registrations,
  participants,
  matches,
  onNavigate,
}: TournamentDayPanelProps) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"
  const activeTournament = tournaments.find((tournament) => tournament.is_active)

  if (!activeTournament) {
    return (
      <AdminSection
        id="tournament-day"
        title={isUk ? "День турніру" : "Tournament day"}
        description={
          isUk
            ? "Один екран для контролю старту, check-in, учасників і матчів активного турніру."
            : "One screen for controlling start, check-in, participants, and matches for the active tournament."
        }
        feedback={null}
        fetchError={null}
        fetchLabel="tournament day"
      >
        <AdminEmptyState>
          {isUk
            ? "Активний турнір не вибрано. Спочатку обери активний турнір у вкладці Турніри."
            : "No active tournament is selected. Pick an active tournament in the Tournaments tab first."}
        </AdminEmptyState>
        <div className="mt-4">
          <QuickActionButton
            label={isUk ? "Перейти до турнірів" : "Open tournaments"}
            onClick={() => onNavigate("tournaments")}
          />
        </div>
      </AdminSection>
    )
  }

  const tournamentRegistrations = registrations.filter(
    (registration) => registration.tournament_id === activeTournament.id,
  )
  const tournamentParticipants = participants.filter(
    (participant) => participant.tournament_id === activeTournament.id,
  )
  const tournamentMatches = matches.filter(
    (match) => match.tournament_id === activeTournament.id,
  )

  const pendingRegistrations = tournamentRegistrations.filter(
    (registration) => registration.status === "pending",
  )
  const approvedRegistrations = tournamentRegistrations.filter(
    (registration) => registration.status === "approved",
  )
  const checkedInRegistrations = approvedRegistrations.filter(
    (registration) => registration.check_in_status === "checked_in",
  )
  const missingCheckIns = approvedRegistrations.filter(
    (registration) => registration.check_in_status !== "checked_in",
  )
  const bracketMatches = tournamentMatches.filter((match) => Boolean(match.bracket_id))
  const liveMatches = tournamentMatches.filter((match) => match.status === "live")
  const upcomingMatches = tournamentMatches.filter((match) => match.status === "upcoming")
  const finishedMatches = tournamentMatches.filter((match) => match.status === "finished")
  const capacity = activeTournament.team_count ?? 0
  const checkInRate =
    approvedRegistrations.length > 0
      ? Math.round((checkedInRegistrations.length / approvedRegistrations.length) * 100)
      : 0
  const readinessItems = getReadinessItems({
    isUk,
    activeTournament,
    capacity,
    participantCount: tournamentParticipants.length,
    pendingRegistrations: pendingRegistrations.length,
    approvedRegistrations: approvedRegistrations.length,
    missingCheckIns: missingCheckIns.length,
    bracketMatches: bracketMatches.length,
  })
  const blockingItems = readinessItems.filter((item) => item.tone === "danger")
  const warningItems = readinessItems.filter((item) => item.tone === "warning")

  return (
    <AdminSection
      id="tournament-day"
      title={isUk ? "День турніру" : "Tournament day"}
      description={
        isUk
          ? "Один екран для старту турніру: заявки, check-in, учасники, сітка та матчі."
          : "One screen for tournament start: registrations, check-in, participants, bracket, and matches."
      }
      feedback={null}
      fetchError={null}
      fetchLabel="tournament day"
    >
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <article className={`${innerPanelClassName} overflow-hidden`}>
          {activeTournament.banner_url ? (
            <div
              className="mb-4 h-36 rounded-xl border border-white/10 bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.18)), url("${activeTournament.banner_url}")` }}
              aria-hidden="true"
            />
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300/75">
                {isUk ? "Активний турнір" : "Active tournament"}
              </p>
              <h3 className="mt-2 break-words text-2xl font-black text-white">
                {activeTournament.name ?? (isUk ? "Без назви" : "Untitled")}
              </h3>
              <p className="mt-2 text-sm text-white/55">
                {[activeTournament.game, activeTournament.game_mode, formatDate(activeTournament.event_date, lang)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <StatusPill tone={blockingItems.length > 0 ? "danger" : warningItems.length > 0 ? "warning" : "ok"}>
              {blockingItems.length > 0
                ? isUk ? "Потребує дій" : "Needs action"
                : warningItems.length > 0
                  ? isUk ? "Перевірити" : "Review"
                  : isUk ? "Готово" : "Ready"}
            </StatusPill>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Users}
              label={isUk ? "Учасники" : "Participants"}
              value={capacity > 0 ? `${tournamentParticipants.length}/${capacity}` : String(tournamentParticipants.length)}
              helper={isUk ? "додані в турнір" : "added to tournament"}
            />
            <MetricCard
              icon={ClipboardCheck}
              label={isUk ? "Заявки" : "Registrations"}
              value={String(pendingRegistrations.length)}
              helper={isUk ? "очікують рішення" : "waiting for decision"}
              tone={pendingRegistrations.length > 0 ? "warning" : "ok"}
            />
            <MetricCard
              icon={UserCheck}
              label="Check-in"
              value={`${checkInRate}%`}
              helper={`${checkedInRegistrations.length}/${approvedRegistrations.length || 0}`}
              tone={missingCheckIns.length > 0 ? "warning" : "ok"}
            />
            <MetricCard
              icon={Radio}
              label={isUk ? "Матчі" : "Matches"}
              value={String(tournamentMatches.length)}
              helper={`${liveMatches.length} live · ${finishedMatches.length} done`}
              tone={liveMatches.length > 0 ? "ok" : undefined}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionButton
              label={isUk ? "Заявки" : "Applications"}
              helper={isUk ? "approve / reject" : "approve / reject"}
              onClick={() => onNavigate("applications")}
            />
            <QuickActionButton
              label={isUk ? "Учасники" : "Participants"}
              helper={isUk ? "seed і список" : "seed and roster"}
              onClick={() => onNavigate("participants")}
            />
            <QuickActionButton
              label={isUk ? "Сітка" : "Bracket"}
              helper={bracketMatches.length > 0 ? `${bracketMatches.length} matches` : isUk ? "згенерувати" : "generate"}
              onClick={() => onNavigate("bracket")}
            />
            <QuickActionButton
              label={isUk ? "Матчі" : "Matches"}
              helper={`${upcomingMatches.length} upcoming`}
              onClick={() => onNavigate("matches")}
            />
          </div>
        </article>

        <article className={innerPanelClassName}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">
              {isUk ? "Готовність до старту" : "Start readiness"}
            </h3>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/55">
              {readinessItems.filter((item) => item.tone === "ok").length}/{readinessItems.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {readinessItems.map((item) => (
              <ReadinessRow key={item.id} item={item} />
            ))}
          </div>
        </article>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-semibold text-white">
            {isUk ? "Check-in контроль" : "Check-in control"}
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <CompactStat label={isUk ? "Схвалено" : "Approved"} value={approvedRegistrations.length} />
            <CompactStat label={isUk ? "Пройшли" : "Checked in"} value={checkedInRegistrations.length} tone="ok" />
            <CompactStat label={isUk ? "Не пройшли" : "Missing"} value={missingCheckIns.length} tone={missingCheckIns.length > 0 ? "warning" : "ok"} />
          </div>

          {missingCheckIns.length > 0 ? (
            <div className="mt-4 space-y-2">
              {missingCheckIns.slice(0, 6).map((registration) => (
                <div key={registration.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-white/80">{registration.display_name}</span>
                  <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-xs text-amber-100">
                    {isUk ? "немає check-in" : "no check-in"}
                  </span>
                </div>
              ))}
              {missingCheckIns.length > 6 ? (
                <p className="text-xs text-white/45">
                  +{missingCheckIns.length - 6} {isUk ? "ще в списку реєстрацій" : "more in registrations"}
                </p>
              ) : null}
            </div>
          ) : (
            <AdminEmptyState>
              {isUk
                ? "Немає схвалених учасників без check-in."
                : "No approved participants are missing check-in."}
            </AdminEmptyState>
          )}
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-semibold text-white">
            {isUk ? "Матчевий стан" : "Match state"}
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <CompactStat label="Live" value={liveMatches.length} tone={liveMatches.length > 0 ? "ok" : undefined} />
            <CompactStat label={isUk ? "Майбутні" : "Upcoming"} value={upcomingMatches.length} />
            <CompactStat label={isUk ? "Завершені" : "Finished"} value={finishedMatches.length} tone="ok" />
          </div>

          {tournamentMatches.length > 0 ? (
            <div className="mt-4 space-y-2">
              {[...liveMatches, ...upcomingMatches].slice(0, 6).map((match) => (
                <div key={match.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-white/80">
                      {(match.team1 || "TBD")} vs {(match.team2 || "TBD")}
                    </span>
                    <span className="shrink-0 text-xs text-white/45">{match.status ?? "upcoming"}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    {match.bracket_round ?? match.round ?? (isUk ? "Раунд не вказано" : "Round not set")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState>
              {isUk
                ? "Матчі для активного турніру ще не створені."
                : "No matches have been created for the active tournament yet."}
            </AdminEmptyState>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string
  helper: string
  tone?: "ok" | "warning"
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${
      tone === "ok"
        ? "border-emerald-300/20 bg-emerald-300/10"
        : tone === "warning"
          ? "border-amber-300/20 bg-amber-300/10"
          : "border-white/10 bg-black/20"
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</span>
        <Icon className="h-4 w-4 text-emerald-300/80" />
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-white/45">{helper}</p>
    </div>
  )
}

function QuickActionButton({
  label,
  helper,
  onClick,
}: {
  label: string
  helper?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-emerald-300/35 hover:bg-emerald-300/10"
    >
      <span className="block text-sm font-semibold text-white">{label}</span>
      {helper ? <span className="mt-1 block text-xs text-white/45">{helper}</span> : null}
    </button>
  )
}

function ReadinessRow({
  item,
}: {
  item: ReturnType<typeof getReadinessItems>[number]
}) {
  const Icon = item.tone === "ok" ? CheckCircle2 : AlertTriangle

  return (
    <div className={`rounded-xl border px-3 py-3 ${
      item.tone === "ok"
        ? "border-emerald-300/20 bg-emerald-300/10"
        : item.tone === "warning"
          ? "border-amber-300/20 bg-amber-300/10"
          : "border-red-300/20 bg-red-300/10"
    }`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs leading-5 text-white/55">{item.description}</p>
        </div>
      </div>
    </div>
  )
}

function CompactStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "ok" | "warning"
}) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${
      tone === "ok"
        ? "border-emerald-300/20 bg-emerald-300/10"
        : tone === "warning"
          ? "border-amber-300/20 bg-amber-300/10"
          : "border-white/10 bg-black/20"
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warning" | "danger"
  children: React.ReactNode
}) {
  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
      tone === "ok"
        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
        : tone === "warning"
          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
          : "border-red-300/25 bg-red-300/10 text-red-100"
    }`}>
      {children}
    </span>
  )
}

function getReadinessItems({
  isUk,
  activeTournament,
  capacity,
  participantCount,
  pendingRegistrations,
  approvedRegistrations,
  missingCheckIns,
  bracketMatches,
}: {
  isUk: boolean
  activeTournament: AdminTournament
  capacity: number
  participantCount: number
  pendingRegistrations: number
  approvedRegistrations: number
  missingCheckIns: number
  bracketMatches: number
}) {
  return [
    {
      id: "date",
      tone: activeTournament.event_date ? "ok" : "warning",
      title: isUk ? "Дата турніру" : "Tournament date",
      description: activeTournament.event_date
        ? isUk ? "Дата вказана, public UI може нормально показати подію." : "Date is set, public UI can present the event correctly."
        : isUk ? "Додай дату, щоб гравці бачили час події." : "Add a date so players can see when the event happens.",
    },
    {
      id: "slots",
      tone: capacity > 0 && participantCount <= capacity ? "ok" : "warning",
      title: isUk ? "Слоти учасників" : "Participant slots",
      description: capacity > 0
        ? `${participantCount}/${capacity}`
        : isUk ? "Кількість слотів не задана." : "Slot count is not set.",
    },
    {
      id: "registrations",
      tone: pendingRegistrations === 0 ? "ok" : "warning",
      title: isUk ? "Черга реєстрацій" : "Registration queue",
      description: pendingRegistrations === 0
        ? isUk ? "Немає заявок, які очікують рішення." : "No registrations are waiting for a decision."
        : isUk ? `${pendingRegistrations} заявок треба обробити.` : `${pendingRegistrations} registrations need review.`,
    },
    {
      id: "check-in-window",
      tone: activeTournament.check_in_opens_at && activeTournament.check_in_closes_at ? "ok" : "warning",
      title: "Check-in",
      description: activeTournament.check_in_opens_at && activeTournament.check_in_closes_at
        ? isUk ? "Вікно check-in налаштоване." : "Check-in window is configured."
        : isUk ? "Вкажи час відкриття і закриття check-in." : "Set check-in open and close times.",
    },
    {
      id: "checked-in",
      tone: approvedRegistrations === 0 || missingCheckIns > 0 ? "warning" : "ok",
      title: isUk ? "Підтверджені учасники" : "Approved participants",
      description: approvedRegistrations === 0
        ? isUk ? "Ще немає схвалених реєстрацій." : "No approved registrations yet."
        : missingCheckIns > 0
          ? isUk ? `${missingCheckIns} схвалених учасників ще без check-in.` : `${missingCheckIns} approved participants are missing check-in.`
          : isUk ? "Усі схвалені учасники пройшли check-in." : "All approved participants checked in.",
    },
    {
      id: "bracket",
      tone: bracketMatches > 0 ? "ok" : "danger",
      title: isUk ? "Сітка / матчі" : "Bracket / matches",
      description: bracketMatches > 0
        ? isUk ? `Згенеровано ${bracketMatches} bracket-матчів.` : `${bracketMatches} bracket matches generated.`
        : isUk ? "Сітка ще не згенерована." : "Bracket has not been generated yet.",
    },
  ] as const
}

function formatDate(value: string | null, lang: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}
