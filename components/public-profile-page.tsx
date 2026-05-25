"use client"

import Link from "next/link"
import { ArrowLeft, Shield, User } from "lucide-react"
import { Footer } from "@/components/footer"
import { MatchSchedule } from "@/components/match-schedule"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { Results } from "@/components/results"
import { SectionHeading } from "@/components/section-heading"
import { useLanguage } from "@/components/language-provider"
import type { PublicProfileData } from "@/lib/data/profiles"

type PublicProfilePageProps = {
  data: PublicProfileData
}

export function PublicProfilePage({ data }: PublicProfilePageProps) {
  const { t } = useLanguage()
  const { profile } = data
  const isTeam = profile.kind === "team"
  const rating = getProfileRating(data)
  const rankPosition = getProfileRankPosition(data)
  
  const connectionsTitle = isTeam ? t.profile.connectionsTeams : t.profile.connectionsPlayers
  const emptyConnections = isTeam ? t.profile.emptyConnectionsTeams : t.profile.emptyConnectionsPlayers

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <MotionProvider>
        <Navbar homeHref="/" navHrefPrefix="/" participantLabel="Teams" />
        <section className="relative z-10 px-4 pb-16 pt-28 md:pt-36">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.profile.backToEclyps}
            </Link>

            <div className="glass-card overflow-hidden rounded-2xl">
              <div
                className="flex flex-col gap-8 px-6 py-8 md:flex-row md:items-center md:px-8"
                style={{ background: "oklch(0.78 0.18 165 / 0.04)" }}
              >
                <ProfileImage
                  imageUrl={profile.image_url}
                  name={profile.display_name}
                  kind={profile.kind}
                />

                <div className="min-w-0 flex-1">
                  <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
                    {isTeam ? t.profile.teamProfile : t.profile.playerProfile}
                  </p>
                  <h1 className="glow-text break-words text-4xl font-bold text-foreground md:text-6xl flex flex-wrap items-center gap-3">
                    {profile.display_name}
                    {isTeam && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                        [{profile.display_name.split(/\s+/).filter(Boolean).map(p => p[0]).join("").slice(0, 3).toUpperCase()}]
                      </span>
                    )}
                    {profile.status && profile.status !== "approved" && (
                      <span className={`inline-block rounded-xl px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                        profile.status === "rejected"
                          ? "bg-red-500/10 border border-red-500/25 text-red-400"
                          : "bg-amber-500/10 border border-amber-500/25 text-amber-400 animate-pulse"
                      }`}>
                        {profile.status === "rejected" ? t.profile.meta.rejected : t.profile.meta.pending}
                      </span>
                    )}
                    {!isTeam && profile.discord_username && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/25 px-2.5 py-0.5 text-xs font-semibold text-[#5865F2]" title={t.profile.discordLinked}>
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 127.14 96.36">
                          <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.4-5c.88-.65,1.73-1.34,2.54-2a75.7,75.7,0,0,0,72.76,0c.81.71,1.66,1.4,2.54,2a68.43,68.43,0,0,1-10.4,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.81,49.33,123.36,26.54,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                        </svg>
                        {profile.discord_username}
                      </span>
                    )}
                  </h1>
                  {profile.nickname && profile.nickname !== profile.name ? (
                    <p className="mt-3 break-words text-sm text-muted-foreground">
                      {profile.name}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap gap-3 text-sm">
                    <MetaPill
                      label={t.profile.meta.tournament}
                      value={data.tournamentName}
                      empty={isTeam ? t.profile.meta.tournamentTba : t.profile.meta.notRegistered}
                    />
                    <MetaPill label={t.profile.meta.region} value={profile.region} empty={t.profile.meta.regionTba} />
                    <MetaPill
                      label={t.profile.meta.seed}
                      value={profile.seed ? `#${profile.seed}` : null}
                      empty={t.profile.meta.seedTba}
                    />
                    {isTeam && profile.captain_name && (
                      <MetaPill
                        label={t.profile.meta.captain}
                        value={profile.captain_name}
                      />
                    )}
                    {isTeam && profile.member_count !== null && (
                      <MetaPill
                        label={t.profile.meta.members}
                        value={String(profile.member_count)}
                      />
                    )}
                    <MetaPill label={t.profile.meta.rating} value={String(rating)} />
                    <MetaPill
                      label={t.profile.meta.rank}
                      value={rankPosition ? `#${rankPosition}` : null}
                      empty={t.profile.meta.unranked}
                    />
                    <MetaPill label={t.profile.meta.record} value={`${data.stats.wins}W / ${data.stats.losses}L`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        <StatsSection data={data} />

        <Divider />

        {!isTeam && (
          <>
            <section className="relative z-10 px-4 py-24">
              <div className="mx-auto max-w-5xl">
                <SectionHeading eyebrow={t.profile.rosterHeading} title={connectionsTitle} />
                {data.connections.length === 0 ? (
                  <EmptyState>{emptyConnections}</EmptyState>
                ) : (
                  <div className="flex flex-wrap justify-center gap-4">
                    {data.connections.map((connection) => (
                      <div
                        key={connection.id}
                        className="glass-card w-full rounded-xl p-5 sm:w-[calc((100%-1rem)/2)]"
                      >
                        <p className="break-words font-semibold text-foreground">
                          {connection.label}
                        </p>
                        {connection.meta ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {connection.meta}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <Divider />
          </>
        )}

        {data.matches.length > 0 ? (
          <MatchSchedule matches={data.matches} />
        ) : (
          <ProfileSectionEmpty
            eyebrow={t.profile.recentMatchesEyebrow}
            title={t.profile.recentMatchesTitle}
            message={t.profile.emptyRecentMatches}
          />
        )}

        <Divider />

        {data.results.length > 0 ? (
          <Results results={data.results} />
        ) : (
          <ProfileSectionEmpty
            eyebrow={t.profile.resultsEyebrow}
            title={t.profile.resultsTitle}
            message={t.profile.emptyResults}
          />
        )}
      </MotionProvider>
      <Footer />
    </main>
  )
}

function StatsSection({ data }: { data: PublicProfileData }) {
  const { t } = useLanguage()
  const { stats } = data
  const rating = getProfileRating(data)
  const rankPosition = getProfileRankPosition(data)
  const streakLabel =
    stats.currentStreak.result && stats.currentStreak.count > 0
      ? `${stats.currentStreak.count}${stats.currentStreak.result === "win" ? "W" : "L"}`
      : t.profile.stats.none

  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={t.profile.statsHeading} title={t.profile.performance} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t.profile.stats.rating} value={String(rating)} />
          <StatCard label={t.profile.stats.rank} value={rankPosition ? `#${rankPosition}` : t.profile.stats.unranked} />
          <StatCard label={t.profile.stats.wins} value={String(stats.wins)} />
          <StatCard label={t.profile.stats.losses} value={String(stats.losses)} />
          <StatCard label={t.profile.stats.matches} value={String(stats.totalMatches)} />
          <StatCard label={t.profile.stats.winRate} value={`${stats.winRate}%`} />
          <StatCard label={t.profile.stats.streak} value={streakLabel} />
        </div>

        <div className="mt-8">
          {stats.recentHistory.length === 0 ? (
            <EmptyState>{t.profile.noHistory}</EmptyState>
          ) : (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div
                className="px-6 py-4"
                style={{ background: "oklch(0.78 0.18 165 / 0.05)" }}
              >
                <h3 className="text-lg font-bold text-foreground">{t.profile.recentHistory}</h3>
              </div>
              <div className="divide-y divide-border/50">
                {stats.recentHistory.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-foreground">
                        {t.profile.vs} {match.opponent}
                      </p>
                      <p className="mt-1 text-xs tracking-wider uppercase text-muted-foreground">
                        {match.round}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {match.scoreline ? (
                        <span className="font-mono text-muted-foreground">
                          {match.scoreline}
                        </span>
                      ) : null}
                      <span
                        className={
                          match.result === "win"
                            ? "rounded-full px-3 py-1 text-xs font-medium text-primary"
                            : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
                        }
                        style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
                      >
                        {match.result === "win" ? t.profile.win : t.profile.loss}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function getProfileRating(data: PublicProfileData) {
  return data.ranking?.rating ?? data.profile.rating ?? 1000
}

function getProfileRankPosition(data: PublicProfileData) {
  return data.ranking?.rankPosition ?? data.profile.rank_position
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-5 text-center">
      <p className="text-xs tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-bold text-foreground">
        {value}
      </p>
    </div>
  )
}

export function PublicProfileLoading() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <section className="relative z-10 px-4 pb-16 pt-28 md:pt-36">
        <div className="mx-auto max-w-6xl">
          <div className="glass-card h-72 animate-pulse rounded-2xl" />
        </div>
      </section>
      <Footer />
    </main>
  )
}

export function PublicProfileError({ message, kind = "team" }: { message: string; kind?: "team" | "player" }) {
  const { t } = useLanguage()
  const eyebrow = kind === "player" ? t.profile.playerProfile : t.profile.teamProfile

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <MotionProvider>
        <Navbar homeHref="/" navHrefPrefix="/" participantLabel={kind === "player" ? "Players" : "Teams"} />
        <ProfileSectionEmpty
          eyebrow={eyebrow}
          title={t.profile.somethingWentOffline}
          message={message}
        />
      </MotionProvider>
      <Footer />
    </main>
  )
}

function ProfileImage({
  imageUrl,
  name,
  kind,
}: {
  imageUrl: string | null
  name: string
  kind: "team" | "player"
}) {
  return (
    <div
      className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-shadow duration-300 md:h-36 md:w-36"
      style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`${name} ${kind === "team" ? "logo" : "avatar"}`}
          className="h-full w-full object-cover"
        />
      ) : kind === "team" ? (
        <Shield className="h-14 w-14 text-primary md:h-16 md:w-16" />
      ) : (
        <User className="h-14 w-14 text-primary md:h-16 md:w-16" />
      )}
    </div>
  )
}

function MetaPill({
  label,
  value,
  empty = "TBA",
}: {
  label: string
  value?: string | null
  empty?: string
}) {
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground"
      style={{ background: "oklch(0.78 0.18 165 / 0.08)" }}
    >
      <span className="text-primary">{label}:</span> {value ?? empty}
    </span>
  )
}

function ProfileSectionEmpty({
  eyebrow,
  title,
  message,
}: {
  eyebrow: string
  title: string
  message: string
}) {
  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <EmptyState>{message}</EmptyState>
      </div>
    </section>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="glass-card mx-auto max-w-xl rounded-xl p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

function Divider() {
  return (
    <div
      className="mx-auto h-px max-w-xl"
      style={{
        background:
          "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.4), transparent)",
      }}
    />
  )
}
