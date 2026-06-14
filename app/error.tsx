"use client"

import { RouteStatusPage } from "@/components/route-status-page"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteStatusPage kind="error" reset={reset} />
}
