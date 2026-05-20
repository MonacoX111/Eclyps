import type React from "react"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFormAction } from "@/lib/admin/types"
import { normalizeStatus } from "@/lib/admin/formatters"

export const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none transition focus:border-emerald-300/60"

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 text-sm text-white/75">
      <span className="block">{label}</span>
      {children}
    </label>
  )
}

export function TournamentSelect({
  tournaments,
  value,
}: {
  tournaments: AdminTournament[]
  value?: string | null
}) {
  return (
    <AdminField label="Tournament">
      <select name="tournament_id" defaultValue={value ?? ""} required className={inputClassName}>
        <option value="" disabled>
          Select tournament
        </option>
        {tournaments.map((tournament) => (
          <option key={tournament.id} value={tournament.id}>
            {tournament.name ?? "Untitled tournament"}
          </option>
        ))}
      </select>
    </AdminField>
  )
}

export function StatusSelect({
  value,
  disabled = false,
}: {
  value?: string | null
  disabled?: boolean
}) {
  return (
    <AdminField label="Status">
      <select
        name="status"
        defaultValue={normalizeStatus(value)}
        disabled={disabled}
        className={inputClassName}
      >
        <option value="upcoming">Upcoming</option>
        <option value="live">Live</option>
        <option value="finished">Finished</option>
      </select>
    </AdminField>
  )
}

export function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <div className="sm:col-span-2">
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-xl bg-emerald-300 px-4 py-3 font-medium text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
      >
        {label}
      </button>
    </div>
  )
}

export function DeleteForm({ action, id }: { action: AdminFormAction; id: string }) {
  return (
    <form action={action} className="self-end">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10"
      >
        Delete
      </button>
    </form>
  )
}

export function TeamNameDatalist({ teamNames }: { teamNames: string[] }) {
  return (
    <datalist id="admin-team-names">
      {teamNames.map((teamName) => (
        <option key={teamName} value={teamName} />
      ))}
    </datalist>
  )
}
