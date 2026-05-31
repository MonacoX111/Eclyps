"use client"

import { useState } from "react"
import { Check, Calendar, UserCheck, ShieldAlert, Users, Bell, Inbox, ChevronRight } from "lucide-react"
import { markNotificationAsRead, type NotificationRow } from "@/lib/notifications/actions"
import { useLanguage } from "@/components/language-provider"
import { getLocalizedNotification } from "@/lib/notifications/localize"

type AccountNotificationsListProps = {
  initialNotifications: NotificationRow[]
}

export function AccountNotificationsList({ initialNotifications }: AccountNotificationsListProps) {
  console.log("AccountNotificationsList initialNotifications:", initialNotifications)
  const { t, lang } = useLanguage()
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications)
  const [showAll, setShowAll] = useState(false)

  const unreadNotifications = notifications.filter((n) => !n.read_at)
  const visibleNotifications = showAll ? notifications : notifications.slice(0, 5)

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
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold tracking-wide text-white">{t.account.notifications.latestTitle}</h3>
          {unreadNotifications.length > 0 && (
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              {unreadNotifications.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {notifications.length > 5 && (
            <button
              onClick={() => setShowAll((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-white/55 hover:text-white transition cursor-pointer"
            >
              {showAll ? t.account.notifications.viewLess : t.account.notifications.viewAll}
              <ChevronRight className={`h-3 w-3 transition ${showAll ? "rotate-90" : ""}`} />
            </button>
          )}
          {unreadNotifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            >
              {t.account.notifications.markAllRead}
            </button>
          )}
        </div>
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
        <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
          {visibleNotifications.map((notification) => {
            const isUnread = !notification.read_at
            const { title, message } = getLocalizedNotification(notification, lang)

            // Resolve logo URL from joined teams (supporting both object and array formats)
            let logoUrl: string | null = null
            if (notification.teams) {
              if (Array.isArray(notification.teams)) {
                logoUrl = notification.teams[0]?.logo_url || null
              } else {
                logoUrl = notification.teams.logo_url || null
              }
            }

            return (
              <div
                key={notification.id}
                className={`flex gap-3 py-3.5 transition duration-200 relative ${
                  isUnread ? "bg-white/[0.01]" : ""
                }`}
              >
                {/* Type Icon or Team Logo */}
                <div className="mt-0.5 shrink-0 flex items-center justify-center h-8 w-8 rounded-full overflow-hidden bg-white/5 border border-white/5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getNotificationIcon(notification.type)
                  )}
                </div>

                {/* Title & Message */}
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        isUnread ? "font-bold text-white" : "font-medium text-white/70"
                      }`}
                    >
                      {title}
                    </span>
                    <span className="text-[9px] text-white/30 shrink-0">
                      {formatTimeAgo(notification.created_at, t, lang)}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed break-words pr-2">
                    {message}
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
