"use client"

import { RouteStatusPage } from "@/components/route-status-page"

export default function NewsPostError({ reset }: { reset: () => void }) {
  return <RouteStatusPage kind="error" subject="news" reset={reset} />
}
