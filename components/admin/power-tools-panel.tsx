"use client"

import { useMemo, useState } from "react"
import { FileUp, GitMerge, Megaphone, Palette, ShieldCheck, Wand2 } from "lucide-react"
import {
  autoGenerateBracket,
  bulkImportParticipants,
  quickPublishAnnouncement,
  updateBracketStatus,
  updateTournamentFrontendContent,
} from "@/app/admin/actions"
import type { AdminMatch } from "@/lib/admin/matches"
import type { AdminNewsPost } from "@/lib/admin/news"
import type { AdminParticipant } from "@/lib/admin/participants"
import type { AdminTournament } from "@/lib/admin/tournaments"
import type { AdminFeedback } from "@/lib/admin/types"
import { AdminEmptyState, AdminSection, innerPanelClassName, pillClassName } from "@/components/admin/admin-section"
import { AdminField, inputClassName, SubmitButton } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"

const formGridClassName =
  "mt-4 grid gap-x-4 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]"
const wideFieldClassName = "[grid-column:1/-1]"

export function PowerToolsPanel({
  tournaments,
  participants,
  matches,
  newsPosts,
  feedback,
}: {
  tournaments: AdminTournament[]
  participants: AdminParticipant[]
  matches: AdminMatch[]
  newsPosts: AdminNewsPost[]
  feedback: AdminFeedback | null
}) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"

  return (
    <AdminSection
      id="tools"
      title={isUk ? "Адмін-інструменти" : "Admin power tools"}
      description={
        isUk
          ? "Швидкі масові дії для підготовки турніру: імпорт учасників, контроль сітки та фронтенд-контент."
          : "Fast bulk actions for tournament prep: participant import, bracket controls, and frontend content."
      }
      feedback={feedback}
      fetchError={null}
      fetchLabel="tools"
    >
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <BulkImportCard tournaments={tournaments} participants={participants} matches={matches} />
        <BracketControlsCard tournaments={tournaments} participants={participants} matches={matches} />
        <ContentToolsCard tournaments={tournaments} newsPosts={newsPosts} />
      </div>
    </AdminSection>
  )
}

function BulkImportCard({
  tournaments,
  participants,
  matches,
}: {
  tournaments: AdminTournament[]
  participants: AdminParticipant[]
  matches: AdminMatch[]
}) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournaments[0]?.id ?? "")
  const selectedTournament = tournaments.find((tournament) => tournament.id === selectedTournamentId)
  const tournamentParticipants = participants.filter((participant) => participant.tournament_id === selectedTournamentId)
  const hasBracket = matches.some((match) => match.tournament_id === selectedTournamentId && match.bracket_id)
  const slotLimit = selectedTournament?.team_count ?? null

  return (
    <article className={innerPanelClassName}>
      <CardTitle
        icon={FileUp}
        title={isUk ? "Bulk import" : "Bulk import"}
        description={
          isUk
            ? "Додає багато учасників у турнір одним списком."
            : "Adds many participants to a tournament from one list."
        }
      />

      <StatusStrip
        items={[
          {
            label: isUk ? "Учасників" : "Participants",
            value: slotLimit ? `${tournamentParticipants.length}/${slotLimit}` : String(tournamentParticipants.length),
          },
          {
            label: isUk ? "Тип" : "Type",
            value: selectedTournament?.participant_type === "team" ? (isUk ? "Команди" : "Teams") : (isUk ? "Гравці" : "Players"),
          },
          {
            label: isUk ? "Сітка" : "Bracket",
            value: hasBracket ? (isUk ? "Є" : "Exists") : (isUk ? "Немає" : "None"),
            tone: hasBracket ? "warning" : "ok",
          },
        ]}
      />

      <form action={bulkImportParticipants} className={formGridClassName}>
        <AdminField label={isUk ? "Турнір" : "Tournament"}>
          <select
            name="tournament_id"
            value={selectedTournamentId}
            onChange={(event) => setSelectedTournamentId(event.target.value)}
            required
            className={inputClassName}
          >
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name ?? (isUk ? "Без назви" : "Untitled")}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label={isUk ? "Формат рядка" : "Row format"}>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-xs leading-5 text-white/55">
            name, seed, region, image_url
          </div>
        </AdminField>
        <AdminField label={isUk ? "Список" : "List"}>
          <textarea
            name="participants"
            rows={9}
            required
            placeholder={"Monaco, 1, UA, https://...\nPlayer Two, 2, PL"}
            className={`${inputClassName} min-h-44 resize-y leading-6`}
          />
        </AdminField>
        <div className={`${wideFieldClassName} rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100/85`}>
          {isUk
            ? "Імпорт заблоковано, якщо сітку вже згенеровано. Це захищає матчі, seed і bracket-ланцюг."
            : "Import is blocked after bracket generation to protect matches, seeding, and bracket links."}
        </div>
        <SubmitButton
          label={isUk ? "Імпортувати учасників" : "Import participants"}
          disabled={!selectedTournamentId || hasBracket}
        />
      </form>
    </article>
  )
}

function BracketControlsCard({
  tournaments,
  participants,
  matches,
}: {
  tournaments: AdminTournament[]
  participants: AdminParticipant[]
  matches: AdminMatch[]
}) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournaments[0]?.id ?? "")
  const selectedTournament = tournaments.find((tournament) => tournament.id === selectedTournamentId)
  const selectedMatches = matches.filter((match) => match.tournament_id === selectedTournamentId && match.bracket_id)
  const selectedParticipants = participants.filter((participant) => participant.tournament_id === selectedTournamentId)
  const bracketGroups = useMemo(() => groupBracketMatches(selectedMatches), [selectedMatches])
  const hasBracket = bracketGroups.length > 0
  const hasActiveMatch = selectedMatches.some((match) => match.status === "live" || match.status === "finished")

  return (
    <article className={innerPanelClassName}>
      <CardTitle
        icon={GitMerge}
        title={isUk ? "Bracket controls" : "Bracket controls"}
        description={
          isUk
            ? "Швидка генерація та lifecycle-контроль сітки."
            : "Quick generation and lifecycle control for brackets."
        }
      />

      <StatusStrip
        items={[
          { label: isUk ? "Учасників" : "Participants", value: String(selectedParticipants.length) },
          { label: isUk ? "Сіток" : "Brackets", value: String(bracketGroups.length) },
          {
            label: isUk ? "Матчі" : "Matches",
            value: hasActiveMatch ? (isUk ? "Активні" : "Active") : (isUk ? "Редагуються" : "Editable"),
            tone: hasActiveMatch ? "warning" : "ok",
          },
        ]}
      />

      <div className={formGridClassName}>
        <AdminField label={isUk ? "Турнір" : "Tournament"}>
          <select
            value={selectedTournamentId}
            onChange={(event) => setSelectedTournamentId(event.target.value)}
            className={inputClassName}
          >
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name ?? (isUk ? "Без назви" : "Untitled")}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label={isUk ? "Формат" : "Format"}>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-xs leading-5 text-white/55">
            {selectedTournament?.tournament_format ?? "single_elimination"}
          </div>
        </AdminField>
      </div>

      <form action={autoGenerateBracket} className={formGridClassName}>
        <input type="hidden" name="tournament_id" value={selectedTournamentId} />
        <AdminField label={isUk ? "Посів" : "Seeding"}>
          <select name="seed_method" defaultValue="rating" className={inputClassName}>
            <option value="rating">{isUk ? "За seed" : "By seed"}</option>
            <option value="random">{isUk ? "Випадково" : "Random"}</option>
          </select>
        </AdminField>
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/65">
          <input name="confirm_regenerate" type="checkbox" value="true" className="h-4 w-4 accent-emerald-300" />
          <span>{isUk ? "Перегенерувати існуючу сітку" : "Regenerate existing bracket"}</span>
        </label>
        <SubmitButton
          label={isUk ? "Авто-згенерувати сітку" : "Auto-generate bracket"}
          disabled={!selectedTournamentId || selectedParticipants.length < 2 || hasActiveMatch}
        />
      </form>

      <div className="mt-4 space-y-3">
        {hasBracket ? (
          bracketGroups.map((bracket) => (
            <div key={bracket.bracketId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {isUk ? "Сітка" : "Bracket"} #{bracket.shortId}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {bracket.matchCount} {isUk ? "матчів" : "matches"} · {bracket.status}
                  </p>
                </div>
                <span className={pillClassName}>{bracket.status}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <BracketStatusForm
                  bracketId={bracket.bracketId}
                  tournamentId={selectedTournamentId}
                  actionType="lock"
                  label={isUk ? "Lock" : "Lock"}
                  disabled={bracket.status !== "template"}
                />
                <BracketStatusForm
                  bracketId={bracket.bracketId}
                  tournamentId={selectedTournamentId}
                  actionType="unlock"
                  label={isUk ? "Unlock" : "Unlock"}
                  disabled={bracket.status !== "locked"}
                />
              </div>
            </div>
          ))
        ) : (
          <AdminEmptyState>
            {isUk ? "Для цього турніру ще немає згенерованої сітки." : "This tournament does not have a generated bracket yet."}
          </AdminEmptyState>
        )}
      </div>

      <a
        href="/admin?tab=bracket#bracket"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-emerald-300/40 hover:text-white"
      >
        <Wand2 className="h-4 w-4 text-emerald-300" />
        {isUk ? "Відкрити повний bracket editor" : "Open full bracket editor"}
      </a>
    </article>
  )
}

function ContentToolsCard({
  tournaments,
  newsPosts,
}: {
  tournaments: AdminTournament[]
  newsPosts: AdminNewsPost[]
}) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournaments[0]?.id ?? "")
  const selectedTournament = tournaments.find((tournament) => tournament.id === selectedTournamentId)
  const publishedPosts = newsPosts.filter((post) => post.status === "published").length
  const draftPosts = newsPosts.filter((post) => post.status === "draft").length

  return (
    <article className={innerPanelClassName}>
      <CardTitle
        icon={Palette}
        title={isUk ? "Content management" : "Content management"}
        description={
          isUk
            ? "Швидко оновлює банер, тексти турніру та публікує анонси."
            : "Quickly updates banner, tournament copy, and announcements."
        }
      />

      <StatusStrip
        items={[
          { label: isUk ? "Published" : "Published", value: String(publishedPosts), tone: "ok" },
          { label: isUk ? "Drafts" : "Drafts", value: String(draftPosts) },
          { label: isUk ? "Турнірів" : "Tournaments", value: String(tournaments.length) },
        ]}
      />

      <form key={selectedTournamentId} action={updateTournamentFrontendContent} className={formGridClassName}>
        <AdminField label={isUk ? "Турнір" : "Tournament"}>
          <select
            name="tournament_id"
            value={selectedTournamentId}
            onChange={(event) => setSelectedTournamentId(event.target.value)}
            required
            className={inputClassName}
          >
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name ?? (isUk ? "Без назви" : "Untitled")}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label={isUk ? "Banner URL" : "Banner URL"}>
          <input name="banner_url" type="url" defaultValue={selectedTournament?.banner_url ?? ""} placeholder="https://" className={inputClassName} />
        </AdminField>
        <AdminField label={isUk ? "Arena title" : "Arena title"}>
          <input name="arena_title" defaultValue={selectedTournament?.arena_title ?? ""} className={inputClassName} />
        </AdminField>
        <AdminField label={isUk ? "Bracket title" : "Bracket title"}>
          <input name="bracket_title" defaultValue={selectedTournament?.bracket_title ?? ""} className={inputClassName} />
        </AdminField>
        <AdminField label={isUk ? "Arena description" : "Arena description"}>
          <textarea name="arena_description" rows={4} defaultValue={selectedTournament?.arena_description ?? ""} className={`${inputClassName} resize-y leading-6`} />
        </AdminField>
        <AdminField label={isUk ? "Bracket subtitle" : "Bracket subtitle"}>
          <textarea name="bracket_subtitle" rows={4} defaultValue={selectedTournament?.bracket_subtitle ?? ""} className={`${inputClassName} resize-y leading-6`} />
        </AdminField>
        <AdminField label={isUk ? "Stage label" : "Stage label"}>
          <input name="bracket_stage_label" defaultValue={selectedTournament?.bracket_stage_label ?? ""} className={inputClassName} />
        </AdminField>
        <AdminField label={isUk ? "Participant label" : "Participant label"}>
          <input name="bracket_participant_label" defaultValue={selectedTournament?.bracket_participant_label ?? ""} className={inputClassName} />
        </AdminField>
        <AdminField label={isUk ? "Arena label" : "Arena label"}>
          <input name="bracket_arena_label" defaultValue={selectedTournament?.bracket_arena_label ?? ""} className={inputClassName} />
        </AdminField>
        <SubmitButton label={isUk ? "Оновити frontend" : "Update frontend"} disabled={!selectedTournamentId} />
      </form>

      <form action={quickPublishAnnouncement} className={`${formGridClassName} border-t border-white/10 pt-5`}>
        <div className={`${wideFieldClassName} flex items-center gap-2 text-sm font-semibold text-white`}>
          <Megaphone className="h-4 w-4 text-emerald-300" />
          {isUk ? "Швидкий анонс" : "Quick announcement"}
        </div>
        <AdminField label={isUk ? "Назва" : "Title"}>
          <input name="title" required className={inputClassName} />
        </AdminField>
        <AdminField label={isUk ? "Cover URL" : "Cover URL"}>
          <input name="cover_image_url" type="url" placeholder="https://" className={inputClassName} />
        </AdminField>
        <AdminField label={isUk ? "Excerpt" : "Excerpt"}>
          <textarea name="excerpt" rows={3} className={`${inputClassName} resize-y leading-6`} />
        </AdminField>
        <AdminField label={isUk ? "Текст" : "Content"}>
          <textarea name="content" rows={5} required className={`${inputClassName} resize-y leading-6`} />
        </AdminField>
        <SubmitButton label={isUk ? "Опублікувати анонс" : "Publish announcement"} />
      </form>
    </article>
  )
}

function CardTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileUp
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10">
        <Icon className="h-5 w-5 text-emerald-300" />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-white/55">{description}</p>
      </div>
    </div>
  )
}

function StatusStrip({
  items,
}: {
  items: { label: string; value: string; tone?: "ok" | "warning" }[]
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{item.label}</p>
          <p
            className={`mt-1 text-sm font-semibold ${
              item.tone === "ok"
                ? "text-emerald-300"
                : item.tone === "warning"
                  ? "text-amber-200"
                  : "text-white/80"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function BracketStatusForm({
  bracketId,
  tournamentId,
  actionType,
  label,
  disabled,
}: {
  bracketId: string
  tournamentId: string
  actionType: "lock" | "unlock"
  label: string
  disabled: boolean
}) {
  return (
    <form action={updateBracketStatus}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="bracket_id" value={bracketId} />
      <input type="hidden" name="action" value={actionType} />
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white/75 transition hover:border-emerald-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ShieldCheck className="h-4 w-4 text-emerald-300" />
        {label}
      </button>
    </form>
  )
}

function groupBracketMatches(matches: AdminMatch[]) {
  const map = new Map<string, AdminMatch[]>()

  matches.forEach((match) => {
    if (!match.bracket_id) return
    map.set(match.bracket_id, [...(map.get(match.bracket_id) ?? []), match])
  })

  return Array.from(map.entries()).map(([bracketId, bracketMatches]) => ({
    bracketId,
    shortId: bracketId.slice(0, 6),
    matchCount: bracketMatches.length,
    status: resolveBracketStatus(bracketMatches),
  }))
}

function resolveBracketStatus(matches: AdminMatch[]) {
  if (matches.length > 0 && matches.every((match) => match.status === "finished")) return "finished"
  if (matches.some((match) => match.status === "live" || match.status === "finished")) return "active"
  if (matches.some((match) => match.bracket_status === "locked")) return "locked"

  return "template"
}
