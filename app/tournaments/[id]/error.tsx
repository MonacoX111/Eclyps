"use client"

import { RouteStatusPage } from "@/components/route-status-page"

export default function TournamentError({ reset }: { reset: () => void }) {
  return <RouteStatusPage kind="error" subject="tournament" reset={reset} />
}
