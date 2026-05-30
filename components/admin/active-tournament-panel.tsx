"use client"

import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback } from "@/lib/admin/types"
import { formatDisplayDate } from "@/lib/admin/formatters"
import { setActiveTournament } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, pillClassName } from "@/components/admin/admin-section"
import { useLanguage } from "@/components/language-provider"

export function ActiveTournamentPanel({
  tournaments,
  fetchError,
  feedback,
}: {
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t } = useLanguage()
  return (
    <AdminSection
      id="active-tournament"
      title={t.admin.activeTournament.title}
      description={t.admin.activeTournament.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="tournaments"
    >
      {tournaments.length === 0 ? (
        <AdminEmptyState>{t.admin.activeTournament.noTournamentsDb}</AdminEmptyState>
      ) : (
        <div className="mt-6 space-y-3">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h3 className="break-words font-medium">{tournament.name ?? t.admin.activeTournament.untitledTournament}</h3>
                <p className="mt-1 break-words text-sm text-white/55">
                  {tournament.game ?? t.admin.activeTournament.unknownGame} {"\u2022"} {formatDisplayDate(tournament.event_date)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {tournament.is_active ? (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">
                    {t.admin.activeTournament.activeBadge}
                  </span>
                ) : (
                  <span className={pillClassName}>{t.admin.activeTournament.inactiveBadge}</span>
                )}

                <form action={setActiveTournament}>
                  <input type="hidden" name="id" value={tournament.id} />
                  <button
                    type="submit"
                    disabled={Boolean(tournament.is_active)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-emerald-300/40 hover:text-white disabled:cursor-not-allowed disabled:border-emerald-300/20 disabled:bg-emerald-300/10 disabled:text-emerald-100"
                  >
                    {tournament.is_active ? t.admin.activeTournament.currentlyActive : t.admin.activeTournament.setActive}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminSection>
  )
}
