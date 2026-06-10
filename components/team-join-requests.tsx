"use client"

import { Check, Clock, Inbox, UserPlus, X } from "lucide-react"
import {
  approveTeamJoinRequest,
  cancelTeamJoinRequest,
  createTeamJoinRequest,
  rejectTeamJoinRequest,
} from "@/app/actions/team-join-requests"
import { useLanguage } from "@/components/language-provider"
import { withAvatarCacheBust } from "@/lib/avatar"

export type CurrentJoinRequest = {
  id: string
  status: string
  created_at: string | null
} | null

export type PendingJoinRequest = {
  id: string
  requester_player_id: string
  display_name: string
  avatar_url: string | null
  discord_username: string | null
  region: string | null
  message: string | null
  created_at: string | null
}

type TeamJoinRequestCardProps = {
  teamId: string
  isLoggedIn: boolean
  currentPlayerStatus: string | null
  isAlreadyMember: boolean
  teamStatus: string
  currentRequest: CurrentJoinRequest
  rejectedRequest?: CurrentJoinRequest
  initialError?: string | null
  initialSuccess?: string | null
}

export function TeamJoinRequestCard({
  teamId,
  isLoggedIn,
  currentPlayerStatus,
  isAlreadyMember,
  teamStatus,
  currentRequest,
  rejectedRequest = null,
  initialError,
  initialSuccess,
}: TeamJoinRequestCardProps) {
  const { t } = useLanguage()
  const copy = t.account.joinRequests
  const pendingRequest = currentRequest?.status === "pending" ? currentRequest : null
  const errorMessages: Record<string, string> = {
    "login-required": copy.errors.loginRequired,
    "player-not-approved": copy.errors.playerNotApproved,
    "already-in-team": copy.errors.alreadyInTeam,
    "request-already-pending": copy.errors.requestAlreadyPending,
    "team-not-approved": copy.errors.teamNotApproved,
    "permission-denied": copy.errors.permissionDenied,
    "invalid-request": copy.errors.invalidRequest,
    "roster-locked": copy.errors.rosterLocked,
    "mutation-failed": copy.errors.mutationFailed,
    "admin-client-unavailable": copy.errors.mutationFailed,
  }
  const successMessages: Record<string, string> = {
    sent: copy.success.sent,
    approved: copy.success.approved,
    rejected: copy.success.rejected,
    cancelled: copy.success.cancelled,
  }
  const feedback = initialError
    ? errorMessages[initialError] ?? copy.errors.mutationFailed
    : initialSuccess
      ? successMessages[initialSuccess] ?? copy.success.sent
      : null

  return (
    <section className="mt-6 rounded-2xl border border-emerald-400/20 bg-white/[0.025] p-5 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">
            {copy.publicLabel}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{copy.requestToJoin}</h3>
          <p className="mt-1 text-xs text-white/55">{copy.publicDescription}</p>
        </div>

        <div className="shrink-0">
          {!isLoggedIn ? (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/55">
              {copy.loginRequired}
            </span>
          ) : currentPlayerStatus !== "approved" ? (
            <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
              {copy.playerApprovalRequired}
            </span>
          ) : isAlreadyMember ? (
            <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">
              {copy.alreadyInTeam}
            </span>
          ) : teamStatus !== "approved" ? (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/50">
              {copy.teamNotApproved}
            </span>
          ) : pendingRequest ? (
            <form action={cancelTeamJoinRequest} className="flex flex-wrap items-center justify-end gap-2">
              <input type="hidden" name="request_id" value={pendingRequest.id} />
              <input type="hidden" name="team_id" value={teamId} />
              <input type="hidden" name="redirect_to" value={`/teams/${teamId}`} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">
                <Clock className="h-3.5 w-3.5" />
                {copy.alreadyRequested}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
              >
                <X className="h-3.5 w-3.5" />
                {copy.cancelRequest}
              </button>
            </form>
          ) : rejectedRequest ? (
            <form action={createTeamJoinRequest} className="flex flex-wrap items-center justify-end gap-2">
              <input type="hidden" name="team_id" value={teamId} />
              <span className="inline-flex rounded-full border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
                {copy.requestRejected}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-emerald-300"
              >
                <UserPlus className="h-4 w-4" />
                {copy.requestAgain}
              </button>
            </form>
          ) : (
            <form action={createTeamJoinRequest}>
              <input type="hidden" name="team_id" value={teamId} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-emerald-300"
              >
                <UserPlus className="h-4 w-4" />
                {copy.requestToJoin}
              </button>
            </form>
          )}
        </div>
      </div>

      {!pendingRequest && rejectedRequest && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/25 px-4 py-2.5 text-xs text-red-100/85">
          {copy.requestRejectedDescription}
        </div>
      )}

      {feedback && (
        <div className={`mt-4 rounded-xl border px-4 py-2.5 text-xs ${
          initialError
            ? "border-red-500/25 bg-red-950/40 text-red-200"
            : "border-emerald-500/25 bg-emerald-950/40 text-emerald-200"
        }`}>
          {feedback}
        </div>
      )}
    </section>
  )
}

export function TeamJoinRequestsPanel({
  teamId,
  pendingRequests,
}: {
  teamId: string
  pendingRequests: PendingJoinRequest[]
}) {
  const { t, lang } = useLanguage()
  const copy = t.account.joinRequests

  return (
    <div className="mt-8 border-t border-white/5 pt-6">
      <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/55">
        {copy.joinRequests}
      </h4>
      {pendingRequests.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-white/45">
          <Inbox className="h-4 w-4 text-white/25" />
          {copy.noPendingJoinRequests}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {pendingRequests.map((request) => {
            const avatarUrl = withAvatarCacheBust(request.avatar_url, null)

            return (
            <div
              key={request.id}
              className="rounded-xl border border-white/5 bg-black/20 p-3.5 transition hover:border-white/10"
            >
              <div className="flex items-start gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[10px] font-bold text-white/45">
                    {request.display_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h5 className="truncate text-xs font-bold text-white">{request.display_name}</h5>
                  <p className="mt-1 truncate text-[10px] font-medium text-white/45">
                    {request.discord_username ? `@${request.discord_username}` : copy.noDiscord}
                    {request.region ? ` | ${request.region}` : ""}
                  </p>
                  {request.message && (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-white/55">{request.message}</p>
                  )}
                  {request.created_at && (
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">
                      {formatDate(request.created_at, lang)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                <form action={approveTeamJoinRequest}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="team_id" value={teamId} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-300"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {copy.approve}
                  </button>
                </form>
                <form action={rejectTeamJoinRequest}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="team_id" value={teamId} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    {copy.reject}
                  </button>
                </form>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(date: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}
