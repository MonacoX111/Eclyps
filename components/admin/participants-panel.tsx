"use client"

import { useState } from "react"
import type { AdminParticipant } from "@/lib/admin/participants"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminFeedback } from "@/lib/admin/types"
import { deleteParticipant, addParticipant } from "@/app/admin/actions"
import { AdminField, inputClassName } from "@/components/admin/admin-form-fields"
import {
  AdminEmptyState,
  AdminSection,
  innerPanelClassName,
  pillClassName,
  recordClassName,
  panelGridClassName,
} from "@/components/admin/admin-section"
import { useLanguage } from "@/components/language-provider"
import { getAdminFieldHints } from "@/components/admin/admin-field-hints"

export function ParticipantsPanel({
  participants,
  tournaments,
  players,
  teams,
  fetchError,
  feedback,
}: {
  participants: AdminParticipant[]
  tournaments: AdminTournament[]
  players: AdminPlayer[]
  teams: AdminTeam[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t, lang } = useLanguage()
  const fh = getAdminFieldHints(lang === "uk")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "team" | "player">("all")
  const [addType, setAddType] = useState<"player" | "team">("player")

  // Create lookup map for tournament names
  const tournamentNames = new Map(
    tournaments.map((t) => [t.id, t.name ?? "Untitled tournament"]),
  )

  // Filter participants client-side
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = (p.display_name ?? "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())

    const matchesTournament =
      selectedTournamentId === "all" || p.tournament_id === selectedTournamentId

    const matchesType = typeFilter === "all" || p.participant_type === typeFilter

    return matchesSearch && matchesTournament && matchesType
  })
  const activeParticipantsLabel = (
    t.admin.participants.activeParticipantsLabel ?? "Active participants ({count})"
  ).replace("{count}", String(filteredParticipants.length))

  return (
    <AdminSection
      id="participants"
      title={t.admin.participants.title}
      description={t.admin.participants.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="participants"
    >
      <div className={panelGridClassName}>
        {/* Left Column: Manual Participant Add Form */}
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium text-white/90">{t.admin.participants.addParticipant}</h3>
          <p className="mt-1 text-xs text-white/45 leading-relaxed">
            {t.admin.participants.addParticipantDesc}
          </p>

          <form action={addParticipant} className="mt-5 space-y-5">
            <AdminField label={t.admin.participants.tournamentField} hint={fh.participants.tournament}>
              <select name="tournament_id" required className={inputClassName} defaultValue="">
                <option value="" disabled>
                  {t.admin.participants.selectTournament}
                </option>
                {tournaments.map((tournamentItem) => (
                  <option key={tournamentItem.id} value={tournamentItem.id}>
                    {tournamentItem.name ?? t.admin.participants.untitledTournament}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label={t.admin.participants.participantTypeField} hint={fh.participants.participantType}>
              <select
                name="participant_type"
                value={addType}
                onChange={(e) => setAddType(e.target.value as "player" | "team")}
                className={inputClassName}
              >
                <option value="player">{t.admin.participants.playerType}</option>
                <option value="team">{t.admin.participants.teamType}</option>
              </select>
            </AdminField>

            <AdminField label={addType === "player" ? t.admin.participants.globalPlayer : t.admin.participants.globalTeam} hint={fh.participants.global}>
              <select name="participant_id" defaultValue="" required className={inputClassName}>
                <option value="" disabled>
                  {addType === "player" ? t.admin.participants.selectPlayer : t.admin.participants.selectTeam}
                </option>
                {addType === "player"
                  ? players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name} {p.discord_username ? `(${p.discord_username})` : ""}
                      </option>
                    ))
                  : teams.map((teamItem) => (
                      <option key={teamItem.id} value={teamItem.id}>
                        {teamItem.name ?? t.admin.participants.untitledTeam}
                      </option>
                    ))}
              </select>
            </AdminField>

            <AdminField label={t.admin.participants.seedField} hint={fh.participants.seed}>
              <input
                name="seed"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 1, 2, 3"
                className={inputClassName}
              />
            </AdminField>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-300 px-4 py-3 font-medium text-black transition hover:bg-emerald-200 cursor-pointer text-sm"
              >
                {t.admin.participants.addToTournament}
              </button>
            </div>
          </form>
        </article>

        {/* Right Column: Existing List & Client Filters */}
        <article className={innerPanelClassName}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white/90">
                {activeParticipantsLabel}
              </h3>
            </div>

            {/* Controls: Search, Tournament Filter, and Participant Type Filter */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
                {/* Search input */}
                <input
                  type="text"
                  placeholder={t.admin.participants.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-[200px] rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none transition focus:border-primary/60"
                />

                {/* Tournament dropdown filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/45">{t.admin.participants.tournamentLabel}</span>
                  <select
                    value={selectedTournamentId}
                    onChange={(e) => setSelectedTournamentId(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none transition focus:border-primary/60 cursor-pointer"
                  >
                    <option value="all">{t.admin.extra.all}</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.name ?? t.admin.participants.untitledTournament}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Participant Type Filters */}
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-white/45 mr-1">{t.admin.extra.typeLabel}</span>
                {(["all", "team", "player"] as const).map((filter) => {
                  const label =
                    filter === "all"
                      ? t.admin.extra.all
                      : filter === "team"
                      ? t.admin.extra.teamsOption
                      : t.admin.extra.playersOption
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTypeFilter(filter)}
                      className={`rounded-full border px-2 py-0.5 transition cursor-pointer ${
                        typeFilter === filter
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

            {filteredParticipants.length === 0 ? (
              <AdminEmptyState>{t.admin.participants.noParticipantsFilters}</AdminEmptyState>
            ) : (
              <div className="mt-2 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredParticipants.map((participant) => {
                  const tournamentName =
                    tournamentNames.get(participant.tournament_id) ?? t.admin.participants.unknownTournament

                  return (
                    <div key={participant.id} className={recordClassName}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          {/* Avatar / Logo representation */}
                          {participant.avatar_url || participant.logo_url ? (
                            <img
                              src={participant.avatar_url || participant.logo_url || ""}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-xs font-semibold text-white/45">
                              {participant.display_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <h4 className="font-medium text-sm text-white/90 flex items-center gap-2 flex-wrap">
                              {participant.display_name}
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
                                  participant.participant_type === "team"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                    : "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
                                }`}
                              >
                                {participant.participant_type === "team"
                                  ? t.admin.participants.teamType
                                  : t.admin.participants.playerType}
                              </span>
                            </h4>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
                              <span>{tournamentName}</span>
                              {participant.region && (
                                <>
                                  <span>•</span>
                                  <span>{participant.region}</span>
                                </>
                              )}
                              {participant.created_at && (
                                <>
                                  <span>•</span>
                                  <span className="text-[10px] text-white/35">
                                    {t.admin.participants.addedLabel}{new Date(participant.created_at).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right column: Seed badge and Safe Removal button */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                          <span className={pillClassName}>
                            {t.admin.participants.seedLabel}{participant.seed ?? "???"}
                          </span>

                          <form action={deleteParticipant}>
                            <input type="hidden" name="id" value={participant.id} />
                            <button
                              type="submit"
                              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 cursor-pointer"
                            >
                              {t.admin.participants.remove}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </article>
      </div>
    </AdminSection>
  )
}