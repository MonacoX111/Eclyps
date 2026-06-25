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

    const channelName = channel ?? `realtime:${tables.join("-")}`
    const ch = supabase.channel(channelName)

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange?.()
        router.refresh()
      }, debounceMs)
    }

    for (const table of tables) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      )
    }

    ch.subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channel, debounceMs, tables.join(",")])
}