"use client"

import { useState } from "react"
import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { createPlayer, deletePlayer, updatePlayer, reviewPlayer } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, pillClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, SubmitButton } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"

export function PlayersPanel({
  players,
  fetchError,
  feedback,
}: {
  players: AdminPlayer[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t, lang } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  // Client-side search and status filter
  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      (player.display_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.real_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.discord_username ?? "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || (player.status ?? "approved") === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <AdminSection
      id="players"
      title={t.admin.players.title}
      description={t.admin.players.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="players"
    >
      <div className={panelGridClassName}>
        {/* Creation panel */}
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.players.createPlayer}</h3>
          <p className="mt-1 text-xs text-white/45">{t.admin.players.createPlayerDesc}</p>
          <PlayerForm action={createPlayer} submitLabel={t.admin.players.createPlayer} />
        </article>

        {/* List panel */}
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium font-semibold">{t.admin.players.globalPlayersList}</h3>

          {/* Client-side search and status filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder={t.admin.players.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none transition focus:border-primary/60"
            />
            <div className="flex flex-wrap gap-1 text-[11px]">
              {(["all", "pending", "approved", "rejected"] as const).map((filter) => {
                const label =
                  filter === "all"
                    ? (lang === "uk" ? "Всі" : "All")
                    : filter === "pending"
                    ? (lang === "uk" ? "На розгляді" : "Pending")
                    : filter === "approved"
                    ? (lang === "uk" ? "Схвалено" : "Approved")
                    : (lang === "uk" ? "Відхилено" : "Rejected")
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

          {filteredPlayers.length === 0 ? (
            <AdminEmptyState>{t.admin.players.noPlayersFilters}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {filteredPlayers.map((player) => (
                <PlayerRecord
                  key={player.id}
                  player={player}
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function PlayerRecord({
  player,
}: {
  player: AdminPlayer
}) {
  const { t, lang } = useLanguage()
  const showRealName = Boolean(
    player.real_name && player.real_name !== player.display_name,
  )

  const status = player.status ?? "approved"
  const displayStatus =
    status === "approved"
      ? (lang === "uk" ? "Схвалено" : "Approved")
      : status === "rejected"
      ? (lang === "uk" ? "Відхилено" : "Rejected")
      : (lang === "uk" ? "На розгляді" : "Pending")

  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {player.avatar_url ? (
              <img
                src={player.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-xs font-semibold text-white/45">
                {player.display_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="break-words font-medium text-sm flex items-center gap-2">
                {player.display_name}
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
                {showRealName && (
                  <span className="text-white/45">{player.real_name}</span>
                )}
                {player.region && (
                  <span className="text-white/45">• {player.region}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                {player.discord_username && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 text-[9px] text-indigo-200">
                    {t.admin.players.discordLabel}{player.discord_username}
                  </span>
                )}
                {player.created_at && (
                  <span className="text-[9px] text-white/35">
                    {t.admin.players.joinedLabel}{new Date(player.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={pillClassName}>{t.admin.players.seedLabel}{player.seed ?? "???"}</span>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        {/* Approve / Reject Actions Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <form action={reviewPlayer} className="flex flex-wrap gap-2 w-full">
            <input type="hidden" name="id" value={player.id} />
            {status !== "approved" && (
              <button
                type="submit"
                name="status"
                value="approved"
                className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-300 cursor-pointer"
              >
                {t.admin.players.approvePlayer}
              </button>
            )}
            {status !== "rejected" && (
              <button
                type="submit"
                name="status"
                value="rejected"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 cursor-pointer"
              >
                {t.admin.players.rejectPlayer}
              </button>
            )}
            {status !== "pending" && (
              <button
                type="submit"
                name="status"
                value="pending"
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer"
              >
                {t.admin.players.restoreToPending}
              </button>
            )}
          </form>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <PlayerForm action={updatePlayer} submitLabel={t.admin.players.saveChanges} player={player} />
          <DeleteForm action={deletePlayer} id={player.id} />
        </div>
      </div>
    </details>
  )
}

function PlayerForm({
  action,
  submitLabel,
  player,
}: {
  action: AdminFormAction
  submitLabel: string
  player?: AdminPlayer
}) {
  const { t } = useLanguage()
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {player && <input type="hidden" name="id" value={player.id} />}
      <AdminField label={t.admin.players.realNameField}>
        <input name="name" defaultValue={player?.name ?? ""} required className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.players.nicknameField}>
        <input name="nickname" defaultValue={player?.nickname ?? player?.display_name ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.players.regionField}>
        <input
          name="region"
          defaultValue={player?.region ?? ""}
          placeholder="Ukraine, EU, North America"
          className={inputClassName}
        />
      </AdminField>
      <AdminField label={t.admin.players.seedField}>
        <input name="seed" type="number" min={1} step={1} defaultValue={player?.seed ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.players.winsField}>
        <input name="wins" type="number" min={0} step={1} defaultValue={player?.wins ?? 0} required className={inputClassName} />
      </AdminField>
      <AdminField label={t.admin.players.lossesField}>
        <input name="losses" type="number" min={0} step={1} defaultValue={player?.losses ?? 0} required className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} />
    </form>
  )
}
