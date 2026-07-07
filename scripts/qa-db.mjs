import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

const root = process.cwd()
const failures = []

loadEnvFile(".env.local")
loadEnvFile(".env")

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]

for (const key of requiredEnv) {
  if (!readEnv(key)) {
    failures.push(`Missing required env: ${key}`)
  }
}

assertFileExists("supabase/migrations/202607060100_tournament_formats_foundation.sql")
assertFileExists("supabase/migrations/202607060400_double_elimination_loser_paths.sql")
assertFileExists("supabase/migrations/202607060800_battle_royale_result_details.sql")
assertFileExists("supabase/migrations/202607070900_tournament_banner_url.sql")
assertFileExists("supabase/migrations/202607050000_push_subscriptions.sql")

if (failures.length === 0) {
  const supabase = createClient(
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const tableChecks = [
    ["tournaments", [
      "id",
      "participant_type",
      "tournament_format",
      "format_config",
      "banner_url",
    ]],
    ["participants", [
      "id",
      "tournament_id",
      "participant_type",
      "display_name",
      "seed",
      "source_team_id",
      "source_player_id",
    ]],
    ["matches", [
      "id",
      "tournament_id",
      "participant_type",
      "participant_1_id",
      "participant_2_id",
      "winner_participant_id",
      "bracket_id",
      "bracket_type",
      "bracket_status",
      "round_order",
      "bracket_round",
      "bracket_position",
      "next_match_id",
      "next_match_slot",
      "loser_next_match_id",
      "loser_next_match_slot",
    ]],
    ["results", [
      "id",
      "tournament_id",
      "participant_id",
      "participant_type",
      "team",
      "placement",
      "lobby_round",
      "lobby_order",
      "kills",
      "points",
    ]],
    ["push_subscriptions", [
      "id",
      "user_profile_id",
      "endpoint",
      "p256dh",
      "auth",
      "user_agent",
    ]],
  ]

  for (const [table, columns] of tableChecks) {
    await assertColumns(supabase, table, columns)
  }
}

if (failures.length > 0) {
  console.error("DB QA checks failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("DB QA checks passed.")

function loadEnvFile(relativePath) {
  const filePath = join(root, relativePath)
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match || match[1].startsWith("#")) continue
    if (process.env[match[1]]) continue

    let value = match[2].trim()
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

function readEnv(key) {
  const value = process.env[key]?.trim()
  return value && value.length > 0 ? value : ""
}

function assertFileExists(relativePath) {
  if (!existsSync(join(root, relativePath))) {
    failures.push(`Missing migration file: ${relativePath}`)
  }
}

async function assertColumns(supabase, table, columns) {
  const { error } = await supabase
    .from(table)
    .select(columns.join(", "))
    .limit(0)

  if (!error) return

  const hint = migrationHint(table, error.message)
  failures.push(
    `${table}: ${error.code ?? "UNKNOWN"} ${error.message}${hint ? ` (${hint})` : ""}`,
  )
}

function migrationHint(table, message) {
  if (table === "tournaments" || table === "matches") {
    if (message.includes("tournament_format") || message.includes("format_config")) {
      return "apply 202607060100_tournament_formats_foundation.sql"
    }
    if (message.includes("banner_url")) {
      return "apply 202607070900_tournament_banner_url.sql"
    }
    if (message.includes("loser_next_match")) {
      return "apply 202607060400_double_elimination_loser_paths.sql"
    }
  }

  if (table === "results") {
    if (
      message.includes("lobby_round") ||
      message.includes("lobby_order") ||
      message.includes("kills") ||
      message.includes("points")
    ) {
      return "apply 202607060800_battle_royale_result_details.sql"
    }
  }

  if (table === "push_subscriptions") {
    return "apply 202607050000_push_subscriptions.sql"
  }

  return ""
}
