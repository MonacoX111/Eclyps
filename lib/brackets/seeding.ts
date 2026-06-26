import { BRACKET_SIZES, type BracketSize, type BracketTemplateMatch } from "@/lib/brackets/template"

export type SeedMethod = "rating" | "random"

export type SeedableParticipant = {
  id: string
  displayName: string
  /** Lower seed value = stronger. Null seeds are treated as weakest. */
  seed: number | null
}

/** Smallest supported bracket size that fits the given participant count. */
export function nextBracketSize(count: number): BracketSize | null {
  for (const size of BRACKET_SIZES) {
    if (size >= count) return size
  }
  return null
}

/**
 * Standard single-elimination seed order for a bracket of `size` slots.
 * Returns an array of seed numbers (1..size) in physical slot order so that
 * seed 1 and seed 2 can only meet in the final.
 * e.g. size 8 -> [1, 8, 5, 4, 3, 6, 7, 2]
 */
export function standardSeedOrder(size: number): number[] {
  let order = [1, 2]
  while (order.length < size) {
    const sum = order.length * 2 + 1
    const next: number[] = []
    for (const seed of order) {
      next.push(seed)
      next.push(sum - seed)
    }
    order = next
  }
  return order
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Order participants by the chosen seeding method.
 *   rating -> sorted by their seed value (1 = strongest); ties / nulls keep
 *             a stable, then alphabetical order.
 *   random -> shuffled draw.
 * The returned array is ordinal: index 0 becomes seed #1, index 1 -> seed #2, …
 */
export function orderParticipants(
  participants: SeedableParticipant[],
  method: SeedMethod,
): SeedableParticipant[] {
  if (method === "random") return shuffle(participants)
  return [...participants].sort((a, b) => {
    const sa = a.seed ?? Number.POSITIVE_INFINITY
    const sb = b.seed ?? Number.POSITIVE_INFINITY
    if (sa !== sb) return sa - sb
    return a.displayName.localeCompare(b.displayName)
  })
}

export type FilledBracketMatch = Omit<
  BracketTemplateMatch,
  "team1" | "team2" | "participant_1_id" | "participant_2_id" | "winner_participant_id" | "status"
> & {
  team1: string | null
  team2: string | null
  participant_1_id: string | null
  participant_2_id: string | null
  winner_participant_id: string | null
  status: "upcoming" | "finished"
}

export type SeededBracketResult = {
  matches: FilledBracketMatch[]
  byeCount: number
}

/**
 * Fill the round-1 slots of a freshly-created bracket template with the given
 * participants (already template-shaped). Resolves byes by auto-advancing the
 * lone participant into the next round. Mutates copies — returns new matches.
 */
export function seedRoundOne(
  templateMatches: BracketTemplateMatch[],
  participants: SeedableParticipant[],
  method: SeedMethod,
  bracketSize: BracketSize,
): SeededBracketResult {
  // Work on shallow copies so we can safely set the filled fields.
  const matches: FilledBracketMatch[] = templateMatches.map((m) => ({ ...m }))

  const ordered = orderParticipants(participants, method)
  // seedNumber (1-based) -> participant or undefined (bye)
  const bySeed = new Map<number, SeedableParticipant>()
  ordered.forEach((p, index) => bySeed.set(index + 1, p))

  const slotOrder = standardSeedOrder(bracketSize) // length = bracketSize

  const roundOne = matches
    .filter((m) => m.round_order === 1)
    .sort((a, b) => a.bracket_position - b.bracket_position)

  const byId = new Map(matches.map((m) => [m.id, m]))
  let byeCount = 0

  roundOne.forEach((match, matchIndex) => {
    const seed1 = slotOrder[matchIndex * 2]
    const seed2 = slotOrder[matchIndex * 2 + 1]
    const p1 = bySeed.get(seed1)
    const p2 = bySeed.get(seed2)

    if (p1) {
      match.participant_1_id = p1.id
      match.team1 = p1.displayName
    }
    if (p2) {
      match.participant_2_id = p2.id
      match.team2 = p2.displayName
    }

    // Bye handling: exactly one participant present -> auto-advance.
    const lone = p1 && !p2 ? p1 : !p1 && p2 ? p2 : null
    if (lone) {
      byeCount += 1
      match.winner_participant_id = lone.id
      match.status = "finished"
      if (match.next_match_id && match.next_match_slot) {
        const next = byId.get(match.next_match_id)
        if (next) {
          if (match.next_match_slot === 1) {
            next.participant_1_id = lone.id
            next.team1 = lone.displayName
          } else {
            next.participant_2_id = lone.id
            next.team2 = lone.displayName
          }
        }
      }
    }
  })

  return { matches, byeCount }
}