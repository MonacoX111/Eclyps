"use client"

import Link from "next/link"
import { useLanguage } from "@/components/language-provider"
import { Shield, Trophy, Users, CheckCircle2, AlertCircle } from "lucide-react"

export type TeamItem = {
  id: string
  name: string
  status: string
  logo_url?: string | null
  role: "owner" | "captain" | "member"
}

export type RegistrationItem = {
  id: string
  tournamentName: string
  registrationType: "player" | "team"
  linkedName: string
  status: "pending" | "approved" | "rejected"
  hasParticipant: boolean
  createdAt: string
}

type PlayerDashboardProps = {
  teams: TeamItem[]
  registrations: RegistrationItem[]
}

export function PlayerDashboard({ teams, registrations }: PlayerDashboardProps) {
  const { t } = useLanguage()

  // Format Date safely
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-12">
      {/* Divider */}
      <div
        className="mx-auto h-px w-full max-w-xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
        }}
      />

      <div className="grid gap-8 md:grid-cols-2">
        {/* My Teams Section */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">
                {t.profile.teamProfile}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{t.profile.myTeams}</h3>
            </div>
          </div>

          {/* Teams list */}
          {teams.length === 0 ? (
            <p className="mt-6 text-center text-xs text-white/45 py-8 bg-black/10 border border-white/5 rounded-xl font-medium">
              {t.profile.noTeams}
            </p>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-4 transition hover:border-white/10 hover:bg-white/[0.01]"
                >
                  <div className="flex items-center gap-3">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt=""
                        className="h-8 w-8 rounded-lg border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-white/[0.05] flex items-center justify-center border border-white/10">
                        <Shield className="h-4 w-4 text-emerald-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-xs text-white transition hover:text-emerald-400">
                        {team.name}
                      </h4>
                      <span className="text-[9px] font-bold text-white/45 uppercase tracking-wider">
                        {team.role === "owner"
                          ? t.profile.meta.owner
                          : team.role === "captain"
                            ? t.profile.meta.captain
                            : t.profile.memberOf}
                      </span>
                    </div>
                  </div>

                  {/* Team status badge */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${
                      team.status === "rejected"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : team.status === "pending"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {team.status === "rejected"
                      ? t.profile.meta.rejected
                      : team.status === "pending"
                      ? t.profile.meta.pending
                      : t.profile.meta.approved}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* My Registrations Section */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">
                {t.navbar.registration}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{t.profile.myRegistrations}</h3>
            </div>
          </div>

          {/* Registrations list */}
          {registrations.length === 0 ? (
            <p className="mt-6 text-center text-xs text-white/45 py-8 bg-black/10 border border-white/5 rounded-xl font-medium">
              {t.profile.noRegistrations}
            </p>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-white">{reg.tournamentName}</h4>
                      <p className="mt-0.5 text-[10px] text-white/45">
                        {formatDate(reg.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${
                        reg.status === "rejected"
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : reg.status === "pending"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {reg.status === "rejected"
                        ? t.profile.meta.rejected
                        : reg.status === "pending"
                        ? t.profile.meta.pending
                        : t.profile.meta.approved}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                      <span className="capitalize text-white/35">
                        {reg.registrationType === "player" ? t.navbar.players : t.navbar.teams}:
                      </span>
                      <span className="font-medium text-white">{reg.linkedName}</span>
                    </div>

                    {/* Linked Participant Indicator */}
                    {reg.hasParticipant ? (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400"
                        title="Roster check-in ready and synced"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Linked
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-white/35"
                        title="Pending admin approval to sync participant slot"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        Unlinked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
