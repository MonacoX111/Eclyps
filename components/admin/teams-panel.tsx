"use client"

import { useState } from "react"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { createTeam, deleteTeam, updateTeam, approveTeam, rejectTeam, restoreTeamToPending } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, recordClassName, pillClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, SubmitButton, TournamentSelect } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"
import { getAdminFieldHints } from "@/components/admin/admin-field-hints"

export function TeamsPanel({
  teams,
  tournaments,
  fetchError,
  feedback,
}: {
  teams: AdminTeam[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t, lang } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  const tournamentNames = new Map(
    tournaments.map((tournament) => [tournament.id, tournament.name ?? t.admin.teams.unknownTournament]),
  )

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      (team.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.owner_display_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.slug ?? "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || (team.status ?? "approved") === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <AdminSection
      id="teams"
      title={t.admin.teams.title}
      description={t.admin.teams.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="teams"
    >
      <div className={panelGridClassName}>
        {/* Creation Form */}
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.teams.createTeam}</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {t.admin.teams.createTeamDesc}
          </p>

          <TeamForm action={createTeam} submitLabel={t.admin.teams.createTeam} tournaments={tournaments} />
        </article>

        {/* Existing & Global Teams */}
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium font-semibold">{t.admin.teams.globalTeamsList}</h3>

          {/* Client-side search and status filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder={t.admin.teams.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none transition focus:border-primary/60"
            />
            <div className="flex flex-wrap gap-1 text-[11px]">
              {(["all", "pending", "approved", "rejected"] as const).map((filter) => {
                const label =
                  filter === "all"
                    ? t.admin.extra.all
                    : filter === "pending"
                    ? t.admin.extra.pending
                    : filter === "approved"
                    ? t.admin.extra.approved
                    : t.admin.extra.rejected
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded-full border px-2.5 py-1 transition cursor-pointer ${
                      statusFilter === filter
                        ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                        : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {filteredTeams.length === 0 ? (
            <AdminEmptyState>{t.admin.teams.noTeamsFilters}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {filteredTeams.map((team) => (
                <TeamRecord
                  key={team.id}
                  team={team}
                  tournaments={tournaments}
                  tournamentName={
                    team.tournament_id
                      ? tournamentNames.get(team.tournament_id) ?? t.admin.teams.unknownTournament
                      : t.admin.teams.globalTeam
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

function TeamRecord({
  team,
  tournaments,
  tournamentName,
}: {
  team: AdminTeam
  tournaments: AdminTournament[]
  tournamentName: string
}) {
  const { t, lang } = useLanguage()
  const status = team.status ?? "approved"
  const displayStatus =
    status === "approved"
      ? t.admin.extra.approved
      : status === "rejected"
      ? t.admin.extra.rejected
      : t.admin.extra.pending

  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-xs font-semibold text-white/45">
                {team.name ? team.name.slice(0, 2).toUpperCase() : "TM"}
              </div>
            )}
            <div>
              <h4 className="break-words font-medium text-sm flex items-center gap-2">
                {team.name ?? t.admin.teams.untitledTeam}
                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
                  status === "approved"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : status === "rejected"
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                }`}>
                  {displayStatus}
                </span>
              </h4>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {team.slug && (
                  <span className="text-white/45">{t.admin.teams.slugLabel}{team.slug}</span>
                )}
                {team.owner_display_name && (
                  <span className="text-white/45">{t.admin.teams.captainLabel}{team.owner_display_name}</span>
                )}
                <span className="text-white/45">• {team.members_count ?? 0}{t.admin.teams.membersCount}</span>
                {team.tournament_id && (
                  <span className="text-white/45">• {tournamentName}</span>
                )}
              </div>
            </div>
          </div>
          <span className={pillClassName}>{t.admin.teams.seedLabel}{team.seed ?? "???"}</span>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        {/* Approve / Reject Actions Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <form className="flex flex-wrap gap-2 w-full">
            <input type="hidden" name="id" value={team.id} />
            {status !== "approved" && (
              <button
                type="submit"
                formAction={approveTeam}
                className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-300 cursor-pointer"
              >
                {t.admin.teams.approveTeam}
              </button>
            )}
            {status !== "rejected" && (
              <button
                type="submit"
                formAction={rejectTeam}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 cursor-pointer"
              >
                {t.admin.teams.rejectTeam}
              </button>
            )}
            {status !== "pending" && (
              <button
                type="submit"
                formAction={restoreTeamToPending}
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer"
              >
                {t.admin.teams.restoreToPending}
              </button>
            )}
          </form>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TeamForm action={updateTeam} submitLabel={t.admin.teams.saveChanges} tournaments={tournaments} team={team} />
          <DeleteForm action={deleteTeam} id={team.id} />
        </div>
      </div>
    </details>
  )
}

function TeamForm({
  action,
  submitLabel,
  tournaments,
  team,
}: {
  action: AdminFormAction
  submitLabel: string
  tournaments: AdminTournament[]
  team?: AdminTeam
}) {
  const { t, lang } = useLanguage()
  const fh = getAdminFieldHints(lang === "uk")
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {team && <input type="hidden" name="id" value={team.id} />}
      <TournamentSelect tournaments={tournaments} value={team?.tournament_id} />

      <AdminField label={t.admin.teams.nameField} hint={fh.teams.name}>
        <input name="name" defaultValue={team?.name ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.teams.seedField} hint={fh.teams.seed}>
        <input name="seed" type="number" min={1} step={1} defaultValue={team?.seed ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.teams.winsField} hint={fh.teams.wins}>
        <input name="wins" type="number" min={0} step={1} defaultValue={team?.wins ?? 0} required className={inputClassName} />
      </AdminField>

      <AdminField label={t.admin.teams.lossesField} hint={fh.teams.losses}>
        <input name="losses" type="number" min={0} step={1} defaultValue={team?.losses ?? 0} required className={inputClassName} />
      </AdminField>

      <SubmitButton label={submitLabel} />
    </form>
  )
}