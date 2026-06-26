"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Users, ArrowLeft, Check, X, Send } from "lucide-react"
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

const AVATAR_SIZES: Record<number, string> = {
  7: "h-7 w-7",
  8: "h-8 w-8",
  9: "h-9 w-9",
}

function Avatar({ url, name, size = 9 }: { url: string | null; name: string; size?: number }) {
  const cls = AVATAR_SIZES[size] ?? AVATAR_SIZES[9]
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${cls} rounded-full object-cover`} />
  }
  return (
    <span className={`${cls} flex items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/70`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function FriendsBell({ currentUserId }: Props) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"
  const [open, setOpen] = useState(false)
  const [overview, setOverview] = useState<FriendOverview | null>(null)
  const [activeFriend, setActiveFriend] = useState<FriendSummary | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const t = {
    title: isUk ? "Друзі" : "Friends",
    requests: isUk ? "Заявки" : "Requests",
    friends: isUk ? "Друзі" : "Friends",
    noFriends: isUk ? "Поки немає друзів." : "No friends yet.",
    noData: isUk ? "Завантаження…" : "Loading…",
    placeholder: isUk ? "Повідомлення…" : "Message…",
    empty: isUk ? "Повідомлень ще немає." : "No messages yet.",
    accept: isUk ? "Прийняти" : "Accept",
    decline: isUk ? "Відхилити" : "Decline",
  }

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
    await refreshConversation(friend.id)
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
        aria-label={t.title}
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
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/12 bg-[#0b0f14] shadow-2xl"
          >
            {activeFriend ? (
              <div className="flex h-96 flex-col">
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                  <button onClick={() => setActiveFriend(null)} className="rounded-lg p-1 text-white/60 hover:bg-white/5">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar url={activeFriend.avatarUrl} name={activeFriend.displayName} size={7} />
                  <span className="truncate text-sm font-medium text-white">{activeFriend.displayName}</span>
                </div>
                <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
                  {messages.length === 0 ? (
                    <p className="mt-8 text-center text-xs text-white/40">{t.empty}</p>
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
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                  />
                  <button type="submit" disabled={sending || !draft.trim()} className="rounded-xl bg-emerald-400 p-2 text-black transition hover:bg-emerald-300 disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">{t.title}</div>
                {!overview ? (
                  <p className="px-4 py-6 text-center text-xs text-white/40">{t.noData}</p>
                ) : (
                  <>
                    {overview.incoming.length > 0 ? (
                      <div className="border-b border-white/10 px-2 py-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
                          {t.requests} ({overview.incoming.length})
                        </p>
                        {overview.incoming.map((r) => (
                          <div key={r.friendshipId} className="flex items-center gap-2 px-2 py-1.5">
                            <Avatar url={r.avatarUrl} name={r.displayName} size={8} />
                            <span className="flex-1 truncate text-sm text-white/85">{r.displayName}</span>
                            <button onClick={() => handleRespond(r.friendshipId, true)} disabled={pending === r.friendshipId} className="rounded-lg bg-emerald-400 p-1 text-black hover:bg-emerald-300 disabled:opacity-50">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleRespond(r.friendshipId, false)} disabled={pending === r.friendshipId} className="rounded-lg border border-white/15 p-1 text-white/70 hover:bg-white/5 disabled:opacity-50">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="px-2 py-2">
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                        {t.friends} ({overview.friends.length})
                      </p>
                      {overview.friends.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-white/40">{t.noFriends}</p>
                      ) : (
                        overview.friends.map((f) => {
                          const count = overview.unreadByFriend[f.id] ?? 0
                          return (
                            <button key={f.id} onClick={() => openChat(f)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/5">
                              <Avatar url={f.avatarUrl} name={f.displayName} size={8} />
                              <span className="flex-1 truncate text-sm text-white/85">{f.displayName}</span>
                              {count > 0 ? (
                                <span className="min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold text-white">{count}</span>
                              ) : null}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}