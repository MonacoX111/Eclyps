"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { addTeamMember, removeTeamMember, updateTeamMemberRole } from "@/app/actions/teams"

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialError) {
      const messages: Record<string, string> = {
        "invalid-player-name": "Please enter a valid player name.",
        "permission-denied": "You do not have permission to manage this roster.",
        "player-not-found": "Player could not be found. Verify spelling or nickname.",
        "player-not-approved": "This player profile is not approved by admins yet.",
        "duplicate-member": "This player is already a member of your team.",
        "remove-owner-blocked": "The team owner cannot be removed from the team.",
        "owner-downgrade-blocked": "The team owner's role cannot be downgraded.",
        "last-captain-blocked": "You cannot demote or remove the last captain of the team.",
        "mutation-failed": "Failed to update roster. Please try again.",
        "admin-client-unavailable": "Database service is temporarily unavailable.",
      }
      setErrorMessage(messages[initialError] ?? "Failed to update roster.")
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }

    if (initialSuccess) {
      const messages: Record<string, string> = {
        "added": "Player successfully added to the roster!",
        "removed": "Player successfully removed from the roster.",
        "role-updated": "Roster member role successfully updated.",
      }
      setSuccessMessage(messages[initialSuccess] ?? "Roster successfully updated.")
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [initialError, initialSuccess])

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">
            Roster management
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Team Roster</h3>
          <p className="mt-1 text-xs text-white/55">
            {isManager
              ? "Add, remove, or modify roles of members in your team."
              : "List of all active players enrolled in this team roster."}
          </p>
        </div>

        {/* Form to Invite Member (Manager-only) */}
        {isManager && (
          <form action={addTeamMember} className="flex gap-2 w-full max-w-sm" onSubmit={() => setErrorMessage(null)}>
            <input type="hidden" name="team_id" value={teamId} />
            <input
              name="player_identifier"
              required
              placeholder="Enter player nickname..."
              className={inputClassName}
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-300 cursor-pointer whitespace-nowrap shadow-md shadow-emerald-950/20"
            >
              Add Player
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
          No players enrolled in this team roster yet.
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
                          Owner
                        </span>
                      )}
                      {isCaptain && (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-300 uppercase tracking-wider">
                          Captain
                        </span>
                      )}
                      {!isCaptain && !isOwner && (
                        <span className="rounded-full bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-extrabold text-white/60 uppercase tracking-wider">
                          Member
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
                            title="Demote to Member"
                          >
                            Demote
                          </button>
                        )
                      ) : (
                        <button
                          type="submit"
                          name="role"
                          value="captain"
                          className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/10 cursor-pointer transition"
                          title="Promote to Captain"
                        >
                          Promote
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
                          title="Remove player from Roster"
                        >
                          Remove
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
