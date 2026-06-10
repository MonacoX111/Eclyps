export type ParticipantType = "team" | "player"

export type ParticipantReference = {
  id: string | null
  display_name: string | null
  participant_type: ParticipantType
  avatar_url: string | null
  logo_url: string | null
}

export function readParticipantReference(
  value: unknown,
  fallbackType: ParticipantType,
): ParticipantReference | null {
  const row = Array.isArray(value) ? value[0] : value

  if (typeof row !== "object" || row === null) {
    return null
  }

  const record = row as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id : null
  const displayName =
    typeof record.display_name === "string" && record.display_name.trim().length > 0
      ? record.display_name.trim()
      : null

  if (!id && !displayName) {
    return null
  }

  return {
    id,
    display_name: displayName,
    participant_type: record.participant_type === "player" ? "player" : fallbackType,
    avatar_url: typeof record.avatar_url === "string" ? record.avatar_url : null,
    logo_url: typeof record.logo_url === "string" ? record.logo_url : null,
  }
}

export function resolveParticipantName(
  participant: ParticipantReference | null | undefined,
  legacyName: string | null,
) {
  return participant?.display_name ?? legacyName
}
