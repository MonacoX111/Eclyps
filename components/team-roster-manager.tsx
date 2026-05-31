"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { addTeamMember, removeTeamMember, updateTeamMemberRole } from "@/app/actions/teams"
import { useLanguage } from "@/components/language-provider"

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none transition focus:border-emerald-500/60"

type RosterMember = {
  player_id: string
  role: "captain" | "member"
  display_name: string
  avatar_url: string | null
}

type TeamRosterManagerProps = {
  teamId: string
  isManager: boolean
  members: RosterMember[]
  ownerPlayerId: string | null
  initialError?: string | null
  initialSuccess?: string | null
}

export function TeamRosterManager({
  teamId,
  isManager,
  members,
  ownerPlayerId,
  initialError,
  initialSuccess,
}: TeamRosterManagerProps) {
  const { t, lang } = useLanguage()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialError) {
      const messages: Record<string, string> = {
        "invalid-player-name": t.account.roster.errors.invalidPlayerName,
        "permission-denied": t.account.roster.errors.permissionDenied,
        "player-not-found": t.account.roster.errors.playerNotFound,
        "player-not-approved": t.account.roster.errors.playerNotApproved,
        "duplicate-member": t.account.roster.errors.duplicateMember,
        "remove-owner-blocked": t.account.roster.errors.removeOwnerBlocked,
        "owner-downgrade-blocked": t.account.roster.errors.ownerDowngradeBlocked,
        "last-captain-blocked": t.account.roster.errors.lastCaptainBlocked,
        "mutation-failed": t.account.roster.errors.mutationFailed,
        "admin-client-unavailable": t.account.roster.errors.unavailable,
      }
      setErrorMessage(messages[initialError] ?? t.account.roster.errors.mutationFailed)
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }

    if (initialSuccess) {
      const messages: Record<string, string> = {
        "added": t.account.roster.success.added,
        "removed": t.account.roster.success.removed,
        "role-updated": t.account.roster.success.roleUpdated,
      }
      setSuccessMessage(messages[initialSuccess] ?? (lang === "uk" ? "Склад успішно оновлено." : "Roster successfully updated."))
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [initialError, initialSuccess, lang, t])

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-white/[0.025] p-5 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">
            {t.account.roster.managementLabel}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{t.account.roster.title}</h3>
          <p className="mt-1 text-xs text-white/55">
            {isManager
              ? t.account.roster.descManager
              : t.account.roster.descViewer}
          </p>
        </div>

        {/* Form to Invite Member (Manager-only) */}
        {isManager && (
          <form action={addTeamMember} className="flex gap-2 w-full max-w-sm" onSubmit={() => setErrorMessage(null)}>
            <input type="hidden" name="team_id" value={teamId} />
            <input
              name="player_identifier"
              required
              placeholder={t.account.roster.invitePlaceholder}
              className={inputClassName}
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-300 cursor-pointer whitespace-nowrap shadow-md shadow-emerald-950/20"
            >
              {t.account.roster.addButton}
            </button>
          </form>
        )}
      </div>

      {/* Alert Feedbacks */}
      {successMessage && (
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200">
          ✓ {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-2.5 text-xs text-red-200">
          ✗ {errorMessage}
        </div>
      )}

      {/* Roster members list */}
      {members.length === 0 ? (
        <p className="mt-6 text-center text-xs text-white/45 py-6 font-medium">
          {t.account.roster.noPlayers}
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {members.map((member) => {
            const isOwner = member.player_id === ownerPlayerId
            const isCaptain = member.role === "captain"

            return (
              <div
                key={member.player_id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3.5 transition hover:border-white/10"
              >
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/45">
                      {(member.display_name || "Player").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-xs text-white flex flex-wrap items-center gap-1.5">
                      {member.display_name}
                      {isOwner && (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-extrabold text-emerald-300 uppercase tracking-wider">
                          {t.profile.meta.owner}
                        </span>
                      )}
                      {isCaptain && (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-300 uppercase tracking-wider">
                          {t.profile.meta.captain}
                        </span>
                      )}
                      {!isCaptain && !isOwner && (
                        <span className="rounded-full bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-extrabold text-white/60 uppercase tracking-wider">
                          {t.profile.meta.member}
                        </span>
                      )}
                    </h4>
                  </div>
                </div>

                {/* Roster Controls (Manager-only, and disabled/filtered appropriately for owner safety) */}
                {isManager && (
                  <div className="flex items-center gap-2">
                    <form action={updateTeamMemberRole} className="inline">
                      <input type="hidden" name="team_id" value={teamId} />
                      <input type="hidden" name="player_id" value={member.player_id} />
                      {isCaptain ? (
                        !isOwner && (
                          <button
                            type="submit"
                            name="role"
                            value="member"
                            className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/5 cursor-pointer transition"
                            title={t.account.roster.tooltipDemote}
                          >
                            {t.account.roster.demoteButton}
                          </button>
                        )
                      ) : (
                        <button
                          type="submit"
                          name="role"
                          value="captain"
                          className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/10 cursor-pointer transition"
                          title={t.account.roster.tooltipPromote}
                        >
                          {t.account.roster.promoteButton}
                        </button>
                      )}
                    </form>

                    {!isOwner && (
                      <form action={removeTeamMember} className="inline">
                        <input type="hidden" name="team_id" value={teamId} />
                        <input type="hidden" name="player_id" value={member.player_id} />
                        <button
                          type="submit"
                          className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/10 cursor-pointer transition"
                          title={t.account.roster.tooltipRemove}
                        >
                          {t.account.roster.removeButton}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  );
}
