import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const failures = []

function read(relativePath) {
  const absolutePath = join(root, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`)
    return ""
  }

  return readFileSync(absolutePath, "utf8")
}

function assertContains(name, content, expected) {
  if (!content.includes(expected)) {
    failures.push(`${name}: missing "${expected}"`)
  }
}

function assertMatches(name, content, pattern) {
  if (!pattern.test(content)) {
    failures.push(`${name}: missing pattern ${pattern}`)
  }
}

function assertNoConsoleLog(relativePaths) {
  for (const relativePath of relativePaths) {
    const content = read(relativePath)
    if (content.includes("console.log(")) {
      failures.push(`${relativePath}: remove console.log debug output`)
    }
  }
}

function listFiles(relativeDir) {
  const absoluteDir = join(root, relativeDir)
  const entries = readdirSync(absoluteDir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const relativePath = join(relativeDir, entry.name)
    return entry.isDirectory() ? listFiles(relativePath) : relativePath
  })
}

const tournamentActions = read("app/admin/actions/tournaments.ts")
assertContains("tournament deletion protects global players", tournamentActions, '.from("players")')
assertContains("tournament deletion protects global teams", tournamentActions, '.from("teams")')
assertContains("tournament deletion removes disputes", tournamentActions, '.from("match_disputes")')
assertContains("tournament deletion removes results", tournamentActions, '.from("results")')
assertContains("tournament deletion clears match chain", tournamentActions, "next_match_id: null")
assertContains("tournament deletion removes matches", tournamentActions, '.from("matches")')
assertContains("tournament deletion removes registration rosters", tournamentActions, '.from("tournament_registration_roster_entries")')
assertContains("tournament deletion removes registrations", tournamentActions, '.from("tournament_registrations")')
assertContains("tournament deletion removes participants", tournamentActions, '.from("participants")')

const cascadeMigration = read("supabase/migrations/202606101200_tournament_match_cascade_and_orphan_cleanup.sql")
assertMatches("matches cascade migration", cascadeMigration, /alter table matches[\s\S]*on delete cascade/i)
assertMatches("results cascade migration", cascadeMigration, /alter table results[\s\S]*on delete cascade/i)

const bracketActions = read("app/admin/actions/brackets.ts")
assertContains("bracket generation action exists", bracketActions, "export async function generateBracketTemplate")
assertContains("bracket template builder is used", bracketActions, "createBracketTemplateMatches")
assertContains("bracket chain validation exists", bracketActions, "hasValidNextMatchChain")
assertContains("bracket duplicate assignment guard exists", bracketActions, "duplicate-bracket-participant")
assertContains("bracket winner propagation exists", bracketActions, "syncBracketWinnerPropagation")
assertContains("bracket final result sync exists", bracketActions, "syncFinalBracketResults")
assertContains("bracket final sync marker exists", bracketActions, "BRACKET_FINAL_RESULT_NOTE_PREFIX")
assertContains("bracket final winner placement exists", bracketActions, "placement: 1")
assertContains("bracket final runner-up placement exists", bracketActions, "placement: 2")

const inviteActions = read("app/actions/invites.ts")
assertContains("team invite table is used", inviteActions, '.from("team_invites")')
assertContains("team invite accept action exists", inviteActions, "export async function acceptTeamInvite")
assertContains("team invite decline action exists", inviteActions, "export async function declineTeamInvite")
assertContains("team invite cancel action exists", inviteActions, "export async function cancelTeamInvite")
assertContains("team invite accepts status", inviteActions, 'status: "accepted"')
assertContains("team invite declines status", inviteActions, 'status: "declined"')
assertContains("team invite cancels status", inviteActions, 'status: "cancelled"')
assertContains("team invite ownership guard exists", inviteActions, "invited_user_profile_id !== userProfile.id")

const matchPage = read("app/matches/[id]/page.tsx")
assertContains("match page loads archived tournament detail", matchPage, "getTournamentArchiveDetail")
assertContains("match page loads archived bracket", matchPage, "getArchivedTournamentBracket")
assertContains("active match back link goes to matches", matchPage, '? "/matches"')
assertContains("archived match back link goes to tournament archive detail", matchPage, "`/tournaments/${match.tournament.id}`")
assertContains("match page renders bracket", matchPage, "<PublicBracket bracket={bracket}")

const sourceFiles = ["app", "components", "lib"]
  .flatMap(listFiles)
  .filter((file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file))
assertNoConsoleLog(sourceFiles)

if (failures.length > 0) {
  console.error("QA smoke checks failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("QA smoke checks passed.")
