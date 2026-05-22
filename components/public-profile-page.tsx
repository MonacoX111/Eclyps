import Link from "next/link"
import { ArrowLeft, Shield, User } from "lucide-react"
import { Footer } from "@/components/footer"
import { MatchSchedule } from "@/components/match-schedule"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { Results } from "@/components/results"
import { SectionHeading } from "@/components/section-heading"
import type { PublicProfileData } from "@/lib/data/profiles"

type PublicProfilePageProps = {
  data: PublicProfileData
}

export function PublicProfilePage({ data }: PublicProfilePageProps) {
  const { profile } = data
  const isTeam = profile.kind === "team"
  const rating = getProfileRating(data)
  const rankPosition = getProfileRankPosition(data)
  const connectionsTitle = isTeam ? "Connected Players" : "Team Connection"
  const emptyConnections = isTeam
    ? "No connected players are available for this team yet."
    : "No team connection is available for this player yet."

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
              Back to Eclyps
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
                    {isTeam ? "Team Profile" : "Player Profile"}
                  </p>
                  <h1 className="glow-text break-words text-4xl font-bold text-foreground md:text-6xl">
                    {profile.display_name}
                  </h1>
                  {profile.nickname && profile.nickname !== profile.name ? (
                    <p className="mt-3 break-words text-sm text-muted-foreground">
                      {profile.name}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap gap-3 text-sm">
                    <MetaPill
                      label="Tournament"
                      value={data.tournamentName}
                      empty={isTeam ? "Tournament TBA" : "Not registered"}
                    />
                    <MetaPill label="Region" value={profile.region} empty="Region TBA" />
                    <MetaPill
                      label="Seed"
                      value={profile.seed ? `#${profile.seed}` : null}
                      empty="Seed TBA"
                    />
                    <MetaPill label="Rating" value={String(rating)} />
                    <MetaPill
                      label="Rank"
                      value={rankPosition ? `#${rankPosition}` : null}
                      empty="Unranked"
                    />
                    <MetaPill label="Record" value={`${data.stats.wins}W / ${data.stats.losses}L`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        <StatsSection data={data} />

        <Divider />

        <section className="relative z-10 px-4 py-24">
          <div className="mx-auto max-w-5xl">
            <SectionHeading eyebrow="Roster Link" title={connectionsTitle} />
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

        {data.matches.length > 0 ? (
          <MatchSchedule matches={data.matches} />
        ) : (
          <ProfileSectionEmpty
            eyebrow="Battle Calendar"
            title="Recent Matches"
            message={`No recent matches involving this ${isTeam ? "team" : "player"} yet.`}
          />
        )}

        <Divider />

        {data.results.length > 0 ? (
          <Results results={data.results} />
        ) : (
          <ProfileSectionEmpty
            eyebrow="Hall of Legends"
            title="Results"
            message={`No placements connected to this ${isTeam ? "team" : "player"} yet.`}
          />
        )}
      </MotionProvider>
      <Footer />
    </main>
  )
}

function StatsSection({ data }: { data: PublicProfileData }) {
  const { stats } = data
  const rating = getProfileRating(data)
  const rankPosition = getProfileRankPosition(data)
  const streakLabel =
    stats.currentStreak.result && stats.currentStreak.count > 0
      ? `${stats.currentStreak.count}${stats.currentStreak.result === "win" ? "W" : "L"}`
      : "None"

  return (
    <section className="relative z-10 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="Combat Stats" title="Performance" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Rating" value={String(rating)} />
          <StatCard label="Rank" value={rankPosition ? `#${rankPosition}` : "Unranked"} />
          <StatCard label="Wins" value={String(stats.wins)} />
          <StatCard label="Losses" value={String(stats.losses)} />
          <StatCard label="Matches" value={String(stats.totalMatches)} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} />
          <StatCard label="Streak" value={streakLabel} />
        </div>

        <div className="mt-8">
          {stats.recentHistory.length === 0 ? (
            <EmptyState>No match history yet</EmptyState>
          ) : (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div
                className="px-6 py-4"
                style={{ background: "oklch(0.78 0.18 165 / 0.05)" }}
              >
                <h3 className="text-lg font-bold text-foreground">Recent Match History</h3>
              </div>
              <div className="divide-y divide-border/50">
                {stats.recentHistory.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-foreground">
                        vs {match.opponent}
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
                        {match.result === "win" ? "Win" : "Loss"}
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

export function PublicProfileError({ message }: { message: string }) {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField />
      <MotionProvider>
        <Navbar homeHref="/" navHrefPrefix="/" participantLabel="Teams" />
        <ProfileSectionEmpty
          eyebrow="Profile"
          title="Something Went Offline"
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
