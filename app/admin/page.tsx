import { cookies } from "next/headers"
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSession,
} from "@/lib/admin-auth"
import {
  createMatch,
  createPlayer,
  createResult,
  createTeam,
  createTournament,
  deleteMatch,
  deletePlayer,
  deleteResult,
  deleteTeam,
  deleteTournament,
  loginAdmin,
  logoutAdmin,
  setActiveTournament,
  updateMatch,
  updatePlayer,
  updateResult,
  updateTeam,
  updateTournament,
} from "./actions"
import {
  getAdminTournaments,
  type AdminTournament,
} from "@/lib/admin/tournaments"
import { getAdminTeams, type AdminTeam } from "@/lib/admin/teams"
import { getAdminPlayers, type AdminPlayer } from "@/lib/admin/players"
import { getAdminMatches, type AdminMatch } from "@/lib/admin/matches"
import { getAdminResults, type AdminResult } from "@/lib/admin/results"
import {
  MatchParticipantFields,
  ResultParticipantFields,
} from "@/components/admin-participant-fields"
import { formatShortEventDate } from "@/lib/date-format"
import { AdminLoginForm } from "./login-form"

export const dynamic = "force-dynamic"

type AdminPageProps = {
  searchParams?: Promise<{
    error?: string
    crudError?: string
    crudSuccess?: string
    teamError?: string
    teamSuccess?: string
    playerError?: string
    playerSuccess?: string
    matchError?: string
    matchSuccess?: string
    resultError?: string
    resultSuccess?: string
    activeError?: string
    activeSuccess?: string
  }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const isAuthenticated = await isValidAdminSession(sessionCookie)
  const resolvedSearchParams = await searchParams

  if (!isAuthenticated) {
    return (
      <AdminShell>
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-300/80">
            Eclyps Admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Admin access</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Enter the admin password to continue.
          </p>

          <AdminLoginForm action={loginAdmin} error={resolvedSearchParams?.error} />
        </section>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <AdminDashboard searchParams={resolvedSearchParams} />
    </AdminShell>
  )
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-white">
      {children}
    </main>
  )
}

const adminSections = [
  {
    id: "tournaments",
    title: "Tournaments",
    description: "Tournament management will be added in 14/30.",
  },
  {
    id: "teams",
    title: "Teams",
    description: "Team management is active in 15/30.",
  },
  {
    id: "players",
    title: "Players",
    description: "Player management is active.",
  },
  {
    id: "matches",
    title: "Matches / Results",
    description: "Matches and results management is active in 16/30.",
  },
  {
    id: "active-tournament",
    title: "Active Tournament",
    description: "Choose which tournament appears on the public homepage.",
  },
] as const

async function AdminDashboard({
  searchParams,
}: {
  searchParams?: {
    crudError?: string
    crudSuccess?: string
    teamError?: string
    teamSuccess?: string
    playerError?: string
    playerSuccess?: string
    matchError?: string
    matchSuccess?: string
    resultError?: string
    resultSuccess?: string
    activeError?: string
    activeSuccess?: string
  }
}) {
  const [
    { tournaments, error: tournamentError },
    { teams, error: teamError },
    { players, error: playerError },
    { matches, error: matchError },
    { results, error: resultError },
  ] = await Promise.all([
    getAdminTournaments(),
    getAdminTeams(),
    getAdminPlayers(),
    getAdminMatches(),
    getAdminResults(),
  ])
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <TeamNameDatalist teamNames={teamNames} />
      <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-300/80">
              Eclyps Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Authentication is active. This dashboard is the admin foundation for
              upcoming tournament, team, match, result, and active tournament
              management features.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white"
            >
              ← Back to site
            </a>

            <form action={logoutAdmin}>
              <button
                type="submit"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        <nav
          aria-label="Admin sections"
          className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4"
        >
          {adminSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-emerald-300/40 hover:text-white"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </header>

      <TournamentPanel
        tournaments={tournaments}
        fetchError={tournamentError}
        feedback={getTournamentFeedback(searchParams)}
      />

      <TeamPanel
        teams={teams}
        tournaments={tournaments}
        fetchError={teamError}
        feedback={getTeamFeedback(searchParams)}
      />

      <PlayerPanel
        players={players}
        tournaments={tournaments}
        fetchError={playerError}
        feedback={getPlayerFeedback(searchParams)}
      />

      <MatchPanel
        matches={matches}
        tournaments={tournaments}
        teams={teams}
        players={players}
        fetchError={matchError}
        feedback={getMatchFeedback(searchParams)}
      />

      <ResultPanel
        results={results}
        tournaments={tournaments}
        teams={teams}
        players={players}
        fetchError={resultError}
        feedback={getResultFeedback(searchParams)}
      />

      <ActiveTournamentPanel
        tournaments={tournaments}
        fetchError={tournamentError}
        feedback={getActiveTournamentFeedback(searchParams)}
      />
    </div>
  )
}

function MatchPanel({
  matches,
  tournaments,
  teams,
  players,
  fetchError,
  feedback,
}: {
  matches: AdminMatch[]
  tournaments: AdminTournament[]
  teams: AdminTeam[]
  players: AdminPlayer[]
  fetchError: string | null
  feedback: Feedback | null
}) {
  const tournamentNames = createTournamentNameMap(tournaments)
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)

  return (
    <AdminPanel
      id="matches"
      title="Matches"
      description="Create, update, and remove matches. Team values are stored as text."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="matches"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create match</h3>
          <MatchForm
            action={createMatch}
            submitLabel="Create match"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
          />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing matches</h3>
          {matches.length === 0 ? (
            <EmptyState>No matches exist in Supabase yet.</EmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {matches.map((match) => (
                <MatchRecord
                  key={match.id}
                  match={match}
                  tournaments={tournaments}
                  teamNames={teamNames}
                  playerNames={playerNames}
                  tournamentName={
                    match.tournament_id
                      ? tournamentNames.get(match.tournament_id) ?? "Unknown tournament"
                      : "Unassigned"
                  }
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminPanel>
  )
}

function ActiveTournamentPanel({
  tournaments,
  fetchError,
  feedback,
}: {
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: Feedback | null
}) {
  return (
    <AdminPanel
      id="active-tournament"
      title="Active Tournament"
      description="Choose the single tournament that should power the public homepage."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="tournaments"
    >
      {tournaments.length === 0 ? (
        <EmptyState>No tournaments exist in Supabase yet.</EmptyState>
      ) : (
        <div className="mt-6 space-y-3">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h3 className="break-words font-medium">{tournament.name ?? "Untitled tournament"}</h3>
                <p className="mt-1 break-words text-sm text-white/55">
                  {tournament.game ?? "Unknown game"} · {formatDisplayDate(tournament.event_date)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {tournament.is_active ? (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">
                    Active
                  </span>
                ) : (
                  <span className={pillClassName}>Inactive</span>
                )}

                <form action={setActiveTournament}>
                  <input type="hidden" name="id" value={tournament.id} />
                  <button
                    type="submit"
                    disabled={Boolean(tournament.is_active)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-emerald-300/40 hover:text-white disabled:cursor-not-allowed disabled:border-emerald-300/20 disabled:bg-emerald-300/10 disabled:text-emerald-100"
                  >
                    {tournament.is_active ? "Currently active" : "Set active"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  )
}

function ResultPanel({
  results,
  tournaments,
  teams,
  players,
  fetchError,
  feedback,
}: {
  results: AdminResult[]
  tournaments: AdminTournament[]
  teams: AdminTeam[]
  players: AdminPlayer[]
  fetchError: string | null
  feedback: Feedback | null
}) {
  const tournamentNames = createTournamentNameMap(tournaments)
  const teamNames = getTeamNames(teams)
  const playerNames = getPlayerNames(players)

  return (
    <AdminPanel
      id="results"
      title="Results"
      description="Create, update, and remove result rows. Team values are stored as text."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="results"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create result</h3>
          <ResultForm
            action={createResult}
            submitLabel="Create result"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
          />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing results</h3>
          {results.length === 0 ? (
            <EmptyState>No results exist in Supabase yet.</EmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {results.map((result) => (
                <ResultRecord
                  key={result.id}
                  result={result}
                  tournaments={tournaments}
                  teamNames={teamNames}
                  playerNames={playerNames}
                  tournamentName={
                    result.tournament_id
                      ? tournamentNames.get(result.tournament_id) ?? "Unknown tournament"
                      : "Unassigned"
                  }
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminPanel>
  )
}

function MatchRecord({
  match,
  tournaments,
  teamNames,
  playerNames,
  tournamentName,
}: {
  match: AdminMatch
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  tournamentName: string
}) {
  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">
              {match.team1 ?? "TBD"} vs {match.team2 ?? "TBD"}
            </h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {tournamentName} · {match.round ?? "No round"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>{formatStatus(match.status)}</span>
            <span className={pillClassName}>
              {match.score1 ?? "—"} : {match.score2 ?? "—"}
            </span>
            <span className={pillClassName}>Order {match.match_order ?? "—"}</span>
          </div>
        </div>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <MatchForm
            action={updateMatch}
            submitLabel="Save changes"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
            match={match}
          />
          <DeleteForm action={deleteMatch} id={match.id} />
        </div>
      </div>
    </details>
  )
}

function ResultRecord({
  result,
  tournaments,
  teamNames,
  playerNames,
  tournamentName,
}: {
  result: AdminResult
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  tournamentName: string
}) {
  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{result.team ?? "Untitled result"}</h4>
            <p className="mt-1 break-words text-sm text-white/55">{tournamentName}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>Placement {result.placement ?? "—"}</span>
            {result.label && <span className={pillClassName}>{result.label}</span>}
          </div>
        </div>
      </summary>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <ResultForm
            action={updateResult}
            submitLabel="Save changes"
            tournaments={tournaments}
            teamNames={teamNames}
            playerNames={playerNames}
            result={result}
          />
          <DeleteForm action={deleteResult} id={result.id} />
        </div>
      </div>
    </details>
  )
}

function MatchForm({
  action,
  submitLabel,
  tournaments,
  teamNames,
  playerNames,
  match,
}: {
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  match?: AdminMatch
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {match && <input type="hidden" name="id" value={match.id} />}
      <TournamentSelect tournaments={tournaments} value={match?.tournament_id} />
      <AdminField label="Round">
        <input name="round" defaultValue={match?.round ?? ""} className={inputClassName} />
      </AdminField>
      <MatchParticipantFields
        initialType={match?.participant_type}
        teamNames={teamNames}
        playerNames={playerNames}
        team1={match?.team1}
        team2={match?.team2}
      />
      <AdminField label="Score 1">
        <input name="score1" type="number" defaultValue={match?.score1 ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Score 2">
        <input name="score2" type="number" defaultValue={match?.score2 ?? ""} className={inputClassName} />
      </AdminField>
      <StatusSelect value={match?.status} />
      <AdminField label="Match order">
        <input
          name="match_order"
          type="number"
          min={1}
          step={1}
          defaultValue={match?.match_order ?? ""}
          required
          className={inputClassName}
        />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}

function ResultForm({
  action,
  submitLabel,
  tournaments,
  teamNames,
  playerNames,
  result,
}: {
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  tournaments: AdminTournament[]
  teamNames: string[]
  playerNames: string[]
  result?: AdminResult
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {result && <input type="hidden" name="id" value={result.id} />}
      <TournamentSelect tournaments={tournaments} value={result?.tournament_id} />
      <ResultParticipantFields
        initialType={result?.participant_type}
        teamNames={teamNames}
        playerNames={playerNames}
        team={result?.team}
      />
      <AdminField label="Placement">
        <input
          name="placement"
          type="number"
          min={1}
          step={1}
          defaultValue={result?.placement ?? ""}
          required
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Label">
        <input name="label" defaultValue={result?.label ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="MVP">
        <input name="mvp" defaultValue={result?.mvp ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Scoreline">
        <input name="scoreline" defaultValue={result?.scoreline ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Note">
        <input name="note" defaultValue={result?.note ?? ""} className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}

function TournamentSelect({
  tournaments,
  value,
}: {
  tournaments: AdminTournament[]
  value?: string | null
}) {
  return (
    <AdminField label="Tournament">
      <select name="tournament_id" defaultValue={value ?? ""} required className={inputClassName}>
        <option value="" disabled>
          Select tournament
        </option>
        {tournaments.map((tournament) => (
          <option key={tournament.id} value={tournament.id}>
            {tournament.name ?? "Untitled tournament"}
          </option>
        ))}
      </select>
    </AdminField>
  )
}

function TeamTextField({
  label,
  name,
  value,
}: {
  label: string
  name: string
  value?: string | null
  teamNames: string[]
}) {
  return (
    <AdminField label={label}>
      <input
        name={name}
        list="admin-team-names"
        defaultValue={value ?? ""}
        required
        className={inputClassName}
      />
    </AdminField>
  )
}

function TeamNameDatalist({ teamNames }: { teamNames: string[] }) {
  return (
    <datalist id="admin-team-names">
      {teamNames.map((teamName) => (
        <option key={teamName} value={teamName} />
      ))}
    </datalist>
  )
}

function StatusSelect({ value }: { value?: string | null }) {
  return (
    <AdminField label="Status">
      <select name="status" defaultValue={normalizeStatus(value)} className={inputClassName}>
        <option value="upcoming">Upcoming</option>
        <option value="live">Live</option>
        <option value="finished">Finished</option>
      </select>
    </AdminField>
  )
}

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <div className="sm:col-span-2">
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-xl bg-emerald-300 px-4 py-3 font-medium text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
      >
        {label}
      </button>
    </div>
  )
}

function DeleteForm({
  action,
  id,
}: {
  action: (formData: FormData) => Promise<void>
  id: string
}) {
  return (
    <form action={action} className="self-end">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10"
      >
        Delete
      </button>
    </form>
  )
}

function TeamPanel({
  teams,
  tournaments,
  fetchError,
  feedback,
}: {
  teams: AdminTeam[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: {
    tone: "success" | "error"
    message: string
  } | null
}) {
  const tournamentNames = new Map(
    tournaments.map((tournament) => [tournament.id, tournament.name ?? "Untitled tournament"]),
  )

  return (
    <AdminPanel
      id="teams"
      title="Teams"
      description="Create, update, and remove teams linked to tournaments in Supabase."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="teams"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create team</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Adds a real team row to <code>public.teams</code>.
          </p>

          <TeamForm
            action={createTeam}
            submitLabel="Create team"
            tournaments={tournaments}
          />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing teams</h3>

          {teams.length === 0 ? (
            <EmptyState>No teams exist in Supabase yet.</EmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {teams.map((team) => (
                <TeamRecord
                  key={team.id}
                  team={team}
                  tournaments={tournaments}
                  tournamentName={
                    team.tournament_id
                      ? tournamentNames.get(team.tournament_id) ?? "Unknown tournament"
                      : "Unassigned"
                  }
                />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminPanel>
  )
}

function PlayerPanel({
  players,
  tournaments,
  fetchError,
  feedback,
}: {
  players: AdminPlayer[]
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: Feedback | null
}) {
  const tournamentNames = createTournamentNameMap(tournaments)
  return (
    <AdminPanel
      id="players"
      title="Players"
      description="Create, update, and remove individual tournament players."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="players"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create player</h3>
          <PlayerForm action={createPlayer} submitLabel="Create player" tournaments={tournaments} />
        </article>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing players</h3>
          {players.length === 0 ? (
            <EmptyState>No players exist in Supabase yet.</EmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {players.map((player) => (
                <details key={player.id} className={recordClassName}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="break-words font-medium">{player.nickname || player.name || "Untitled player"}</h4>
                        <p className="mt-1 break-words text-sm text-white/55">
                          {player.tournament_id
                            ? tournamentNames.get(player.tournament_id) ?? "Unknown tournament"
                            : "Unassigned"}
                        </p>
                      </div>
                      <span className={pillClassName}>Seed {player.seed ?? "—"}</span>
                    </div>
                  </summary>
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                      <PlayerForm action={updatePlayer} submitLabel="Save changes" tournaments={tournaments} player={player} />
                      <DeleteForm action={deletePlayer} id={player.id} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminPanel>
  )
}

function PlayerForm({
  action,
  submitLabel,
  tournaments,
  player,
}: {
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  tournaments: AdminTournament[]
  player?: AdminPlayer
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {player && <input type="hidden" name="id" value={player.id} />}
      <TournamentSelect tournaments={tournaments} value={player?.tournament_id} />
      <AdminField label="Name">
        <input name="name" defaultValue={player?.name ?? ""} required className={inputClassName} />
      </AdminField>
      <AdminField label="Nickname">
        <input name="nickname" defaultValue={player?.nickname ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Seed">
        <input name="seed" type="number" min={1} step={1} defaultValue={player?.seed ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Wins">
        <input name="wins" type="number" min={0} step={1} defaultValue={player?.wins ?? 0} required className={inputClassName} />
      </AdminField>
      <AdminField label="Losses">
        <input name="losses" type="number" min={0} step={1} defaultValue={player?.losses ?? 0} required className={inputClassName} />
      </AdminField>
      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}

function TeamRecord({
  team,
  tournaments,
  tournamentName,
}: {
  team: AdminTeam
  tournaments: AdminTournament[]
  tournamentName: string
}) {
  return (
    <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{team.name ?? "Untitled team"}</h4>
            <p className="mt-1 break-words text-sm text-white/55">{tournamentName}</p>
          </div>

          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/65">
            Seed {team.seed ?? "—"}
          </span>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TeamForm
            action={updateTeam}
            submitLabel="Save changes"
            tournaments={tournaments}
            team={team}
          />

          <form action={deleteTeam} className="self-end">
            <input type="hidden" name="id" value={team.id} />
            <button
              type="submit"
              className="w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </details>
  )
}

function TeamForm({
  action,
  submitLabel,
  tournaments,
  team,
}: {
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  tournaments: AdminTournament[]
  team?: AdminTeam
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {team && <input type="hidden" name="id" value={team.id} />}

      <AdminField label="Tournament">
        <select
          name="tournament_id"
          defaultValue={team?.tournament_id ?? ""}
          required
          className={inputClassName}
        >
          <option value="" disabled>
            Select tournament
          </option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name ?? "Untitled tournament"}
            </option>
          ))}
        </select>
      </AdminField>

      <AdminField label="Name">
        <input
          name="name"
          defaultValue={team?.name ?? ""}
          required
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Seed">
        <input
          name="seed"
          type="number"
          min={1}
          step={1}
          defaultValue={team?.seed ?? ""}
          required
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Wins">
        <input
          name="wins"
          type="number"
          min={0}
          step={1}
          defaultValue={team?.wins ?? 0}
          required
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Losses">
        <input
          name="losses"
          type="number"
          min={0}
          step={1}
          defaultValue={team?.losses ?? 0}
          required
          className={inputClassName}
        />
      </AdminField>

      <SubmitButton label={submitLabel} disabled={tournaments.length === 0} />
    </form>
  )
}

function TournamentPanel({
  tournaments,
  fetchError,
  feedback,
}: {
  tournaments: AdminTournament[]
  fetchError: string | null
  feedback: {
    tone: "success" | "error"
    message: string
  } | null
}) {
  return (
    <AdminPanel
      id="tournaments"
      title="Tournaments"
      description="Create, update, and remove tournaments stored in Supabase."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="tournaments"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create tournament</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Adds a real tournament row to <code>public.tournaments</code>.
          </p>

          <TournamentForm action={createTournament} submitLabel="Create tournament" />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing tournaments</h3>

          {tournaments.length === 0 ? (
            <EmptyState>No tournaments exist in Supabase yet.</EmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {tournaments.map((tournament) => (
                <TournamentRecord key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminPanel>
  )
}

function TournamentRecord({ tournament }: { tournament: AdminTournament }) {
  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{tournament.name ?? "Untitled tournament"}</h4>
            <p className="mt-1 break-words text-sm text-white/55">
              {tournament.game ?? "Unknown game"} · {formatDisplayDate(tournament.event_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/65">
              {formatStatus(tournament.status)}
            </span>
            {tournament.is_active && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
                Active
              </span>
            )}
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <dl className="grid gap-3 text-sm text-white/55 sm:grid-cols-2">
          <div>
            <dt className="text-white/35">Created</dt>
            <dd className="mt-1">{formatDisplayDateTime(tournament.created_at)}</dd>
          </div>
          <div>
            <dt className="text-white/35">Current team count</dt>
            <dd className="mt-1">{tournament.team_count ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/35">Match days</dt>
            <dd className="mt-1">{tournament.match_days ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <TournamentForm
            action={updateTournament}
            submitLabel="Save changes"
            tournament={tournament}
          />

          <form action={deleteTournament} className="self-end">
            <input type="hidden" name="id" value={tournament.id} />
            <button
              type="submit"
              className="w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </details>
  )
}

function TournamentForm({
  action,
  submitLabel,
  tournament,
}: {
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  tournament?: AdminTournament
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {tournament && <input type="hidden" name="id" value={tournament.id} />}

      <AdminField label="Name">
        <input
          name="name"
          defaultValue={tournament?.name ?? ""}
          required
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Game">
        <input
          name="game"
          defaultValue={tournament?.game ?? ""}
          required
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Event date">
        <input
          name="event_date"
          type="date"
          defaultValue={tournament?.event_date ?? ""}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Format">
        <input
          name="format"
          defaultValue={tournament?.format ?? ""}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Team count">
        <input
          name="team_count"
          type="number"
          min={1}
          step={1}
          defaultValue={tournament?.team_count ?? ""}
          required
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Match days">
        <input
          name="match_days"
          type="number"
          min={1}
          step={1}
          defaultValue={tournament?.match_days ?? 1}
          required
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Prize pool">
        <input
          name="prize_pool"
          defaultValue={tournament?.prize_pool ?? ""}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Status">
        <select
          name="status"
          defaultValue={normalizeStatus(tournament?.status)}
          className={inputClassName}
        >
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="finished">Finished</option>
        </select>
      </AdminField>

      <AdminField label="Arena title">
        <input
          name="arena_title"
          defaultValue={tournament?.arena_title ?? ""}
          className={inputClassName}
        />
      </AdminField>

      <AdminField label="Arena tags">
        <input
          name="arena_tags"
          defaultValue={tournament?.arena_tags?.join(", ") ?? ""}
          placeholder="PC Platform, 5v5 Format"
          className={inputClassName}
        />
      </AdminField>

      <div className="sm:col-span-2">
        <AdminField label="Arena description">
          <textarea
            name="arena_description"
            defaultValue={tournament?.arena_description ?? ""}
            rows={4}
            className={inputClassName}
          />
        </AdminField>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  )
}

function AdminField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-2 text-sm text-white/75">
      <span className="block">{label}</span>
      {children}
    </label>
  )
}

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none transition focus:border-emerald-300/60"

function getTournamentFeedback(searchParams?: {
  crudError?: string
  crudSuccess?: string
}) {
  if (searchParams?.crudSuccess === "created") {
    return { tone: "success" as const, message: "Tournament created." }
  }

  if (searchParams?.crudSuccess === "updated") {
    return { tone: "success" as const, message: "Tournament updated." }
  }

  if (searchParams?.crudSuccess === "deleted") {
    return { tone: "success" as const, message: "Tournament deleted." }
  }

  if (!searchParams?.crudError) {
    return null
  }

  const message =
    {
      "invalid-name": "Name must not be empty.",
      "invalid-game": "Game must not be empty.",
      "invalid-team-count": "Team count must be a number greater than 0.",
      "invalid-match-days": "Match days must be a number greater than 0.",
      "invalid-status": "Status must be upcoming, live, or finished.",
      "missing-id": "Tournament id is missing.",
      "admin-client-unavailable":
        "Tournament mutations require a server-only Supabase admin client.",
      "mutation-failed": "Tournament change could not be saved. Please try again.",
    }[searchParams.crudError] ?? "Tournament change could not be saved."

  return { tone: "error" as const, message }
}

function getActiveTournamentFeedback(searchParams?: {
  activeError?: string
  activeSuccess?: string
}) {
  if (searchParams?.activeSuccess === "updated") {
    return { tone: "success" as const, message: "Active tournament updated." }
  }

  if (!searchParams?.activeError) {
    return null
  }

  const message =
    {
      "missing-id": "Tournament id is missing.",
      "not-found": "Tournament could not be found.",
      "admin-client-unavailable":
        "Active tournament changes require a server-only Supabase admin client.",
      "mutation-failed": "Active tournament could not be updated. Please try again.",
    }[searchParams.activeError] ?? "Active tournament could not be updated."

  return { tone: "error" as const, message }
}

function getTeamFeedback(searchParams?: {
  teamError?: string
  teamSuccess?: string
}) {
  if (searchParams?.teamSuccess === "created") {
    return { tone: "success" as const, message: "Team created." }
  }

  if (searchParams?.teamSuccess === "updated") {
    return { tone: "success" as const, message: "Team updated." }
  }

  if (searchParams?.teamSuccess === "deleted") {
    return { tone: "success" as const, message: "Team deleted." }
  }

  if (!searchParams?.teamError) {
    return null
  }

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-team-name": "Team name must not be empty.",
      "invalid-seed": "Seed must be a positive integer.",
      "invalid-wins": "Wins must be an integer greater than or equal to 0.",
      "invalid-losses": "Losses must be an integer greater than or equal to 0.",
      "missing-id": "Team id is missing.",
      "admin-client-unavailable":
        "Team mutations require a server-only Supabase admin client.",
      "mutation-failed": "Team change could not be saved. Please try again.",
    }[searchParams.teamError] ?? "Team change could not be saved."

  return { tone: "error" as const, message }
}

function getPlayerFeedback(searchParams?: {
  playerError?: string
  playerSuccess?: string
}) {
  if (searchParams?.playerSuccess === "created") return { tone: "success" as const, message: "Player created." }
  if (searchParams?.playerSuccess === "updated") return { tone: "success" as const, message: "Player updated." }
  if (searchParams?.playerSuccess === "deleted") return { tone: "success" as const, message: "Player deleted." }
  if (!searchParams?.playerError) return null
  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-player-name": "Player name must not be empty.",
      "invalid-player-seed": "Seed must be a positive integer when provided.",
      "invalid-wins": "Wins must be an integer greater than or equal to 0.",
      "invalid-losses": "Losses must be an integer greater than or equal to 0.",
      "missing-id": "Player id is missing.",
      "admin-client-unavailable": "Player mutations require a server-only Supabase admin client.",
      "mutation-failed": "Player change could not be saved. Please try again.",
    }[searchParams.playerError] ?? "Player change could not be saved."
  return { tone: "error" as const, message }
}

function getMatchFeedback(searchParams?: {
  matchError?: string
  matchSuccess?: string
}) {
  if (searchParams?.matchSuccess === "created") {
    return { tone: "success" as const, message: "Match created." }
  }
  if (searchParams?.matchSuccess === "updated") {
    return { tone: "success" as const, message: "Match updated." }
  }
  if (searchParams?.matchSuccess === "deleted") {
    return { tone: "success" as const, message: "Match deleted." }
  }
  if (!searchParams?.matchError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-team1": "Team 1 must not be empty.",
      "invalid-team2": "Team 2 must not be empty.",
      "duplicate-match-teams": "Team 1 and Team 2 must be different.",
      "invalid-score": "Scores must be whole numbers or left empty.",
      "invalid-status": "Status must be upcoming, live, or finished.",
      "invalid-match-order": "Match order must be a positive integer.",
      "invalid-participant-type": "Participant type must be team or player.",
      "missing-id": "Match id is missing.",
      "admin-client-unavailable":
        "Match mutations require a server-only Supabase admin client.",
      "mutation-failed": "Match change could not be saved. Please try again.",
    }[searchParams.matchError] ?? "Match change could not be saved."

  return { tone: "error" as const, message }
}

function getResultFeedback(searchParams?: {
  resultError?: string
  resultSuccess?: string
}) {
  if (searchParams?.resultSuccess === "created") {
    return { tone: "success" as const, message: "Result created." }
  }
  if (searchParams?.resultSuccess === "updated") {
    return { tone: "success" as const, message: "Result updated." }
  }
  if (searchParams?.resultSuccess === "deleted") {
    return { tone: "success" as const, message: "Result deleted." }
  }
  if (!searchParams?.resultError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-result-team": "Team must not be empty.",
      "invalid-placement": "Placement must be a positive integer.",
      "invalid-participant-type": "Participant type must be team or player.",
      "missing-id": "Result id is missing.",
      "admin-client-unavailable":
        "Result mutations require a server-only Supabase admin client.",
      "mutation-failed": "Result change could not be saved. Please try again.",
    }[searchParams.resultError] ?? "Result change could not be saved."

  return { tone: "error" as const, message }
}

function normalizeStatus(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase()

  return normalized === "live" || normalized === "finished" ? normalized : "upcoming"
}

function formatStatus(status: string | null) {
  const normalized = normalizeStatus(status)

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const formatDisplayDate = formatShortEventDate

function formatDisplayDateTime(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

type Feedback = {
  tone: "success" | "error"
  message: string
}

const panelClassName = "rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
const panelGridClassName =
  "mt-6 grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]"
const innerPanelClassName = "rounded-2xl border border-white/10 bg-black/20 p-4"
const recordClassName = "rounded-2xl border border-white/10 bg-white/[0.02] p-4"
const pillClassName =
  "max-w-full break-words rounded-full border border-white/10 px-2.5 py-1 text-white/65"

function AdminPanel({
  id,
  title,
  description,
  feedback,
  fetchError,
  fetchLabel,
  children,
}: {
  id: string
  title: string
  description: string
  feedback: Feedback | null
  fetchError: string | null
  fetchLabel: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={panelClassName}>
      <PanelHeader title={title} description={description} />
      <FeedbackBlock feedback={feedback} />
      <FetchError message={fetchError} label={fetchLabel} />
      {children}
    </section>
  )
}

function PanelHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/70">
        Live module
      </p>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-white/60">{description}</p>
    </div>
  )
}

function FeedbackBlock({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null

  return (
    <div
      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
        feedback.tone === "success"
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          : "border-red-300/20 bg-red-300/10 text-red-100"
      }`}
    >
      {feedback.message}
    </div>
  )
}

function FetchError({
  message,
  label,
}: {
  message: string | null
  label: string
}) {
  if (!message) return null

  return (
    <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
      Unable to load {label} from Supabase: {message}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-white/55">
      {children}
    </p>
  )
}

function createTournamentNameMap(tournaments: AdminTournament[]) {
  return new Map(
    tournaments.map((tournament) => [tournament.id, tournament.name ?? "Untitled tournament"]),
  )
}

function getTeamNames(teams: AdminTeam[]) {
  return Array.from(
    new Set(
      teams
        .map((team) => team.name?.trim())
        .filter((teamName): teamName is string => Boolean(teamName)),
    ),
  ).sort((left, right) => left.localeCompare(right))
}

function getPlayerNames(players: AdminPlayer[]) {
  return Array.from(
    new Set(
      players.flatMap((player) => [player.nickname?.trim(), player.name?.trim()]).filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right))
}
