"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { removeTeamMember, updateTeamMemberRole } from "@/app/actions/teams"
import { createTeamInvite, cancelTeamInvite } from "@/app/actions/invites"
import { useLanguage } from "@/components/language-provider"
import { Search, X, UserCheck, Inbox } from "lucide-react"

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 pl-9 pr-8 py-2.5 text-xs text-white outline-none transition focus:border-emerald-500/60"

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
  pendingInvites?: any[]
  inviteCandidates?: any[]
}

export function TeamRosterManager({
  teamId,
  isManager,
  members,
  ownerPlayerId,
  initialError,
  initialSuccess,
  pendingInvites = [],
  inviteCandidates = [],
}: TeamRosterManagerProps) {
  const { t, lang } = useLanguage()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Autocomplete UI States
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialError) {
      const messages: Record<string, string> = {
        "invalid-player-name": t.account.roster.errors.invalidPlayerName,
        "permission-denied": t.account.invites.errors.permissionDenied,
        "player-not-found": t.account.invites.errors.playerNotFound,
        "player-not-approved": t.account.invites.errors.playerNotApproved,
        "self-invite-blocked": t.account.invites.errors.selfInviteBlocked,
        "already-in-team": t.account.invites.errors.alreadyInTeam,
        "invite-already-pending": t.account.invites.errors.inviteAlreadyPending,
        "multiple-players-found": t.account.invites.errors.multiplePlayersFound,
        "mutation-failed": t.account.invites.errors.mutationFailed,
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
        "invite-sent": t.account.invites.success.sent,
        "invite-cancelled": t.account.invites.success.cancelled,
      }
      setSuccessMessage(messages[initialSuccess] ?? (lang === "uk" ? "Дію успішно виконано." : "Action successfully completed."))
      // Clear autocomplete input on successful invite
      if (initialSuccess === "invite-sent") {
        setSearchQuery("")
        setSelectedPlayer(null)
      }
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [initialError, initialSuccess, lang, t])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Dynamic Autocomplete Search & Sorting Logic
  const getFilteredCandidates = () => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      // Return first 20 approved candidates when input is focused but empty
      return inviteCandidates.slice(0, 20)
    }

    const filtered = inviteCandidates.filter((p) => {
      const disp = (p.display_name ?? "").toLowerCase()
      const nick = (p.nickname ?? "").toLowerCase()
      const disc = (p.discord_username ?? "").toLowerCase()
      const real = (p.real_name ?? "").toLowerCase()

      return disp.includes(q) || nick.includes(q) || disc.includes(q) || real.includes(q)
    })

    // Rank matching candidates: exact/startsWith matches higher
    return filtered
      .sort((a, b) => {
        const aDisp = (a.display_name ?? "").toLowerCase()
        const bDisp = (b.display_name ?? "").toLowerCase()
        const aNick = (a.nickname ?? "").toLowerCase()
        const bNick = (b.nickname ?? "").toLowerCase()

        const aExact = aDisp === q || aNick === q
        const bExact = bDisp === q || bNick === q
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        const aStarts = aDisp.startsWith(q) || aNick.startsWith(q)
        const bStarts = bDisp.startsWith(q) || bNick.startsWith(q)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1

        return aDisp.localeCompare(bDisp)
      })
      .slice(0, 30) // Limit to 30 items for supreme list performance
  }

  const filteredCandidates = getFilteredCandidates()

  const handleSelectCandidate = (player: any) => {
    setSelectedPlayer(player)
    setSearchQuery(player.display_name)
    setIsDropdownOpen(false)
    setErrorMessage(null)
  }

  const handleClearSelection = () => {
    setSelectedPlayer(null)
    setSearchQuery("")
    setIsDropdownOpen(true)
  }

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

        {/* Form to Invite Member with Autocomplete Dropdown (Manager-only) */}
        {isManager && (
          <div className="relative w-full max-w-sm" ref={dropdownRef}>
            <form action={createTeamInvite} className="flex gap-2 w-full" onSubmit={() => setErrorMessage(null)}>
              <input type="hidden" name="team_id" value={teamId} />
              {/* Send direct Player ID for absolute lookup accuracy */}
              <input type="hidden" name="invited_player_id" value={selectedPlayer?.id || ""} />

              <div className="relative flex-1">
                {/* Search Icon */}
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />

                <input
                  name="player_identifier"
                  required
                  autoComplete="off"
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (selectedPlayer && e.target.value !== selectedPlayer.display_name) {
                      setSelectedPlayer(null) // clear ID binding if they keep typing manually
                    }
                    setIsDropdownOpen(true)
                  }}
                  placeholder={t.account.invites.invitePlaceholder}
                  className={inputClassName}
                />

                {/* Clear Button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-300 cursor-pointer whitespace-nowrap shadow-md shadow-emerald-950/20 flex items-center justify-center min-h-[38px]"
              >
                {t.account.invites.sendButton}
              </button>
            </form>

            {/* Selection Status Badge */}
            {selectedPlayer && (
              <div className="absolute left-0 mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <UserCheck className="h-3 w-3" />
                {t.account.invites.playerSelected}: <span className="font-bold">{selectedPlayer.display_name}</span>
              </div>
            )}

            {/* Autocomplete Dropdown overlay */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-xl border p-1 shadow-2xl overflow-x-hidden scrollbar-thin"
                  style={{
                    background: "oklch(0.07 0.01 180 / 0.95)",
                    backdropFilter: "blur(20px)",
                    borderColor: "oklch(0.78 0.18 165 / 0.12)",
                  }}
                >
                  {filteredCandidates.length === 0 ? (
                    <div className="py-6 px-4 flex flex-col items-center justify-center text-center gap-2">
                      <Inbox className="h-5 w-5 text-white/20" />
                      <span className="text-[11px] font-semibold text-white/80">{t.account.invites.noPlayersFound}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <div className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">
                        {t.account.invites.approvedPlayers} ({filteredCandidates.length})
                      </div>
                      {filteredCandidates.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => handleSelectCandidate(player)}
                          className="w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-3 hover:bg-white/[0.04] transition cursor-pointer"
                        >
                          {/* Player Avatar */}
                          {player.avatar_url ? (
                            <img
                              src={player.avatar_url}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover border border-white/5 shrink-0"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-bold text-white/50 shrink-0">
                              {player.display_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-white truncate">
                              {player.display_name}
                            </div>
                            {/* Secondary Information */}
                            <div className="text-[9px] text-white/45 truncate mt-0.5 flex items-center gap-1.5 font-medium">
                              {player.discord_username && (
                                <span className="text-cyan-400">@{player.discord_username}</span>
                              )}
                              {player.discord_username && player.region && (
                                <span className="text-white/20">|</span>
                              )}
                              {player.region && (
                                <span>{player.region}</span>
                              )}
                              {player.real_name && (
                                <span className="text-white/30 font-normal">({player.real_name})</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/45 shrink-0">
                      {(member.display_name || "Player").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-xs text-white flex flex-wrap items-center gap-1.5 break-all">
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

                {/* Roster Controls (Manager-only) */}
                {isManager && (
                  <div className="flex items-center gap-2 shrink-0">
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

      {/* Pending Invites List */}
      {isManager && pendingInvites && pendingInvites.length > 0 && (
        <div className="mt-8 border-t border-white/5 pt-6">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/55">
            {t.account.invites.pendingTitle}
          </h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3.5 transition hover:border-white/10"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <span className="font-semibold text-xs text-white break-all block">
                    {invite.display_name}
                  </span>
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-300 uppercase tracking-wider mt-1.5 inline-block">
                    {t.profile.meta.pending}
                  </span>
                </div>
                <form action={cancelTeamInvite} className="shrink-0">
                  <input type="hidden" name="invite_id" value={invite.id} />
                  <input type="hidden" name="team_id" value={teamId} />
                  <button
                    type="submit"
                    className="rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[10px] text-red-300 hover:bg-red-500/10 cursor-pointer transition whitespace-nowrap"
                  >
                    {t.account.invites.cancelButton}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
