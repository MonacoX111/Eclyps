import type { AdminPlayer } from "@/lib/admin/players"
import type { AdminTeam } from "@/lib/admin/teams"
import type { AdminTournament } from "@/lib/admin/tournaments"

export function createTournamentNameMap(tournaments: AdminTournament[]) {
  return new Map(
    tournaments.map((tournament) => [tournament.id, tournament.name ?? "Untitled tournament"]),
  )
}

export function getTeamNames(teams: AdminTeam[]) {
  return Array.from(
    new Set(
      teams
        .map((team) => team.name?.trim())
        .filter((teamName): teamName is string => Boolean(teamName)),
    ),
  ).sort((left, right) => left.localeCompare(right))
}

export function getPlayerNames(players: AdminPlayer[]) {
  return Array.from(
    new Set(
      players.flatMap((player) => [player.nickname?.trim(), player.name?.trim()]).filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right))
}
