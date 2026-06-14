"use client"

import Image from "next/image"
import { reviewDispute } from "@/app/admin/actions"
import type { AdminDispute } from "@/lib/admin/disputes"
import type { AdminFeedback } from "@/lib/admin/types"
import { formatDisplayDateTime } from "@/lib/admin/formatters"
import {
  AdminEmptyState,
  AdminSection,
  innerPanelClassName,
  pillClassName,
  recordClassName,
} from "@/components/admin/admin-section"
import { inputClassName } from "@/components/admin/admin-form-fields"
import { useLanguage } from "@/components/language-provider"

export function DisputesPanel({
  disputes,
  fetchError,
  feedback,
}: {
  disputes: AdminDispute[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t, lang } = useLanguage()
  const activeDisputes = disputes.filter(
    (dispute) => dispute.status === "open" || dispute.status === "under_review",
  )
  const openDisputes = disputes.filter((dispute) => dispute.status === "open")
  const underReviewDisputes = disputes.filter((dispute) => dispute.status === "under_review")
  const evidenceDisputes = activeDisputes.filter((dispute) => Boolean(dispute.evidence_url))
  const resolvedDisputes = disputes
    .filter((dispute) => dispute.status === "resolved" || dispute.status === "rejected")
    .slice(0, 8)

  return (
    <AdminSection
      id="disputes"
      title={t.admin.disputes.title}
      description={t.admin.disputes.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="disputes"
    >
      <DisputeQueueSummary
        lang={lang}
        total={disputes.length}
        active={activeDisputes.length}
        open={openDisputes.length}
        underReview={underReviewDisputes.length}
        withEvidence={evidenceDisputes.length}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.disputes.openDisputes}</h3>
          {activeDisputes.length === 0 ? (
            <AdminEmptyState>{t.admin.disputes.noOpen}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {activeDisputes.map((dispute) => (
                <DisputeRecord key={dispute.id} dispute={dispute} showActions />
              ))}
            </div>
          )}
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.disputes.recentResolutions}</h3>
          {resolvedDisputes.length === 0 ? (
            <AdminEmptyState>{t.admin.disputes.noResolved}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {resolvedDisputes.map((dispute) => (
                <DisputeRecord key={dispute.id} dispute={dispute} />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function DisputeQueueSummary({
  lang,
  total,
  active,
  open,
  underReview,
  withEvidence,
}: {
  lang: string
  total: number
  active: number
  open: number
  underReview: number
  withEvidence: number
}) {
  const isUk = lang === "uk"
  const cards = [
    { id: "open", label: isUk ? "Нові" : "Open", value: open, tone: open > 0 ? "warning" : "neutral" },
    { id: "review", label: isUk ? "На розгляді" : "Under review", value: underReview, tone: underReview > 0 ? "warning" : "neutral" },
    { id: "evidence", label: isUk ? "З доказами" : "With evidence", value: withEvidence, tone: withEvidence > 0 ? "success" : "neutral" },
  ] as const

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300/75">
            {isUk ? "Черга disputes" : "Dispute queue"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {active > 0
              ? isUk ? "Розбери активні спори перед оновленням результатів" : "Review active disputes before updating results"
              : isUk ? "Активних спорів немає" : "No active disputes"}
          </h3>
          <p className="mt-1 text-sm text-white/55">
            {isUk
              ? `${active} активних із ${total} загалом. Спочатку перевір evidence link, потім став статус.`
              : `${active} active out of ${total} total. Check evidence first, then set status.`}
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
          {isUk ? "ручна модерація" : "manual review"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`rounded-xl border px-4 py-3 ${
              card.tone === "success"
                ? "border-emerald-300/25 bg-emerald-300/10"
                : card.tone === "warning"
                  ? "border-amber-300/25 bg-amber-300/10"
                  : "border-white/10 bg-black/20"
            }`}
          >
            <span className="block text-2xl font-black text-white">{card.value}</span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              {card.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DisputeRecord({
  dispute,
  showActions = false,
}: {
  dispute: AdminDispute
  showActions?: boolean
}) {
  const { t } = useLanguage()

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case "open": return t.admin.extra.disputeStatus.open
      case "under_review": return t.admin.extra.disputeStatus.underReview
      case "resolved": return t.admin.extra.disputeStatus.resolved
      case "rejected": return t.admin.extra.disputeStatus.rejected
      default: return status
    }
  }

  const getDisplayType = (type: string) => {
    switch (type) {
      case "score_conflict": return t.admin.extra.disputeTypes.scoreConflict
      case "cheating": return t.admin.extra.disputeTypes.cheating
      case "toxic_behavior": return t.admin.extra.disputeTypes.toxicBehavior
      case "no_show": return t.admin.extra.disputeTypes.noShow
      case "connection_issue": return t.admin.extra.disputeTypes.connectionIssue
      default: return type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
    }
  }

  return (
    <div className={recordClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="break-words font-medium">{dispute.title}</h4>
          <p className="mt-1 break-words text-sm text-white/55">
            {formatMatch(dispute)} {"\u2022"} {dispute.tournament?.name ?? t.admin.disputes.unknownTournament}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>{getDisplayType(dispute.dispute_type)}</span>
            <span className={pillClassName}>{getDisplayStatus(dispute.status)}</span>
            <span className={pillClassName}>{formatDisplayDateTime(dispute.created_at)}</span>
            {dispute.reporter_participant ? (
              <span className={pillClassName}>
                {t.admin.disputes.reporterParticipant}{dispute.reporter_participant.display_name}
              </span>
            ) : null}
          </div>
        </div>
        {dispute.reporter_profile ? (
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70">
            {dispute.reporter_profile.avatar_url ? (
              <Image
                src={dispute.reporter_profile.avatar_url}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : null}
            {t.admin.disputes.discordLabel}{dispute.reporter_profile.discord_username}
          </div>
        ) : null}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/70">
        {dispute.description}
      </p>

      {dispute.evidence_url ? (
        <a
          href={dispute.evidence_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-sm text-primary transition hover:text-primary/80"
        >
          {t.admin.disputes.evidenceLink}
        </a>
      ) : null}

      {dispute.admin_note ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {t.admin.disputes.adminNote}{dispute.admin_note}
        </div>
      ) : null}

      {showActions ? <DisputeReviewForm dispute={dispute} /> : null}
    </div>
  )
}

function DisputeReviewForm({ dispute }: { dispute: AdminDispute }) {
  const { t, lang } = useLanguage()
  const confirmMessage =
    lang === "uk"
      ? `Зберегти рішення по dispute "${dispute.title}"?`
      : `Save review decision for dispute "${dispute.title}"?`

  return (
    <form
      action={reviewDispute}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault()
      }}
      className="mt-4 grid gap-3 border-t border-white/10 pt-4"
    >
      <input type="hidden" name="id" value={dispute.id} />
      <label className="grid gap-2 text-sm text-white/70">
        <span>{t.admin.disputes.statusField}</span>
        <select name="status" defaultValue={dispute.status} className={inputClassName}>
          <option value="open">{t.admin.extra.disputeStatus.open}</option>
          <option value="under_review">{t.admin.extra.disputeStatus.underReview}</option>
          <option value="resolved">{t.admin.extra.disputeStatus.resolved}</option>
          <option value="rejected">{t.admin.extra.disputeStatus.rejected}</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm text-white/70">
        <span>{t.admin.disputes.adminNoteField}</span>
        <textarea name="admin_note" defaultValue={dispute.admin_note ?? ""} rows={3} className={inputClassName} />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-emerald-300 px-4 py-3 text-sm font-medium text-black transition hover:bg-emerald-200"
      >
        {t.admin.disputes.saveDispute}
      </button>
    </form>
  )
}

function formatMatch(dispute: AdminDispute) {
  const left = dispute.match?.team1 ?? "TBD"
  const right = dispute.match?.team2 ?? "TBD"
  return `${left} vs ${right}${dispute.match?.round ? `, ${dispute.match.round}` : ""}`
}
