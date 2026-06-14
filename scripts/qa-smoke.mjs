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

function assertNotContains(name, content, forbidden) {
  if (content.includes(forbidden)) {
    failures.push(`${name}: must not contain "${forbidden}"`)
  }
}

function assertMatches(name, content, pattern) {
  if (!pattern.test(content)) {
    failures.push(`${name}: missing pattern ${pattern}`)
  }
}

function assertFileMissing(relativePath) {
  if (existsSync(join(root, relativePath))) {
    failures.push(`${relativePath}: file should be removed`)
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

function assertNoForbiddenContent(relativePaths, forbiddenValues) {
  for (const relativePath of relativePaths) {
    const content = read(relativePath)
    for (const forbidden of forbiddenValues) {
      assertNotContains(relativePath, content, forbidden)
    }
  }
}

function assertNoClientSecretReferences(relativePaths) {
  const secretEnvNames = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_SESSION_SECRET",
  ]

  for (const relativePath of relativePaths) {
    const content = read(relativePath)
    if (!content.startsWith("\"use client\"\n") && !content.startsWith("'use client'\n")) {
      continue
    }

    for (const secretEnvName of secretEnvNames) {
      if (content.includes(secretEnvName)) {
        failures.push(`${relativePath}: client component references server-only env ${secretEnvName}`)
      }
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

const aiRemovedFiles = [
  "components/ai-chat.tsx",
  "app/api/ai-assistant/route.ts",
  "app/api/ai-chat/route.ts",
  "lib/ai/context.ts",
]
for (const relativePath of aiRemovedFiles) {
  assertFileMissing(relativePath)
}

const aiScanFiles = [
  "app/layout.tsx",
  "lib/i18n/translations.ts",
  "package.json",
  "package-lock.json",
  "README.md",
  ".env.example",
]
assertNoForbiddenContent(aiScanFiles, [
  "AiChat",
  "aiChat",
  "ai-assistant",
  "ai-chat",
  "@google/genai",
  "GEMINI_API_KEY",
  "buildAiLiveContext",
])

const nextConfig = read("next.config.mjs")
assertContains("security headers include nosniff", nextConfig, "X-Content-Type-Options")
assertContains("security headers include frame protection", nextConfig, "X-Frame-Options")
assertContains("security headers include referrer policy", nextConfig, "Referrer-Policy")
assertContains("security headers include permissions policy", nextConfig, "Permissions-Policy")
assertContains("production security headers include HSTS", nextConfig, "Strict-Transport-Security")
assertContains("admin routes are noindex/no-store", nextConfig, 'source: "/admin/:path*"')
assertContains("account routes are noindex/no-store", nextConfig, 'source: "/account/:path*"')
assertContains("auth routes are noindex/no-store", nextConfig, 'source: "/auth/:path*"')

const envExample = read(".env.example")
assertContains("env example includes Supabase URL", envExample, "NEXT_PUBLIC_SUPABASE_URL=")
assertContains("env example includes Supabase anon key", envExample, "NEXT_PUBLIC_SUPABASE_ANON_KEY=")
assertContains("env example includes service role key", envExample, "SUPABASE_SERVICE_ROLE_KEY=")
assertContains("env example includes admin hash", envExample, "ADMIN_PASSWORD_HASH=")
assertContains("env example includes session secret", envExample, "ADMIN_SESSION_SECRET=")
assertNotContains("env example has no AI key", envExample, "GEMINI")

const deploymentChecklist = read("docs/deployment-checklist.md")
assertContains("deployment checklist covers Vercel env", deploymentChecklist, "Vercel production settings")
assertContains("deployment checklist covers Supabase redirects", deploymentChecklist, "Supabase Auth redirect URLs")
assertContains("deployment checklist covers smoke tests", deploymentChecklist, "Production smoke test")
assertContains("deployment checklist covers rollback", deploymentChecklist, "Rollback trigger")

const sourceFiles = ["app", "components", "lib"]
  .flatMap(listFiles)
  .filter((file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file))
assertNoConsoleLog(sourceFiles)
assertNoClientSecretReferences(sourceFiles)

if (failures.length > 0) {
  console.error("QA smoke checks failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("QA smoke checks passed.")
