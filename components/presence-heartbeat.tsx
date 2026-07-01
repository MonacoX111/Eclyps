"use client"

import { useEffect } from "react"
import { updateMyLastSeen } from "@/app/actions/friends"

/**
 * Heartbeat that pings the server every 60s to update the current user's
 * last_seen timestamp. Used to power the online-status dot next to friends.
 * Also fires immediately on mount, and once when the tab becomes visible again.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false

    const ping = () => {
      if (cancelled) return
      updateMyLastSeen().catch(() => {})
    }

    ping()
    const interval = setInterval(ping, 60_000)

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return null
}
