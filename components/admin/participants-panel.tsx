"use client"

import { useState } from "react"
import type { AdminParticipant } from "@/lib/admin/participants"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback } from "@/lib/admin/types"
import { deleteParticipant } from "@/app/admin/actions"
import {
  AdminEmptyState,
  AdminSection,
  innerPanelClassName,
  pillClassName,
  recordClassName,
} from "@/components/admin/admin-section"

export function ParticipantsPanel({
  participants,
  tournaments,
  fetchError,
  feedback,
}: {
  participants: AdminParticipant[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "team" | "player">("all")

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

  return (
    <AdminSection
      id="participants"
      title="Tournament Participants"
      description="Manage tournament memberships, view seedings, and remove participants safely without deleting global profiles."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="participants"
    >
      <div className="mt-5 space-y-4">
        {/* Controls: Search, Tournament Filter, and Participant Type Filter */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search input */}
            <input
              type="text"
              placeholder="Search by participant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none transition focus:border-primary/60"
            />

            {/* Tournament dropdown filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/45">Tournament:</span>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-primary/60 cursor-pointer"
              >
                <option value="all">All Tournaments</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name ?? "Untitled tournament"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Participant Type Filters */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-white/45 mr-1">Type:</span>
            {(["all", "team", "player"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTypeFilter(filter)}
                className={`rounded-full border px-2.5 py-1 transition cursor-pointer ${
                  typeFilter === filter
                    ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                    : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                }`}
              >
                {filter === "all" ? "All" : filter === "team" ? "Teams" : "Players"}
              </button>
            ))}
          </div>
        </div>

        {/* Participants List */}
        <article className={innerPanelClassName}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white/90">
              Active Participants ({filteredParticipants.length})
            </h3>
          </div>

          {filteredParticipants.length === 0 ? (
            <AdminEmptyState>No participants match the selected filters.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredParticipants.map((participant) => {
                const tournamentName =
                  tournamentNames.get(participant.tournament_id) ?? "Unknown tournament"

                return (
                  <div key={participant.id} className={recordClassName}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                              {participant.participant_type}
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
                                  Added {new Date(participant.created_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right column: Seed badge and Safe Removal button */}
                      <div className="flex flex-wrap items-center gap-3 sm:self-center">
                        <span className={pillClassName}>
                          Seed {participant.seed ?? "???"}
                        </span>

                        <form action={deleteParticipant}>
                          <input type="hidden" name="id" value={participant.id} />
                          <button
                            type="submit"
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 cursor-pointer"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}
