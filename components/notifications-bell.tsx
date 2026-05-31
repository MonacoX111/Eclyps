"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, Check, Inbox, Calendar, UserCheck, ShieldAlert, Users, CheckCircle2, X } from "lucide-react"
import { getUserNotifications, markNotificationAsRead, type NotificationRow } from "@/lib/notifications/actions"
import type { UserProfile } from "@/lib/auth/user-profile"
import { useLanguage } from "@/components/language-provider"
import { getLocalizedNotification } from "@/lib/notifications/localize"

type NotificationsBellProps = {
  userProfile: UserProfile
}

export function NotificationsBell({ userProfile }: NotificationsBellProps) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications on mount and whenever the dropdown opens
  const fetchNotifications = async () => {
    try {
      const data = await getUserNotifications()
      console.log("NotificationsBell notifications fetched:", data)
      setNotifications(data)
    } catch (err) {
      console.error("Failed to load user notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Poll notifications every 60 seconds as a lightweight live-update feature
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const unreadNotifications = notifications.filter((n) => !n.read_at)
  const unreadCount = unreadNotifications.length

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // Optimistic Update: immediately set read_at in local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )

    try {
      const res = await markNotificationAsRead(id)
      if (!res.ok) {
        // Rollback state if server action fails
        console.error("Failed to mark notification as read:", res.error)
        fetchNotifications()
      }
    } catch (err) {
      console.error("Unexpected error marking notification as read:", err)
      fetchNotifications()
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
      fetchNotifications()
    }
  }

  // Helper to render type-specific icons
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
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) fetchNotifications()
        }}
        className="relative p-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition duration-200 cursor-pointer"
        aria-label={t.account.notifications.ariaView}
      >
        <Bell className="h-[18px] w-[18px]" />

        {/* Unread Count Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-5 h-5 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white px-1 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-2.5 w-80 max-h-[420px] rounded-2xl border flex flex-col overflow-hidden z-50 shadow-2xl"
            style={{
              background: "oklch(0.07 0.01 180 / 0.95)",
              backdropFilter: "blur(20px)",
              borderColor: "oklch(0.78 0.18 165 / 0.15)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-white/2">
              <span className="text-sm font-semibold tracking-wide text-white">{t.account.notifications.title}</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                >
                  {t.account.notifications.markAllRead}
                </button>
              )}
            </div>

            {/* List area */}
            <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  <span className="text-xs text-white/40">{t.account.notifications.loading}</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-3.5 rounded-full bg-white/5 border border-white/5 text-white/20">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-white/80">{t.account.notifications.allCaughtUp}</span>
                    <span className="text-xs text-white/40 max-w-48 mx-auto">{t.account.notifications.allCaughtUpDesc}</span>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                   {notifications.map((notification) => {
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
                        className={`flex gap-3 p-4 transition duration-200 relative ${
                          isUnread ? "bg-white/[0.01] hover:bg-white/[0.03]" : "hover:bg-white/2"
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
                        <div className="flex-1 min-w-0 pr-4">
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
                          <p className="text-[11px] text-white/60 leading-relaxed break-words">
                            {message}
                          </p>
                        </div>

                        {/* Mark single as read button */}
                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-emerald-400 transition cursor-pointer"
                            title={t.account.notifications.markReadTooltip}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Super lightweight helper to format human-readable relative time
 */
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
