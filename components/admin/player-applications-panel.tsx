"use client"

import Image from "next/image"
import { reviewPlayerApplication } from "@/app/admin/actions"
import type { AdminPlayerApplication } from "@/lib/admin/player-applications"
import type { AdminFeedback } from "@/lib/admin/types"
import {
  AdminEmptyState,
  AdminSection,
  innerPanelClassName,
  pillClassName,
  recordClassName,
} from "@/components/admin/admin-section"
import { useLanguage } from "@/components/language-provider"

export function PlayerApplicationsPanel({
  applications,
  fetchError,
  feedback,
}: {
  applications: AdminPlayerApplication[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  const { t } = useLanguage()
  const pendingApplications = applications.filter(
    (application) => application.status === "pending",
  )
  const reviewedApplications = applications
    .filter((application) => application.status !== "pending")
    .slice(0, 8)

  return (
    <AdminSection
      id="player-applications"
      title={t.admin.applications.title}
      description={t.admin.applications.description}
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="player applications"
    >
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.applications.pendingApplications}</h3>
          {pendingApplications.length === 0 ? (
            <AdminEmptyState>{t.admin.applications.noPending}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {pendingApplications.map((application) => (
                <ApplicationRecord
                  key={application.id}
                  application={application}
                  showActions
                />
              ))}
            </div>
          )}
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">{t.admin.applications.recentDecisions}</h3>
          {reviewedApplications.length === 0 ? (
            <AdminEmptyState>{t.admin.applications.noReviewed}</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {reviewedApplications.map((application) => (
                <ApplicationRecord
                  key={application.id}
                  application={application}
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function ApplicationRecord({
  application,
  showActions = false,
}: {
  application: AdminPlayerApplication
  showActions?: boolean
}) {
  const { t, lang } = useLanguage()
  const status = application.status
  const displayStatus =
    status === "approved"
      ? (lang === "uk" ? "Схвалено" : "Approved")
      : status === "rejected"
      ? (lang === "uk" ? "Відхилено" : "Rejected")
      : (lang === "uk" ? "На розгляді" : "Pending")

  return (
    <div className={recordClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            {application.owner_profile?.avatar_url ? (
              <Image
                src={application.owner_profile.avatar_url}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-emerald-300/30 object-cover"
              />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-sm font-semibold text-emerald-200">
                {(application.owner_profile?.discord_username ?? "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h4 className="truncate font-medium">
                {application.requested_nickname}
              </h4>
              <p className="mt-1 truncate text-sm text-white/55">
                {application.owner_profile?.discord_username ?? t.admin.applications.unknownDiscord}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {application.requested_region ? (
              <span className={pillClassName}>{application.requested_region}</span>
            ) : null}
            {application.created_at ? (
              <span className={pillClassName}>
                {new Date(application.created_at).toLocaleDateString(lang === "uk" ? "uk-UA" : "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            ) : null}
          </div>
        </div>
        <span className={pillClassName}>{displayStatus}</span>
      </div>

      {showActions ? (
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
          <ApplicationDecisionForm
            id={application.id}
            status="approved"
            label={t.admin.applications.approvePlayer}
          />
          <ApplicationDecisionForm
            id={application.id}
            status="rejected"
            label={t.admin.applications.reject}
            danger
          />
        </div>
      ) : null}
    </div>
  )
}

function ApplicationDecisionForm({
  id,
  status,
  label,
  danger = false,
}: {
  id: string
  status: "approved" | "rejected"
  label: string
  danger?: boolean
}) {
  return (
    <form action={reviewPlayerApplication}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={
          danger
            ? "w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10"
            : "w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-medium text-black transition hover:bg-emerald-200"
        }
      >
        {label}
      </button>
    </form>
  )
}
