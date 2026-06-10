export type SupportedGame = "CS 2" | "Valorant" | "Dota2" | "Clash Royale" | "Fortnite" | "FC" | "Other"

export interface GameModeConfig {
  modeId: string
  name: string
  participantType: "player" | "team"
  teamSize: number
  substitutes: number
  matchFormats: string[]
  rosterLabel: string
}

export interface GameConfig {
  name: SupportedGame
  fullName: string
  scoreFormat: "rounds" | "maps" | "games" | "points" | "goals"
  mapPool: string[]
  modes: GameModeConfig[]
  defaultModeId: string
}

export const GAME_CONFIGS: Record<SupportedGame, GameConfig> = {
  "CS 2": {
    name: "CS 2",
    fullName: "Counter-Strike 2",
    scoreFormat: "rounds",
    mapPool: ["Mirage", "Inferno", "Nuke", "Anubis", "Ancient", "Overpass", "Vertigo"],
    defaultModeId: "1v1",
    modes: [
      {
        modeId: "1v1",
        name: "1v1 Aim",
        participantType: "player",
        teamSize: 1,
        substitutes: 0,
        matchFormats: ["BO1", "BO3", "BO5"],
        rosterLabel: "Player (1v1)",
      },
      {
        modeId: "2v2",
        name: "2v2 Wingman",
        participantType: "team",
        teamSize: 2,
        substitutes: 0,
        matchFormats: ["BO1", "BO3", "BO5"],
        rosterLabel: "Team (2v2)",
      },
      {
        modeId: "5v5",
        name: "5v5 Classic",
        participantType: "team",
        teamSize: 5,
        substitutes: 2,
        matchFormats: ["BO1", "BO3", "BO5"],
        rosterLabel: "Team (5v5)",
      },
    ],
  },
  Valorant: {
    name: "Valorant",
    fullName: "Valorant",
    scoreFormat: "rounds",
    mapPool: ["Bind", "Haven", "Split", "Ascent", "Icebox", "Breeze", "Sunset"],
    defaultModeId: "5v5",
    modes: [
      {
        modeId: "5v5",
        name: "5v5 Classic",
        participantType: "team",
        teamSize: 5,
        substitutes: 1,
        matchFormats: ["BO1", "BO3", "BO5"],
        rosterLabel: "Team (5v5)",
      },
    ],
  },
  Dota2: {
    name: "Dota2",
    fullName: "Dota 2",
    scoreFormat: "maps",
    mapPool: [],
    defaultModeId: "5v5",
    modes: [
      {
        modeId: "5v5",
        name: "5v5 Classic",
        participantType: "team",
        teamSize: 5,
        substitutes: 1,
        matchFormats: ["BO1", "BO3", "BO5"],
        rosterLabel: "Team (5v5)",
      },
    ],
  },
  "Clash Royale": {
    name: "Clash Royale",
    fullName: "Clash Royale",
    scoreFormat: "games",
    mapPool: [],
    defaultModeId: "1v1",
    modes: [
      {
        modeId: "1v1",
        name: "1v1 Arena",
        participantType: "player",
        teamSize: 1,
        substitutes: 0,
        matchFormats: ["BO3", "BO5"],
        rosterLabel: "Player (1v1)",
      },
    ],
  },
  Fortnite: {
    name: "Fortnite",
    fullName: "Fortnite",
    scoreFormat: "points",
    mapPool: [],
    defaultModeId: "1v1",
    modes: [
      {
        modeId: "1v1",
        name: "Solo Arena",
        participantType: "player",
        teamSize: 1,
        substitutes: 0,
        matchFormats: ["BO1", "BO3", "Points"],
        rosterLabel: "Player (1v1)",
      },
    ],
  },
  FC: {
    name: "FC",
    fullName: "EA Sports FC",
    scoreFormat: "goals",
    mapPool: [],
    defaultModeId: "1v1",
    modes: [
      {
        modeId: "1v1",
        name: "1v1 Match",
        participantType: "player",
        teamSize: 1,
        substitutes: 0,
        matchFormats: ["BO1", "BO2", "BO3"],
        rosterLabel: "Player (1v1)",
      },
    ],
  },
  Other: {
    name: "Other",
    fullName: "Other Game",
    scoreFormat: "rounds",
    mapPool: [],
    defaultModeId: "5v5",
    modes: [
      {
        modeId: "5v5",
        name: "5v5 Classic",
        participantType: "team",
        teamSize: 5,
        substitutes: 2,
        matchFormats: ["BO1", "BO3", "BO5"],
        rosterLabel: "Team (5v5)",
      },
    ],
  },
}

export function normalizeGame(game: string | null | undefined): SupportedGame {
  if (!game) return "Other"
  const clean = game.trim().toLowerCase()

  if (clean === "cs2" || clean === "counter-strike 2" || clean === "counterstrike2" || clean === "cs 2") {
    return "CS 2"
  }
  if (clean === "valorant") {
    return "Valorant"
  }
  if (clean === "dota2" || clean === "dota 2" || clean === "dota") {
    return "Dota2"
  }
  if (clean === "clash royale" || clean === "clashroyale") {
    return "Clash Royale"
  }
  if (clean === "fortnite") {
    return "Fortnite"
  }
  if (clean === "fc" || clean === "ea sports fc" || clean === "ea fc" || clean === "fifa") {
    return "FC"
  }
  if (clean === "other") {
    return "Other"
  }

  // Exact match search if user entered it with proper casing
  const keys = Object.keys(GAME_CONFIGS) as SupportedGame[]
  const found = keys.find((k) => k.toLowerCase() === clean)
  if (found) return found

  return "Other"
}

export function getDisplayGameName(game: string | null | undefined): string | null {
  return game ? normalizeGame(game) : null
}

export type ResolvedGameConfig = Omit<GameConfig, "name"> & GameModeConfig & {
  gameName: SupportedGame
}

export function getGameConfig(
  game: string | null | undefined,
  mode?: string | null
): ResolvedGameConfig {
  const norm = normalizeGame(game)
  const base = GAME_CONFIGS[norm]
  
  const selectedModeId = mode || base.defaultModeId
  const modeConfig = base.modes.find((m) => m.modeId === selectedModeId) || base.modes.find((m) => m.modeId === base.defaultModeId)!
  
  const { name: _name, ...restBase } = base
  
  return {
    ...restBase,
    ...modeConfig,
    gameName: norm,
  }
}

export function getSupportedGames(): SupportedGame[] {
  return ["CS 2", "Valorant", "Dota2", "Clash Royale", "Fortnite", "FC", "Other"]
}
