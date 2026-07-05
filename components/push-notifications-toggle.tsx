"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { savePushSubscription, removePushSubscription } from "@/app/actions/push"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function subscriptionToInput(sub: PushSubscription) {
  const json = sub.toJSON()
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  }
}

type Status = "unsupported" | "loading" | "off" | "on" | "denied"

export function PushNotificationsToggle() {
  const { t } = useLanguage()
  const [status, setStatus] = useState<Status>("loading")
  const [busy, setBusy] = useState(false)

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    let cancelled = false

    async function detect() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        !vapidKey
      ) {
        if (!cancelled) setStatus("unsupported")
        return
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied")
        return
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        const sub = await registration.pushManager.getSubscription()
        if (!cancelled) setStatus(sub ? "on" : "off")
      } catch {
        if (!cancelled) setStatus("unsupported")
      }
    }

    detect()
    return () => {
      cancelled = true
    }
  }, [vapidKey])

  const enable = useCallback(async () => {
    if (!vapidKey) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off")
        if (permission === "denied") toast.error(t.friends.pushDenied)
        return
      }
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }))
      const result = await savePushSubscription(subscriptionToInput(sub))
      if (result.ok) {
        setStatus("on")
        toast.success(t.friends.pushEnabled)
      } else {
        toast.error(t.friends.pushError)
      }
    } catch {
      toast.error(t.friends.pushError)
    } finally {
      setBusy(false)
    }
  }, [vapidKey, t])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus("off")
      toast.success(t.friends.pushDisabled)
    } catch {
      toast.error(t.friends.pushError)
    } finally {
      setBusy(false)
    }
  }, [t])

  if (status === "unsupported" || status === "loading") return null

  const isOn = status === "on"
  const isDenied = status === "denied"

  return (
    <button
      type="button"
      disabled={busy || isDenied}
      onClick={isOn ? disable : enable}
      title={isDenied ? t.friends.pushDeniedHint : undefined}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isOn
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80"
      }`}
      aria-pressed={isOn}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isOn ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isDenied
          ? t.friends.pushDeniedShort
          : isOn
            ? t.friends.pushOn
            : t.friends.pushOff}
      </span>
    </button>
  )
}
