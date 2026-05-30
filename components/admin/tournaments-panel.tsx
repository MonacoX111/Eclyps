"use client"

import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import { formatDisplayDate, formatDisplayDateTime, formatStatus } from "@/lib/admin/formatters"
import { createTournament, deleteTournament, updateTournament } from "@/app/admin/actions"
import { AdminEmptyState, AdminSection, innerPanelClassName, panelGridClassName, recordClassName } from "@/components/admin/admin-section"
import { AdminField, DeleteForm, inputClassName, StatusSelect, SubmitButton } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"
import {
  formatKyivDateTimeInput,
  formatKyivCheckInDateWithLabel,
} from "@/lib/check-ins/time"

export function TournamentsPanel({
  tournaments,
  fetchError,
  feedback,
}: {
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t, lang } = useLanguage()

  return (
    <AdminSection
      id="tournaments"
      title={lang === "uk" ? "Турніри" : "Tournaments"}
      description={lang === "uk" ? "Створення, редагування та видалення турнірів у Supabase." : "Create, update, and remove tournaments stored in Supabase."}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="tournaments"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{lang === "uk" ? "Створити турнір" : "Create tournament"}</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {lang === "uk" ? "Додає новий рядок турніру в таблицю tournaments." : "Adds a real tournament row to public.tournaments."}
          </p>

          <TournamentForm action={createTournament} submitLabel={lang === "uk" ? "Створити турнір" : "Create tournament"} lang={lang} />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{lang === "uk" ? "Існуючі турніри" : "Existing tournaments"}</h3>

          {tournaments.length === 0 ? (
            <AdminEmptyState>{t.admin.emptyState.tournaments}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {tournaments.map((tournament) => (
                <TournamentRecord key={tournament.id} tournament={tournament} lang={lang} />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function TournamentRecord({ tournament, lang }: { tournament: AdminTournament; lang: string }) {
  const { t } = useLanguage()

  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{tournament.name ?? (lang === "uk" ? "Турнір без назви" : "Untitled tournament")}</h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {tournament.game ?? "Unknown game"} {"\u2022"} {formatDisplayDate(tournament.event_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/65">
              {formatStatus(tournament.status)}
            </span>
            {tournament.is_active && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
                {lang === "uk" ? "Активний" : "Active"}
              </span>
            )}
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <dl className="grid gap-3 text-sm text-white/55 sm:grid-cols-2">
          <div>
            <dt className="text-white/35">{lang === "uk" ? "Створено" : "Created"}</dt>
            <dd className="mt-1">{formatDisplayDateTime(tournament.created_at)}</dd>
          </div>
          <div>
            <dt className="text-white/35">{lang === "uk" ? "Слоти учасників" : "Participant slots"}</dt>
            <dd className="mt-1">{tournament.team_count ?? "???"}</dd>
          </div>
          <div>
            <dt className="text-white/35">{lang === "uk" ? "Тип учасників" : "Participant type"}</dt>
            <dd className="mt-1">{formatParticipantType(tournament.participant_type, lang)}</dd>
          </div>
          <div>
            <dt className="text-white/35">{lang === "uk" ? "Дні матчів" : "Match days"}</dt>
            <dd className="mt-1">{tournament.match_days ?? "???"}</dd>
          </div>
          <div>
            <dt className="text-white/35">{lang === "uk" ? "Чек-ін відкривається" : "Check-in opens"}</dt>
            <dd className="mt-1">{formatKyivDateTime(tournament.check_in_opens_at)}</dd>
          </div>
          <div>
            <dt className="text-white/35">{lang === "uk" ? "Чек-ін закривається" : "Check-in closes"}</dt>
            <dd className="mt-1">{formatKyivDateTime(tournament.check_in_closes_at)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TournamentForm
            action={updateTournament}
            submitLabel={lang === "uk" ? "Зберегти зміни" : "Save changes"}
            tournament={tournament}
            lang={lang}
          />
          <div className="p-3 rounded-xl border border-red-500/10 bg-red-950/5 self-start">
            <p className="text-[10px] text-red-400 font-semibold mb-2 max-w-[160px] leading-relaxed">
              {t.admin.dangerousAction}
            </p>
            <DeleteForm action={deleteTournament} id={tournament.id} />
          </div>
        </div>
      </div>
    </details>
  )
}

function TournamentForm({
  action,
  submitLabel,
  tournament,
  lang,
}: {
  action: AdminFormAction
  submitLabel: string
  tournament?: AdminTournament
  lang: string
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {tournament && <input type="hidden" name="id" value={tournament.id} />}

      <AdminField label={lang === "uk" ? "Назва" : "Name"}>
        <input name="name" defaultValue={tournament?.name ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Гра" : "Game"}>
        <input name="game" defaultValue={tournament?.game ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Дата проведення" : "Event date"}>
        <input name="event_date" type="date" defaultValue={tournament?.event_date ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Формат" : "Format"}>
        <input name="format" defaultValue={tournament?.format ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Тип учасників" : "Participant type"}>
        <select
          name="participant_type"
          defaultValue={tournament?.participant_type ?? "player"}
          className={inputClassName}
        >
          <option value="player">{lang === "uk" ? "Індивідуальний турнір" : "Player tournament"}</option>
          <option value="team">{lang === "uk" ? "Командний турнір" : "Team tournament"}</option>
        </select>
      </AdminField>

      <AdminField label={lang === "uk" ? "Слоти учасників" : "Participant slots"}>
        <input name="team_count" type="number" min={1} step={1} defaultValue={tournament?.team_count ?? ""} required className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Дні матчів" : "Match days"}>
        <input name="match_days" type="number" min={1} step={1} defaultValue={tournament?.match_days ?? 1} required className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Призовий фонд" : "Prize pool"}>
        <input name="prize_pool" defaultValue={tournament?.prize_pool ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Чек-ін відкривається (Київський час)" : "Check-in opens (Kyiv Time)"}>
        <input
          name="check_in_opens_at"
          type="datetime-local"
          defaultValue={formatKyivDateTimeInput(tournament?.check_in_opens_at)}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label={lang === "uk" ? "Чек-ін закривається (Київський час)" : "Check-in closes (Kyiv Time)"}>
        <input
          name="check_in_closes_at"
          type="datetime-local"
          defaultValue={formatKyivDateTimeInput(tournament?.check_in_closes_at)}
          className={inputClassName}
        />
      </AdminField>

      <StatusSelect value={tournament?.status} />

      <AdminField label={lang === "uk" ? "Назва арени" : "Arena title"}>
        <input name="arena_title" defaultValue={tournament?.arena_title ?? ""} className={inputClassName} />
      </AdminField>

      <AdminField label={lang === "uk" ? "Теги арени" : "Arena tags"}>
        <input name="arena_tags" defaultValue={tournament?.arena_tags?.join(", ") ?? ""} placeholder="PC Platform, 5v5 Format" className={inputClassName} />
      </AdminField>

      <div className="sm:col-span-2">
        <AdminField label={lang === "uk" ? "Опис арени" : "Arena description"}>
          <textarea name="arena_description" defaultValue={tournament?.arena_description ?? ""} rows={4} className={inputClassName} />
        </AdminField>
      </div>

      <div className="sm:col-span-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm font-medium text-white/80">{lang === "uk" ? "Кінематографічні мітки сітки" : "Cinematic bracket labels"}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <AdminField label={lang === "uk" ? "Назва сітки" : "Bracket title"}>
              <input name="bracket_title" defaultValue={tournament?.bracket_title ?? ""} placeholder="Live Bracket" className={inputClassName} />
            </AdminField>

            <AdminField label={lang === "uk" ? "Підзаголовок сітки" : "Bracket subtitle"}>
              <input name="bracket_subtitle" defaultValue={tournament?.bracket_subtitle ?? ""} placeholder="Tournament Tree" className={inputClassName} />
            </AdminField>

            <AdminField label={lang === "uk" ? "Мітка етапу" : "Stage label"}>
              <input name="bracket_stage_label" defaultValue={tournament?.bracket_stage_label ?? ""} placeholder="Grand Final" className={inputClassName} />
            </AdminField>

            <AdminField label={lang === "uk" ? "Мітка учасника" : "Participant label"}>
              <input name="bracket_participant_label" defaultValue={tournament?.bracket_participant_label ?? ""} placeholder="Finalist" className={inputClassName} />
            </AdminField>

            <div className="sm:col-span-2">
              <AdminField label={lang === "uk" ? "Мітка арени" : "Arena label"}>
                <input name="bracket_arena_label" defaultValue={tournament?.bracket_arena_label ?? ""} placeholder="Eclyps Arena" className={inputClassName} />
              </AdminField>
            </div>
          </div>
        </div>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  )
}

function formatParticipantType(type: AdminTournament["participant_type"], lang: string) {
  return type === "team"
    ? (lang === "uk" ? "Командний турнір" : "Team tournament")
    : (lang === "uk" ? "Індивідуальний турнір" : "Player tournament")
}

function formatKyivDateTime(value: string | null) {
  return value ? formatKyivCheckInDateWithLabel(value) : "???"
}
