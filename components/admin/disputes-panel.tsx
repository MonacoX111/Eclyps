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

export function DisputesPanel({
  disputes,
  fetchError,
  feedback,
}: {
  disputes: AdminDispute[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const activeDisputes = disputes.filter(
    (dispute) => dispute.status === "open" || dispute.status === "under_review",
  )
  const resolvedDisputes = disputes
    .filter((dispute) => dispute.status === "resolved" || dispute.status === "rejected")
    .slice(0, 8)

  return (
    <AdminSection
      id="disputes"
      title="Disputes"
      description="Review player and captain reports without changing match results automatically."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="disputes"
    >
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Open disputes</h3>
          {activeDisputes.length === 0 ? (
            <AdminEmptyState>No open disputes.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {activeDisputes.map((dispute) => (
                <DisputeRecord key={dispute.id} dispute={dispute} showActions />
              ))}
            </div>
          )}
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Recent resolutions</h3>
          {resolvedDisputes.length === 0 ? (
            <AdminEmptyState>No resolved disputes yet.</AdminEmptyState>
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

function DisputeRecord({
  dispute,
  showActions = false,
}: {
  dispute: AdminDispute
  showActions?: boolean
}) {
  return (
    <div className={recordClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="break-words font-medium">{dispute.title}</h4>
          <p className="mt-1 break-words text-sm text-white/55">
            {formatMatch(dispute)} {"\u2022"} {dispute.tournament?.name ?? "Unknown tournament"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>{formatDisputeType(dispute.dispute_type)}</span>
            <span className={pillClassName}>{formatStatus(dispute.status)}</span>
            <span className={pillClassName}>{formatDisplayDateTime(dispute.created_at)}</span>
            {dispute.reporter_participant ? (
              <span className={pillClassName}>
                Reporter participant: {dispute.reporter_participant.display_name}
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
            Discord: {dispute.reporter_profile.discord_username}
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
          Evidence link
        </a>
      ) : null}

      {dispute.admin_note ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          Admin note: {dispute.admin_note}
        </div>
      ) : null}

      {showActions ? <DisputeReviewForm dispute={dispute} /> : null}
    </div>
  )
}

function DisputeReviewForm({ dispute }: { dispute: AdminDispute }) {
  return (
    <form action={reviewDispute} className="mt-4 grid gap-3 border-t border-white/10 pt-4">
      <input type="hidden" name="id" value={dispute.id} />
      <label className="grid gap-2 text-sm text-white/70">
        <span>Status</span>
        <select name="status" defaultValue={dispute.status} className={inputClassName}>
          <option value="open">Open</option>
          <option value="under_review">Under review</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm text-white/70">
        <span>Admin note</span>
        <textarea name="admin_note" defaultValue={dispute.admin_note ?? ""} rows={3} className={inputClassName} />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-emerald-300 px-4 py-3 text-sm font-medium text-black transition hover:bg-emerald-200"
      >
        Save dispute
      </button>
    </form>
  )
}

function formatMatch(dispute: AdminDispute) {
  const left = dispute.match?.team1 ?? "TBD"
  const right = dispute.match?.team2 ?? "TBD"
  return `${left} vs ${right}${dispute.match?.round ? `, ${dispute.match.round}` : ""}`
}

function formatStatus(status: AdminDispute["status"]) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDisputeType(type: string) {
  return type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}
