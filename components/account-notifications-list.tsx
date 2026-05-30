"use client"

import { useState } from "react"
import { Check, Calendar, UserCheck, ShieldAlert, Users, Bell, Inbox } from "lucide-react"
import { markNotificationAsRead, type NotificationRow } from "@/lib/notifications/actions"
import { useLanguage } from "@/components/language-provider"

type AccountNotificationsListProps = {
  initialNotifications: NotificationRow[]
}

export function AccountNotificationsList({ initialNotifications }: AccountNotificationsListProps) {
  const { t, lang } = useLanguage()
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications)

  const unreadNotifications = notifications.filter((n) => !n.read_at)

  const handleMarkAsRead = async (id: string) => {
    // Optimistic Update: immediately set read_at in local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )

    try {
      const res = await markNotificationAsRead(id)
      if (!res.ok) {
        console.error("Failed to mark notification as read:", res.error)
        // Revert local state or let next reload resolve it
      }
    } catch (err) {
      console.error("Unexpected error marking notification as read:", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    const unreadIds = unreadNotifications.map((n) => n.id)
    if (unreadIds.length === 0) return

    // Optimistic Update: immediately mark all as read locally
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n))
    )

    try {
      await Promise.all(unreadIds.map((id) => markNotificationAsRead(id)))
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "player_approved":
      case "registration_approved":
        return <UserCheck className="h-4 w-4 text-emerald-400" />
      case "player_rejected":
      case "registration_rejected":
        return <ShieldAlert className="h-4 w-4 text-rose-400" />
      case "team_approved":
        return <Users className="h-4 w-4 text-emerald-400" />
      case "team_rejected":
        return <Users className="h-4 w-4 text-rose-400" />
      case "match_scheduled":
        return <Calendar className="h-4 w-4 text-cyan-400" />
      default:
        return <Bell className="h-4 w-4 text-emerald-400" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-lg font-bold tracking-wide text-white">{t.account.notifications.latestTitle}</h3>
        {unreadNotifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
          >
            {t.account.notifications.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3.5 rounded-full bg-white/5 border border-white/5 text-white/20">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-white/80">{t.account.notifications.noNotifications}</span>
            <span className="text-xs text-white/40 max-w-48 mx-auto">{t.account.notifications.allCaughtUp}</span>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
          {notifications.map((notification) => {
            const isUnread = !notification.read_at
            return (
              <div
                key={notification.id}
                className={`flex gap-3 py-3.5 transition duration-200 relative ${
                  isUnread ? "bg-white/[0.01]" : ""
                }`}
              >
                {/* Type Icon */}
                <div className="mt-0.5 shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-white/5 border border-white/5">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Title & Message */}
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        isUnread ? "font-bold text-white" : "font-medium text-white/70"
                      }`}
                    >
                      {notification.title}
                    </span>
                    <span className="text-[9px] text-white/30 shrink-0">
                      {formatTimeAgo(notification.created_at, t, lang)}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed break-words pr-2">
                    {notification.message}
                  </p>
                </div>

                {/* Mark single as read button */}
                {isUnread && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-emerald-400 transition cursor-pointer"
                    title={t.account.notifications.markReadTooltip}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateStr: string, t: any, lang: string): string {
  try {
    const past = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - past.getTime()

    if (diffMs < 60000) return t.account.notifications.timeJustNow
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}${t.account.notifications.timeMinsAgo}`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}${t.account.notifications.timeHoursAgo}`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return t.account.notifications.timeYesterday
    if (diffDays < 7) return `${diffDays}${t.account.notifications.timeDaysAgo}`

    return past.toLocaleDateString(lang === "uk" ? "uk-UA" : "en-US", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}
