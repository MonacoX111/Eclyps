import "server-only"

export type BracketCheckInMode = "all-approved" | "checked-in-only"

export type BracketEligibleRegistration = {
  participant_id: string | null
  check_in_status?: "not_checked_in" | "checked_in" | string | null
}

export function getBracketEligibleParticipantIds({
  registrations,
  checkInMode = "all-approved",
}: {
  registrations: BracketEligibleRegistration[]
  checkInMode?: BracketCheckInMode
}) {
  return registrations
    .filter((registration) => {
      if (!registration.participant_id) return false
      return checkInMode === "checked-in-only"
        ? registration.check_in_status === "checked_in"
        : true
    })
    .map((registration) => registration.participant_id as string)
}
