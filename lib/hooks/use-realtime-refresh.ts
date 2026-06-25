"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

type RealtimeRefreshOptions = {
  /** Postgres tables to subscribe to (defaults to ["matches"]). */
  tables?: string[]
  /** Unique channel name; defaults to a name derived from the tables. */
  channel?: string
  /** Debounce window in ms to batch rapid changes (default 400ms). */
  debounceMs?: number
  /** Disable the subscription entirely. */
  enabled?: boolean
  /** Optional callback fired right before the router refresh. */
  onChange?: () => void
}

/**
 * Subscribes to Supabase Realtime postgres_changes for the given tables and
 * calls router.refresh() (debounced) whenever a row changes. This re-runs the
 * server components that fetched the data, so any view using this hook stays
 * live without a manual reload.
 */
export function useRealtimeRefresh({
  tables = ["matches"],
  channel,
  debounceMs = 400,
  enabled = true,
  onChange,
}: RealtimeRefreshOptions = {}) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Unique channel name per mount avoids "cannot add callbacks after
    // subscribe()" when React remounts the effect and reuses a channel name.
    const baseName = channel ?? `realtime:${tables.join("-")}`
    const channelName = `${baseName}:${Math.random().toString(36).slice(2)}`

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange?.()
        router.refresh()
      }, debounceMs)
    }

    let ch: ReturnType<typeof supabase.channel> | null = null
    try {
      ch = supabase.channel(channelName)
      for (const table of tables) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          scheduleRefresh,
        )
      }
      ch.subscribe()
    } catch (err) {
      // Realtime is a non-critical enhancement — never let it crash the page.
      console.error("useRealtimeRefresh: failed to subscribe", err)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      try {
        if (ch) supabase.removeChannel(ch)
      } catch (err) {
        console.error("useRealtimeRefresh: failed to remove channel", err)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channel, debounceMs, tables.join(",")])
}