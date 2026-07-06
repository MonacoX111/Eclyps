import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import assert from "node:assert/strict"

const root = process.cwd()
const outDir = mkdtempSync(join(tmpdir(), "eclyps-engines-"))

const tsconfigPath = join(outDir, "tsconfig.engine-tests.json")
writeFileSync(tsconfigPath, JSON.stringify({
  extends: join(root, "tsconfig.json"),
  compilerOptions: {
    noEmit: false,
    outDir,
    rootDir: root,
    module: "NodeNext",
    moduleResolution: "NodeNext",
    target: "ES2022",
    types: ["node"],
    typeRoots: [join(root, "node_modules/@types")],
    declaration: false,
    incremental: false,
    tsBuildInfoFile: join(outDir, "tsconfig.tsbuildinfo"),
  },
  include: [
    join(root, "lib/tournament-formats.ts"),
    join(root, "lib/brackets/template.ts"),
    join(root, "lib/brackets/seeding.ts"),
    join(root, "lib/tournament-engine/**/*.ts"),
  ],
}, null, 2))

try {
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", tsconfigPath], {
    cwd: root,
    stdio: "pipe",
  })

  const require = createRequire(import.meta.url)
  const Module = require("node:module")
  const originalResolveFilename = Module._resolveFilename
  Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
    if (typeof request === "string" && request.startsWith("@/")) {
      return join(outDir, `${request.slice(2)}.js`)
    }
    return originalResolveFilename.call(this, request, parent, isMain, options)
  }

  const engine = require(join(outDir, "lib/tournament-engine/index.js"))
  const participants = Array.from({ length: 8 }, (_, index) => ({
    id: `p${index + 1}`,
    displayName: `Participant ${index + 1}`,
    seed: index + 1,
  }))

  assertEngine(engine.generateTournamentStructure({
    tournamentId: "t1",
    tournamentFormat: "single_elimination",
    participants,
    startingMatchOrder: 1,
    participantType: "team",
    seedMethod: "rating",
  }), "single elimination")

  assertEngine(engine.generateTournamentStructure({
    tournamentId: "t1",
    tournamentFormat: "double_elimination",
    participants,
    startingMatchOrder: 1,
    participantType: "team",
    seedMethod: "rating",
    config: { grand_final_reset: true },
  }), "double elimination")

  const roundRobin = assertEngine(engine.generateTournamentStructure({
    tournamentId: "t1",
    tournamentFormat: "round_robin",
    participants: participants.slice(0, 4),
    startingMatchOrder: 1,
    participantType: "team",
    seedMethod: "rating",
    config: { matches_per_opponent: 1 },
  }), "round robin")
  assert.equal(roundRobin.matches.length, 6)

  const swiss = assertEngine(engine.generateTournamentStructure({
    tournamentId: "t1",
    tournamentFormat: "swiss",
    participants: participants.slice(0, 5),
    startingMatchOrder: 1,
    participantType: "team",
    seedMethod: "rating",
    config: { swiss_rounds: 3, points_win: 3, points_draw: 1, points_loss: 0 },
  }), "swiss")
  assert.equal(swiss.matches.filter((match) => match.status === "finished").length, 1)

  const finishedSwissMatches = swiss.matches.map((match) => {
    if (!match.participant_2_id) return match
    return {
      ...match,
      status: "finished",
      score1: 1,
      score2: 0,
      winner_participant_id: match.participant_1_id,
    }
  })
  const nextSwiss = assertEngine(engine.generateNextSwissRound({
    tournamentId: "t1",
    participants: participants.slice(0, 5),
    matches: finishedSwissMatches,
    startingMatchOrder: 99,
    participantType: "team",
    config: { swiss_rounds: 3, points_win: 3, points_draw: 1, points_loss: 0 },
    bracketId: swiss.bracketId,
  }), "next swiss")
  assert.equal(nextSwiss.roundOrder, 2)

  const groups = assertEngine(engine.generateTournamentStructure({
    tournamentId: "t1",
    tournamentFormat: "groups_then_playoffs",
    participants,
    startingMatchOrder: 1,
    participantType: "team",
    seedMethod: "rating",
    config: { group_count: 2, advancing_per_group: 2, matches_per_opponent: 1, points_win: 3, points_draw: 1, points_loss: 0 },
  }), "groups")
  assert.equal(groups.matches.length, 12)

  const finishedGroupMatches = groups.matches.map((match) => ({
    ...match,
    status: "finished",
    score1: 1,
    score2: 0,
    winner_participant_id: match.participant_1_id,
  }))
  const playoffs = assertEngine(engine.generateGroupsPlayoffsBracket({
    tournamentId: "t1",
    participants,
    matches: finishedGroupMatches,
    startingMatchOrder: 99,
    participantType: "team",
    config: { group_count: 2, advancing_per_group: 2, matches_per_opponent: 1, points_win: 3, points_draw: 1, points_loss: 0 },
    bracketId: groups.bracketId,
  }), "groups playoffs")
  assert.equal(playoffs.advancers.length, 4)

  const battleRoyale = assertEngine(engine.generateTournamentStructure({
    tournamentId: "t1",
    tournamentFormat: "battle_royale",
    participants,
    startingMatchOrder: 1,
    participantType: "player",
    seedMethod: "rating",
    config: { lobby_size: 4, matches_per_opponent: 2 },
  }), "battle royale")
  assert.equal(battleRoyale.matches.length, 4)

  const leaderboard = engine.getBattleRoyaleLeaderboard(participants.slice(0, 2), [
    { participantId: "p1", roundOrder: 1, lobbyOrder: 1, placement: 1, kills: 3 },
    { participantId: "p2", roundOrder: 1, lobbyOrder: 1, placement: 2, kills: 5 },
  ], { scoring_model: "kills_and_placement" })
  assert.equal(leaderboard[0].participantId, "p2")
  assert.equal(leaderboard[0].kills, 5)

  console.log("Tournament engine tests passed.")
} finally {
  rmSync(outDir, { recursive: true, force: true })
}

function assertEngine(result, label) {
  assert.equal(result.ok, true, `${label} failed: ${result.error ?? "unknown"}`)
  assert.ok(result.data.matches.length > 0, `${label} generated no matches`)
  return result.data
}
