"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  Send,
  Trash2,
  Clock,
  Inbox,
  UserCheck,
  MessageCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { supabase } from "@/lib/supabase/client"
import {
  respondFriendRequest,
  removeFriend,
  sendDirectMessage,
  loadConversation,
  loadFriendOverview,
  sendFriendRequest,
  searchUsersForFriends,
  type UserSearchItem,
} from "@/app/actions/friends"
import type {
  FriendSummary,
  FriendRequestSummary,
  DirectMessage,
} from "@/lib/data/friends"

type Props = {
  currentUserId: string
  friends: FriendSummary[]
  incoming: FriendRequestSummary[]
  outgoing: FriendRequestSummary[]
  unreadByFriend: Record<string, number>
}

type Tab = "friends" | "incoming" | "outgoing" | "search"

// ---------- helpers ----------

function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false
  const t = new Date(lastSeen).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < 5 * 60 * 1000 // 5 min
}

function relativeTime(iso: string | null | undefined, isUk: boolean): string {
  if (!iso) return ""
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diffSec = Math.floor((Date.now() - then) / 1000)
  if (diffSec < 30) return isUk ? "щойно" : "just now"
  if (diffSec < 60) return isUk ? `${diffSec} с тому` : `${diffSec}s ago`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return isUk ? `${min} хв тому` : `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return isUk ? `${hr} год тому` : `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return isUk ? `${day} д тому` : `${day}d ago`
  return new Date(iso).toLocaleDateString(isUk ? "uk-UA" : "en-US")
}

function formatMessageTime(iso: string | null | undefined, isUk: boolean): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(isUk ? "uk-UA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return d.toLocaleString(isUk ? "uk-UA" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------- Avatar with online dot ----------

function Avatar({
  url,
  name,
  online,
  size = 40,
}: {
  url: string | null
  name: string
  online?: boolean
  size?: number
}) {
  const px = `${size}px`
  const dotSize = Math.max(10, Math.round(size / 3.5))
  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-white/10 font-semibold text-white/70"
          style={{ fontSize: `${Math.max(10, size / 3)}px` }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {online ? (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[#0b0f14] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
          style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
        />
      ) : null}
    </div>
  )
}

// ---------- Main ----------

export function FriendsClient({
  currentUserId,
  friends: initialFriends,
  incoming: initialIncoming,
  outgoing: initialOutgoing,
  unreadByFriend: initialUnread,
}: Props) {
  const { t: globalT, lang } = useLanguage()
  const isUk = lang === "uk"
  const t = globalT.friends

  const [friends, setFriends] = useState(initialFriends)
  const [incoming, setIncoming] = useState(initialIncoming)
  const [outgoing, setOutgoing] = useState(initialOutgoing)
  const [unread, setUnread] = useState<Record<string, number>>(initialUnread)
  const [tab, setTab] = useState<Tab>("friends")
  const [filter, setFilter] = useState("")

  const [activeId, setActiveId] = useState<string | null>(
    initialFriends[0]?.id ?? null,
  )
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeFriend = friends.find((f) => f.id === activeId) ?? null

  // ---------- data refresh ----------

  const refreshOverview = useCallback(async () => {
    const res = await loadFriendOverview()
    if (res.ok && res.overview) {
      setFriends(res.overview.friends)
      setIncoming(res.overview.incoming)
      setOutgoing(res.overview.outgoing)
      setUnread(res.overview.unreadByFriend)
    }
  }, [])

  const refreshConversation = useCallback(async (otherId: string) => {
    const res = await loadConversation(otherId)
    if (res.ok) {
      setMessages(res.messages)
      setUnread((u) => ({ ...u, [otherId]: 0 }))
    }
  }, [])

  // Load conversation when active friend changes
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    refreshConversation(activeId)
  }, [activeId, refreshConversation])

  // Realtime + polling fallback
  useEffect(() => {
    let cancelled = false

    const channel = supabase
      .channel(`friends-page:${currentUserId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          if (!cancelled) refreshOverview()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => {
          if (cancelled) return
          refreshOverview()
          if (activeId) refreshConversation(activeId)
        },
      )
    try {
      channel.subscribe()
    } catch {
      // ignore
    }

    const poll = setInterval(() => {
      if (cancelled) return
      refreshOverview()
      if (activeId) refreshConversation(activeId)
    }, 8000)

    return () => {
      cancelled = true
      clearInterval(poll)
      try {
        supabase.removeChannel(channel)
      } catch {
        // ignore
      }
    }
  }, [activeId, currentUserId, refreshConversation, refreshOverview])

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const res = await searchUsersForFriends(searchQuery)
      if (res.ok) setSearchResults(res.results)
      setSearching(false)
    }, 250)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery])

  // ---------- actions ----------

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    const optimistic: DirectMessage = {
      id: `tmp-${Date.now()}`,
      senderId: currentUserId,
      recipientId: activeId,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    }
    setMessages((m) => [...m, optimistic])
    setDraft("")
    const res = await sendDirectMessage(activeId, text)
    if (res.ok) await refreshConversation(activeId)
    setSending(false)
  }

  async function handleRespond(friendshipId: string, accept: boolean) {
    setPending(friendshipId)
    const res = await respondFriendRequest(friendshipId, accept)
    if (res.ok) await refreshOverview()
    setPending(null)
  }

  async function handleRemove(friendshipId: string, friendId: string) {
    setPending(friendshipId)
    const res = await removeFriend(friendshipId)
    if (res.ok) {
      setFriends((list) => list.filter((f) => f.friendshipId !== friendshipId))
      if (activeId === friendId) setActiveId(null)
      setConfirmRemove(null)
    }
    setPending(null)
  }

  async function handleAdd(userId: string) {
    setPending(userId)
    const res = await sendFriendRequest(userId)
    if (res.ok) {
      // Optimistically flip status in the search list
      setSearchResults((list) =>
        list.map((u) =>
          u.id === userId ? { ...u, friendshipStatus: "pending_outgoing" } : u,
        ),
      )
      refreshOverview()
    }
    setPending(null)
  }

  // ---------- filtering ----------

  const filteredFriends = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => f.displayName.toLowerCase().includes(q))
  }, [friends, filter])

  const totalUnread = useMemo(
    () => Object.values(unread).reduce((a, b) => a + b, 0),
    [unread],
  )

  // ---------- render ----------

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {t.title}
            </h1>
            <p className="mt-0.5 text-sm text-white/55">{t.subtitle}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
        <TabButton
          active={tab === "friends"}
          onClick={() => setTab("friends")}
          icon={<UserCheck className="h-4 w-4" />}
          label={t.tabFriends}
          count={friends.length}
          badge={totalUnread}
        />
        <TabButton
          active={tab === "incoming"}
          onClick={() => setTab("incoming")}
          icon={<Inbox className="h-4 w-4" />}
          label={t.tabIncoming}
          count={incoming.length}
          badge={incoming.length}
        />
        <TabButton
          active={tab === "outgoing"}
          onClick={() => setTab("outgoing")}
          icon={<Clock className="h-4 w-4" />}
          label={t.tabOutgoing}
          count={outgoing.length}
        />
        <TabButton
          active={tab === "search"}
          onClick={() => setTab("search")}
          icon={<UserPlus className="h-4 w-4" />}
          label={t.tabSearch}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* LEFT PANEL */}
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03]">
          {tab === "friends" && (
            <FriendsList
              friends={filteredFriends}
              activeId={activeId}
              unread={unread}
              filter={filter}
              onFilterChange={setFilter}
              onSelect={setActiveId}
              t={t}
            />
          )}

          {tab === "incoming" && (
            <RequestsList
              variant="incoming"
              items={incoming}
              pending={pending}
              onAccept={(id) => handleRespond(id, true)}
              onDecline={(id) => handleRespond(id, false)}
              t={t}
              isUk={isUk}
            />
          )}

          {tab === "outgoing" && (
            <RequestsList
              variant="outgoing"
              items={outgoing}
              pending={pending}
              onCancel={(id) => handleRespond(id, false)}
              t={t}
              isUk={isUk}
            />
          )}

          {tab === "search" && (
            <SearchPanel
              query={searchQuery}
              onQueryChange={setSearchQuery}
              results={searchResults}
              searching={searching}
              onAdd={handleAdd}
              onAccept={(fid) => handleRespond(fid, true)}
              pending={pending}
              t={t}
              isUk={isUk}
            />
          )}
        </aside>

        {/* CHAT */}
        <section className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {activeFriend ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setActiveId(null)}
                    className="rounded-lg p-1 text-white/50 transition hover:bg-white/5 hover:text-white lg:hidden"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar
                    url={activeFriend.avatarUrl}
                    name={activeFriend.displayName}
                    online={isOnline(activeFriend.lastSeen)}
                    size={40}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">
                      {activeFriend.displayName}
                    </div>
                    <div className="text-xs text-white/50">
                      {isOnline(activeFriend.lastSeen) ? (
                        <span className="text-emerald-300">● {t.online}</span>
                      ) : activeFriend.lastSeen ? (
                        <>
                          {t.lastSeen}{" "}
                          {relativeTime(activeFriend.lastSeen, isUk)}
                        </>
                      ) : (
                        t.offline
                      )}
                    </div>
                  </div>
                </div>

                {confirmRemove === activeFriend.friendshipId ? (
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-white/60 sm:inline">
                      {t.removeConfirm}
                    </span>
                    <button
                      onClick={() =>
                        handleRemove(activeFriend.friendshipId, activeFriend.id)
                      }
                      disabled={pending === activeFriend.friendshipId}
                      className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-rose-400 disabled:opacity-50"
                    >
                      {t.removeYes}
                    </button>
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 transition hover:bg-white/5"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemove(activeFriend.friendshipId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/25 px-2.5 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10"
                    title={t.remove}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t.remove}</span>
                  </button>
                )}
              </div>

              <div
                ref={scrollRef}
                className="flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-5"
              >
                {messages.length === 0 ? (
                  <div className="mx-auto mt-16 max-w-xs rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <MessageCircle className="mx-auto mb-2 h-6 w-6 text-white/30" />
                    <p className="text-sm text-white/45">{t.empty}</p>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const mine = m.senderId === currentUserId
                    const prev = messages[i - 1]
                    const showTime =
                      !prev ||
                      prev.senderId !== m.senderId ||
                      (m.createdAt &&
                        prev.createdAt &&
                        new Date(m.createdAt).getTime() -
                          new Date(prev.createdAt).getTime() >
                          5 * 60 * 1000)

                    return (
                      <div key={m.id}>
                        {showTime && m.createdAt ? (
                          <div
                            className={`mb-1 mt-3 text-[10px] uppercase tracking-wider text-white/35 ${
                              mine ? "text-right" : "text-left"
                            }`}
                          >
                            {formatMessageTime(m.createdAt, isUk)}
                          </div>
                        ) : null}
                        <div
                          className={`flex ${
                            mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span
                            className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                              mine
                                ? "bg-emerald-400 text-black"
                                : "bg-white/10 text-white/90"
                            }`}
                          >
                            {m.body}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="flex gap-2 border-t border-white/10 bg-black/20 p-3"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t.placeholder}
                  maxLength={2000}
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400/60"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.send}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
              <MessageCircle className="h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">{t.pickFriend}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ==================== SUB-COMPONENTS ====================

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition sm:flex-initial ${
        active
          ? "bg-emerald-400/15 text-emerald-300"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={`ml-0.5 rounded-full px-1.5 text-[10px] font-semibold ${
            active ? "bg-emerald-400/25 text-emerald-200" : "bg-white/10 text-white/50"
          }`}
        >
          {count}
        </span>
      ) : null}
      {badge && badge > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  )
}

function FriendsList({
  friends,
  activeId,
  unread,
  filter,
  onFilterChange,
  onSelect,
  t,
}: {
  friends: FriendSummary[]
  activeId: string | null
  unread: Record<string, number>
  filter: string
  onFilterChange: (v: string) => void
  onSelect: (id: string) => void
  t: any
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={t.filterPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-emerald-400/60"
          />
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <Users className="h-8 w-8 text-white/20" />
          <p className="text-sm text-white/50">{t.noFriends}</p>
          <p className="text-xs text-white/35">{t.noFriendsHint}</p>
        </div>
      ) : (
        <ul className="max-h-[32rem] flex-1 overflow-y-auto p-2">
          {friends.map((f) => {
            const count = unread[f.id] ?? 0
            const active = f.id === activeId
            const online = isOnline(f.lastSeen)
            return (
              <li key={f.id}>
                <button
                  onClick={() => onSelect(f.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                    active ? "bg-emerald-400/10" : "hover:bg-white/5"
                  }`}
                >
                  <Avatar
                    url={f.avatarUrl}
                    name={f.displayName}
                    online={online}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white/90">
                      {f.displayName}
                    </div>
                    <div className="text-[11px] text-white/45">
                      {online ? (
                        <span className="text-emerald-300">● {t.online}</span>
                      ) : (
                        t.offline
                      )}
                    </div>
                  </div>
                  {count > 0 ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RequestsList({
  variant,
  items,
  pending,
  onAccept,
  onDecline,
  onCancel,
  t,
  isUk,
}: {
  variant: "incoming" | "outgoing"
  items: FriendRequestSummary[]
  pending: string | null
  onAccept?: (friendshipId: string) => void
  onDecline?: (friendshipId: string) => void
  onCancel?: (friendshipId: string) => void
  t: any
  isUk: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        {variant === "incoming" ? (
          <Inbox className="h-8 w-8 text-white/20" />
        ) : (
          <Clock className="h-8 w-8 text-white/20" />
        )}
        <p className="text-sm text-white/50">
          {variant === "incoming" ? t.noIncoming : t.noOutgoing}
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-white/5 p-2">
      {items.map((r) => (
        <li key={r.friendshipId} className="flex items-center gap-3 p-2.5">
          <Avatar
            url={r.avatarUrl}
            name={r.displayName}
            online={isOnline(r.lastSeen)}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white/90">
              {r.displayName}
            </div>
            <div className="text-[11px] text-white/45">
              {r.createdAt ? relativeTime(r.createdAt, isUk) : ""}
            </div>
          </div>

          {variant === "incoming" ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onAccept?.(r.friendshipId)}
                disabled={pending === r.friendshipId}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.accept}</span>
              </button>
              <button
                onClick={() => onDecline?.(r.friendshipId)}
                disabled={pending === r.friendshipId}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/5 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.decline}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onCancel?.(r.friendshipId)}
              disabled={pending === r.friendshipId}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/5 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.cancel}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function SearchPanel({
  query,
  onQueryChange,
  results,
  searching,
  onAdd,
  onAccept,
  pending,
  t,
  isUk,
}: {
  query: string
  onQueryChange: (v: string) => void
  results: UserSearchItem[]
  searching: boolean
  onAdd: (userId: string) => void
  onAccept: (friendshipId: string) => void
  pending: string | null
  t: any
  isUk: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-9 text-sm text-white placeholder-white/30 outline-none transition focus:border-emerald-400/60"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-white/40" />
          ) : null}
        </div>
      </div>

      <div className="max-h-[32rem] flex-1 overflow-y-auto p-2">
        {query.trim().length < 2 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <UserPlus className="h-8 w-8 text-white/20" />
            <p className="text-sm text-white/50">{t.searchHint}</p>
          </div>
        ) : results.length === 0 && !searching ? (
          <p className="p-10 text-center text-sm text-white/45">
            {t.searchNoResults}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {results.map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-2.5">
                <Avatar
                  url={u.avatarUrl}
                  name={u.displayName}
                  online={isOnline(u.lastSeen)}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white/90">
                    {u.displayName}
                  </div>
                  {u.discordUsername ? (
                    <div className="truncate text-[11px] text-white/45">
                      @{u.discordUsername}
                    </div>
                  ) : null}
                </div>
                <SearchAction
                  user={u}
                  pending={pending}
                  onAdd={onAdd}
                  onAccept={onAccept}
                  t={t}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SearchAction({
  user,
  pending,
  onAdd,
  onAccept,
  t,
}: {
  user: UserSearchItem
  pending: string | null
  onAdd: (id: string) => void
  onAccept: (fid: string) => void
  t: any
}) {
  const busy = pending === user.id || pending === user.friendshipId

  if (user.friendshipStatus === "friends") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-xs text-emerald-300">
        <Check className="h-3.5 w-3.5" />
        {t.tabFriends}
      </span>
    )
  }
  if (user.friendshipStatus === "pending_outgoing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/60">
        <Clock className="h-3.5 w-3.5" />
        {t.requested}
      </span>
    )
  }
  if (user.friendshipStatus === "pending_incoming" && user.friendshipId) {
    return (
      <button
        onClick={() => onAccept(user.friendshipId!)}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
        {t.accept}
      </button>
    )
  }
  return (
    <button
      onClick={() => onAdd(user.id)}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1.5 text-xs font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
    >
      <UserPlus className="h-3.5 w-3.5" />
      {t.add}
    </button>
  )
}
