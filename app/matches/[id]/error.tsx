"use client"

import { RouteStatusPage } from "@/components/route-status-page"

export default function MatchError({ reset }: { reset: () => void }) {
  return <RouteStatusPage kind="error" subject="match" reset={reset} />
}
