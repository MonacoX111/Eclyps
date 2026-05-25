"use client"

import { PublicProfileError } from "@/components/public-profile-page"

export default function PlayerProfileError() {
  return <PublicProfileError message="Player profile data could not be loaded right now." kind="player" />
}
