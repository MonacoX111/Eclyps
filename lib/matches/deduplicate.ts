export type MatchDeduplicationItem = {
  id: string
  tournament_id: string | null
  participant_type: string | null
  participant_1_id: string | null
  participant_2_id: string | null
  team1: string | null
  team2: string | null
  bracket_id: string | null
}

export function getCanonicalMatches<T extends MatchDeduplicationItem>(
  matches: T[],
) {
  const bracketPairKeys = new Set(
    matches
      .filter((match) => Boolean(match.bracket_id))
      .map(getMatchPairKey)
      .filter((key): key is string => Boolean(key)),
  )

  return matches.filter((match) => {
    if (match.bracket_id) return true

    const key = getMatchPairKey(match)
    return !key || !bracketPairKeys.has(key)
  })
}

export function getHiddenManualDuplicateMatches<T extends MatchDeduplicationItem>(
  matches: T[],
) {
  const bracketPairKeys = new Set(
    matches
      .filter((match) => Boolean(match.bracket_id))
      .map(getMatchPairKey)
      .filter((key): key is string => Boolean(key)),
  )

  return matches.filter((match) => {
    if (match.bracket_id) return false

    const key = getMatchPairKey(match)
    return Boolean(key && bracketPairKeys.has(key))
  })
}

function getMatchPairKey(match: MatchDeduplicationItem) {
  const tournamentId = normalizeToken(match.tournament_id)
  if (!tournamentId) return null

  const participantType = normalizeToken(match.participant_type) ?? "team"
  const participantPair = getSortedPair(
    normalizeToken(match.participant_1_id),
    normalizeToken(match.participant_2_id),
  )

  if (participantPair) {
    return `${tournamentId}:${participantType}:participants:${participantPair.join("|")}`
  }

  const namePair = getSortedPair(normalizeName(match.team1), normalizeName(match.team2))
  if (!namePair) return null

  return `${tournamentId}:${participantType}:names:${namePair.join("|")}`
}

function getSortedPair(left: string | null, right: string | null) {
  if (!left || !right) return null
  return [left, right].sort()
}

function normalizeToken(value: string | null) {
  return value?.trim() || null
}

function normalizeName(value: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ")
  if (!normalized || normalized === "tbd") return null

  return normalized
}
