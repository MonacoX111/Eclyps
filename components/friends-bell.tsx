"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import {
  Users,
  ArrowLeft,
  Check,
  X,
  Send,
  UserPlus,
  ArrowRight,
  Clock,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { supabase } from "@/lib/supabase/client"
import {
  loadFriendOverview,
  loadConversation,
  sendDirectMessage,
  respondFriendRequest,
} from "@/app/actions/friends"
import type {
  FriendOverview,
  FriendSummary,
  DirectMessage,
} from "@/lib/data/friends"

type Props = { currentUserId: string }

function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false
  const t = new Date(lastSeen).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < 5 * 60 * 1000
}

function Avatar({
  url,
  name,
  online,
  size = 32,
}: {
  url: string | null
  name: string
  online?: boolean
  size?: number
}) {
  const px = `${size}px`
  const dot = Math.max(8, Math.round(size / 3.5))
  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-white/10 font-semibold text-white/70"
          style={{ fontSize: `${Math.max(9, size / 3)}px` }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {online ? (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[#0b0f14] bg-emerald-400"
          style={{ width: `${dot}px`, height: `${dot}px` }}
        />
      ) : null}
    </div>
  )
}

export function FriendsBell({ currentUserId }: Props) {
  const { t: globalT, lang } = useLanguage()
  const isUk = lang === "uk"
  const t = globalT.friends

  const [open, setOpen] = useState(false)
  const [overview, setOverview] = useState<FriendOverview | null>(null)
  const [activeFriend, setActiveFriend] = useState<FriendSummary | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const refreshOverview = useCallback(async () => {
    const res = await loadFriendOverview()
    if (res.ok) setOverview(res.overview)
  }, [])

  const refreshConversation = useCallback(async (otherId: string) => {
    const res = await loadConversation(otherId)
    if (res.ok) setMessages(res.messages)
  }, [])

  // initial + realtime + polling
  useEffect(() => {
    refreshOverview()
    const channel = supabase
      .channel(`friends:${currentUserId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => refreshOverview())
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
        refreshOverview()
        if (activeFriend) refreshConversation(activeFriend.id)
      })
    try { channel.subscribe() } catch {}
    const poll = setInterval(() => {
      refreshOverview()
      if (activeFriend) refreshConversation(activeFriend.id)
    }, 8000)
    return () => {
      clearInterval(poll)
      try { supabase.removeChannel(channel) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, activeFriend])

  // click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const unreadTotal = overview
    ? Object.values(overview.unreadByFriend).reduce((a, b) => a + b, 0)
    : 0
  const requestCount = overview?.incoming.length ?? 0
  const badge = unreadTotal + requestCount

  async function openChat(friend: FriendSummary) {
    setActiveFriend(friend)
    setMessages([])
    setLoadingHistory(true)
    await refreshConversation(friend.id)
    setLoadingHistory(false)
    refreshOverview()
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activeFriend || sending) return
    setSending(true)
    const optimistic: DirectMessage = {
      id: `tmp-${Date.now()}`,
      senderId: currentUserId,
      recipientId: activeFriend.id,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    }
    setMessages((m) => [...m, optimistic])
    setDraft("")
    const res = await sendDirectMessage(activeFriend.id, text)
    if (res.ok) await refreshConversation(activeFriend.id)
    setSending(false)
  }

  async function handleRespond(friendshipId: string, accept: boolean) {
    setPending(friendshipId)
    const res = await respondFriendRequest(friendshipId, accept)
    if (res.ok) await refreshOverview()
    setPending(null)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.titleBell}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
      >
        <Users className="h-4 w-4" />
        {badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-white/12 bg-[#0b0f14] shadow-2xl"
          >
            {activeFriend ? (
              <div className="flex h-[26rem] flex-col">
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                  <button
                    onClick={() => setActiveFriend(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/players/${activeFriend.playerId ?? activeFriend.id}`}
                    className="hover:opacity-80 transition shrink-0"
                    title={activeFriend.displayName}
                  >
                    <Avatar
                      url={activeFriend.avatarUrl}
                      name={activeFriend.displayName}
                      online={isOnline(activeFriend.lastSeen)}
                      size={28}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {activeFriend.displayName}
                    </div>
                    {isOnline(activeFriend.lastSeen) ? (
                      <div className="text-[10px] text-emerald-300">● {t.online}</div>
                    ) : null}
                  </div>
                  <a
                    href="/friends"
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/5"
                    title={t.seeAll}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
                <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
                  {loadingHistory ? (
                    <div className="mt-8 flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400/70" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="mt-8 flex flex-col items-center gap-1.5 text-center">
                      <MessageCircle className="h-5 w-5 text-white/25" />
                      <p className="text-xs text-white/40">{t.emptyBell}</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const mine = msg.senderId === currentUserId
                      return (
                        <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <span className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-emerald-400 text-black" : "bg-white/10 text-white/90"}`}>
                            {msg.body}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t.placeholder}
                    maxLength={2000}
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="rounded-xl bg-emerald-400 p-2 text-black transition hover:bg-emerald-300 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex max-h-[26rem] flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="text-sm font-semibold text-white">{t.titleBell}</span>
                  <a
                    href="/friends"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-400/15"
                  >
                    <UserPlus className="h-3 w-3" />
                    {t.findFriends}
                  </a>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {!overview ? (
                    <p className="px-4 py-6 text-center text-xs text-white/40">{t.noData}</p>
                  ) : (
                    <>
                      {/* Incoming requests */}
                      {overview.incoming.length > 0 ? (
                        <div className="border-b border-white/10 px-2 py-2">
                          <p className="flex items-center gap-1 px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
                            {t.requests} ({overview.incoming.length})
                          </p>
                          {overview.incoming.map((r) => (
                            <div key={r.friendshipId} className="flex items-center gap-2 px-2 py-1.5">
                              <Link
                                href={`/players/${r.playerId ?? r.id}`}
                                className="hover:opacity-80 transition shrink-0"
                              >
                                <Avatar
                                  url={r.avatarUrl}
                                  name={r.displayName}
                                  online={isOnline(r.lastSeen)}
                                  size={32}
                                />
                              </Link>
                              <span className="flex-1 truncate text-sm text-white/85">{r.displayName}</span>
                              <button
                                onClick={() => handleRespond(r.friendshipId, true)}
                                disabled={pending === r.friendshipId}
                                className="rounded-lg bg-emerald-400 p-1 text-black hover:bg-emerald-300 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleRespond(r.friendshipId, false)}
                                disabled={pending === r.friendshipId}
                                className="rounded-lg border border-white/15 p-1 text-white/70 hover:bg-white/5 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Outgoing pending */}
                      {overview.outgoing.length > 0 ? (
                        <div className="border-b border-white/10 px-2 py-2">
                          <p className="flex items-center gap-1 px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                            <Clock className="h-3 w-3" />
                            {t.outgoing} ({overview.outgoing.length})
                          </p>
                          {overview.outgoing.map((r) => (
                            <div key={r.friendshipId} className="flex items-center gap-2 px-2 py-1.5 opacity-70">
                              <Link
                                href={`/players/${r.playerId ?? r.id}`}
                                className="hover:opacity-80 transition shrink-0"
                              >
                                <Avatar
                                  url={r.avatarUrl}
                                  name={r.displayName}
                                  online={isOnline(r.lastSeen)}
                                  size={32}
                                />
                              </Link>
                              <span className="flex-1 truncate text-sm text-white/70">{r.displayName}</span>
                              <span className="text-[10px] text-white/45">
                                {t.outgoing}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Friends list */}
                      <div className="px-2 py-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                          {t.friends} ({overview.friends.length})
                        </p>
                        {overview.friends.length === 0 ? (
                          <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
                            <Users className="h-5 w-5 text-white/25" />
                            <p className="text-xs text-white/40">{t.noFriends}</p>
                            <p className="text-[10px] text-white/30">{t.noFriendsHintBell}</p>
                          </div>
                        ) : (
                          overview.friends.map((f) => {
                            const count = overview.unreadByFriend[f.id] ?? 0
                            return (
                              <div
                                key={f.id}
                                onClick={() => openChat(f)}
                                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/5 cursor-pointer"
                              >
                                <Link
                                  href={`/players/${f.playerId ?? f.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:opacity-80 transition shrink-0"
                                >
                                  <Avatar
                                    url={f.avatarUrl}
                                    name={f.displayName}
                                    online={isOnline(f.lastSeen)}
                                    size={32}
                                  />
                                </Link>
                                <span className="flex-1 truncate text-sm text-white/85">{f.displayName}</span>
                                {count > 0 ? (
                                  <span className="min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold text-white">{count}</span>
                                ) : null}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer with "See all" */}
                <a
                  href="/friends"
                  className="flex items-center justify-center gap-1.5 border-t border-white/10 bg-black/30 py-2.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/10"
                >
                  {t.seeAll}
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
