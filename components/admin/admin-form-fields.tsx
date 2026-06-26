"use client"

import type React from "react"
import { useFormStatus } from "react-dom"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFormAction } from "@/lib/admin/types"
import { normalizeStatus } from "@/lib/admin/formatters"
import { useLanguage } from "@/components/language-provider"

export const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"

export type FieldHint = {
  title?: string
  example?: string
}

function FieldHintBadge({ hint }: { hint: FieldHint }) {
  return (
    <span className="group/hint relative inline-flex normal-case">
      <button
        type="button"
        tabIndex={0}
        aria-label="Підказка"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-white/25 text-[10px] font-bold leading-none text-white/55 transition hover:border-emerald-300/70 hover:text-emerald-200 focus:border-emerald-300/70 focus:text-emerald-200 focus:outline-none"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-6 z-30 w-60 -translate-x-1/2 rounded-xl border border-white/12 bg-[#0b0f14] p-3 text-left text-xs font-normal normal-case leading-5 tracking-normal text-white/80 opacity-0 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] transition-opacity duration-150 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100">
        {hint.title ? <span className="block text-white/90">{hint.title}</span> : null}
        {hint.example ? (
          <span className="mt-1 block text-emerald-200/85">
            <span className="text-white/40">Приклад: </span>
            {hint.example}
          </span>
        ) : null}
      </span>
    </span>
  )
}

export function AdminField({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: FieldHint
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-white/75">
      <span className="flex min-h-[2.25rem] items-end gap-1.5 text-xs font-semibold uppercase leading-[1.2] tracking-[0.14em] text-white/45">
        <span>{label}</span>
        {hint ? <FieldHintBadge hint={hint} /> : null}
      </span>
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
  const { t, lang } = useLanguage()
  const hint =
    lang === "uk"
      ? { title: "Турнір, до якого належить цей запис.", example: "Eclyps Winter Cup 2026" }
      : { title: "Tournament this record belongs to.", example: "Eclyps Winter Cup 2026" }

  return (
    <AdminField label={t.admin.extra.tournamentLabel} hint={hint}>
      <select name="tournament_id" defaultValue={value ?? ""} required className={inputClassName}>
        <option value="" disabled>
          {t.admin.extra.selectTournament}
        </option>
        {tournaments.map((tournament) => (
          <option key={tournament.id} value={tournament.id}>
            {tournament.name ?? t.admin.extra.untitledTournament}
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
  const { t, lang } = useLanguage()
  const hint =
    lang === "uk"
      ? { title: "Поточний статус запису.", example: "Майбутній, Наживо, Завершено" }
      : { title: "Current status of the record.", example: "Upcoming, Live, Finished" }

  return (
    <AdminField label={t.admin.extra.statusLabel} hint={hint}>
      <select
        name="status"
        defaultValue={normalizeStatus(value)}
        disabled={disabled}
        className={inputClassName}
      >
        <option value="upcoming">{t.admin.extra.upcoming}</option>
        <option value="live">{t.admin.extra.live}</option>
        <option value="finished">{t.admin.extra.finished}</option>
      </select>
    </AdminField>
  )
}

export function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  const { lang } = useLanguage()
  const isDisabled = Boolean(disabled || pending)

  return (
    <div className="sm:col-span-2">
      <button
        type="submit"
        disabled={isDisabled}
        aria-busy={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-semibold text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
      >
        {pending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black disabled:border-white/30" />
        ) : null}
        {pending ? getPendingLabel(lang) : label}
      </button>
    </div>
  )
}

export function DeleteForm({ action, id }: { action: AdminFormAction; id: string }) {
  const { t, lang } = useLanguage()

  return (
    <form action={action} className="self-end">
      <input type="hidden" name="id" value={id} />
      <DeleteButton label={t.admin.extra.delete} pendingLabel={getDeletingLabel(lang)} />
    </form>
  )
}

function DeleteButton({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300/20 px-4 py-3 text-sm font-semibold text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40 cursor-pointer"
    >
      {pending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-100/30 border-t-red-100" />
      ) : null}
      {pending ? pendingLabel : label}
    </button>
  )
}

function getPendingLabel(lang: string) {
  return lang === "uk" ? "Обробка..." : "Processing..."
}

function getDeletingLabel(lang: string) {
  return lang === "uk" ? "Видалення..." : "Deleting..."
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