export type ParticipantType = "team" | "player"

export type ParticipantReference = {
  id: string | null
  display_name: string | null
  participant_type: ParticipantType
}

export function resolveParticipantName(
  participant: ParticipantReference | null | undefined,
  legacyName: string | null,
) {
  return participant?.display_name ?? legacyName
}
