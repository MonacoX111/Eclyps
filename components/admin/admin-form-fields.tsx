"use client"

import type React from "react"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFormAction } from "@/lib/admin/types"
import { normalizeStatus } from "@/lib/admin/formatters"
import { useLanguage } from "@/components/language-provider"

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
  const { lang } = useLanguage()

  return (
    <AdminField label={lang === "uk" ? "Турнір" : "Tournament"}>
      <select name="tournament_id" defaultValue={value ?? ""} required className={inputClassName}>
        <option value="" disabled>
          {lang === "uk" ? "Оберіть турнір" : "Select tournament"}
        </option>
        {tournaments.map((tournament) => (
          <option key={tournament.id} value={tournament.id}>
            {tournament.name ?? (lang === "uk" ? "Турнір без назви" : "Untitled tournament")}
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
  const { lang } = useLanguage()

  return (
    <AdminField label={lang === "uk" ? "Статус" : "Status"}>
      <select
        name="status"
        defaultValue={normalizeStatus(value)}
        disabled={disabled}
        className={inputClassName}
      >
        <option value="upcoming">{lang === "uk" ? "Майбутній" : "Upcoming"}</option>
        <option value="live">{lang === "uk" ? "Наживо" : "Live"}</option>
        <option value="finished">{lang === "uk" ? "Завершено" : "Finished"}</option>
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
  const { lang } = useLanguage()

  return (
    <form action={action} className="self-end">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10 cursor-pointer"
      >
        {lang === "uk" ? "Видалити" : "Delete"}
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
