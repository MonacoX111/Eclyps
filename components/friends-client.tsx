"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { supabase } from "@/lib/supabase/client"
import {
  respondFriendRequest,
  removeFriend,
  sendDirectMessage,
  loadConversation,
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

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/70">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function FriendsClient({
  currentUserId,
  friends: initialFriends,
  incoming: initialIncoming,
  outgoing,
  unreadByFriend: initialUnread,
}: Props) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"

  const [friends, setFriends] = useState(initialFriends)
  const [incoming, setIncoming] = useState(initialIncoming)
  const [unread, setUnread] = useState<Record<string, number>>(initialUnread)
  const [activeId, setActiveId] = useState<string | null>(
    initialFriends[0]?.id ?? null,
  )
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const activeFriend = friends.find((f) => f.id === activeId) ?? null

  const t = {
    title: isUk ? "Друзі та повідомлення" : "Friends & messages",
    subtitle: isUk
      ? "Спілкуйтеся з друзями та керуйте заявками."
      : "Chat with friends and manage requests.",
    requests: isUk ? "Заявки в друзі" : "Friend requests",
    noRequests: isUk ? "Немає нових заявок" : "No new requests",
    accept: isUk ? "Прийняти" : "Accept",
    decline: isUk ? "Відхилити" : "Decline",
    friendsLabel: isUk ? "Друзі" : "Friends",
    noFriends: isUk
      ? "Поки немає друзів. Додайте когось у профілі гравця."
      : "No friends yet. Add someone from their player profile.",
    pickFriend: isUk ? "Оберіть друга, щоб почати чат" : "Pick a friend to start chatting",
    placeholder: isUk ? "Напишіть повідомлення…" : "Type a message…",
    send: isUk ? "Надіслати" : "Send",
    remove: isUk ? "Видалити з друзів" : "Remove friend",
    empty: isUk ? "Повідомлень ще немає. Привітайтеся!" : "No messages yet. Say hi!",
  }

  const refresh = useCallback(
    async (otherId: string) => {
      const res = await loadConversation(otherId)
      if (res.ok) {
        setMessages(res.messages)
        setUnread((u) => ({ ...u, [otherId]: 0 }))
      }
    },
    [],
  )

  // Load conversation when active friend changes
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    refresh(activeId)
  }, [activeId, refresh])

  // Realtime + polling fallback for the open conversation
  useEffect(() => {
    if (!activeId) return
    let cancelled = false

    const channel = supabase
      .channel(`dm:${currentUserId}:${activeId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => {
          if (!cancelled) refresh(activeId)
        },
      )
    try {
      channel.subscribe()
    } catch {
      // ignore
    }

    const poll = setInterval(() => {
      if (!cancelled) refresh(activeId)
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(poll)
      try {
        supabase.removeChannel(channel)
      } catch {
        // ignore
      }
    }
  }, [activeId, currentUserId, refresh])

  // Auto-scroll to newest
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    // optimistic
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
    if (res.ok) await refresh(activeId)
    setSending(false)
  }

  async function handleRespond(friendshipId: string, accept: boolean) {
    setPending(friendshipId)
    const res = await respondFriendRequest(friendshipId, accept)
    if (res.ok) {
      const req = incoming.find((r) => r.friendshipId === friendshipId)
      setIncoming((list) => list.filter((r) => r.friendshipId !== friendshipId))
      if (accept && req) {
        setFriends((list) =>
          list.some((f) => f.id === req.id)
            ? list
            : [...list, { id: req.id, displayName: req.displayName, avatarUrl: req.avatarUrl, friendshipId, since: new Date().toISOString() }],
        )
      }
    }
    setPending(null)
  }

  async function handleRemove(friendshipId: string, friendId: string) {
    setPending(friendshipId)
    const res = await removeFriend(friendshipId)
    if (res.ok) {
      setFriends((list) => list.filter((f) => f.friendshipId !== friendshipId))
      if (activeId === friendId) setActiveId(null)
    }
    setPending(null)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">{t.title}</h1>
        <p className="mt-1 text-sm text-white/55">{t.subtitle}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-5">
          {incoming.length > 0 ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
                {t.requests} ({incoming.length})
              </h2>
              <ul className="space-y-3">
                {incoming.map((r) => (
                  <li key={r.friendshipId} className="flex items-center gap-3">
                    <Avatar url={r.avatarUrl} name={r.displayName} />
                    <span className="flex-1 truncate text-sm text-white/85">{r.displayName}</span>
                    <button
                      onClick={() => handleRespond(r.friendshipId, true)}
                      disabled={pending === r.friendshipId}
                      className="rounded-lg bg-emerald-400 px-2.5 py-1 text-xs font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
                    >
                      {t.accept}
                    </button>
                    <button
                      onClick={() => handleRespond(r.friendshipId, false)}
                      disabled={pending === r.friendshipId}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 transition hover:bg-white/5 disabled:opacity-50"
                    >
                      {t.decline}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
              {t.friendsLabel} ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <p className="text-sm text-white/45">{t.noFriends}</p>
            ) : (
              <ul className="space-y-1">
                {friends.map((f) => {
                  const count = unread[f.id] ?? 0
                  const active = f.id === activeId
                  return (
                    <li key={f.id}>
                      <button
                        onClick={() => setActiveId(f.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${active ? "bg-emerald-400/10" : "hover:bg-white/5"}`}
                      >
                        <Avatar url={f.avatarUrl} name={f.displayName} />
                        <span className="flex-1 truncate text-sm text-white/85">{f.displayName}</span>
                        {count > 0 ? (
                          <span className="min-w-5 rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold text-white">
                            {count}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </aside>

        {/* Chat */}
        <section className="flex min-h-[28rem] flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
          {activeFriend ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar url={activeFriend.avatarUrl} name={activeFriend.displayName} />
                  <span className="font-medium text-white">{activeFriend.displayName}</span>
                </div>
                <button
                  onClick={() => handleRemove(activeFriend.friendshipId, activeFriend.id)}
                  disabled={pending === activeFriend.friendshipId}
                  className="rounded-lg border border-rose-400/30 px-2.5 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                >
                  {t.remove}
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
                {messages.length === 0 ? (
                  <p className="mt-10 text-center text-sm text-white/40">{t.empty}</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === currentUserId
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <span
                          className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-emerald-400 text-black" : "bg-white/10 text-white/90"}`}
                        >
                          {m.body}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="flex gap-2 border-t border-white/10 p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t.placeholder}
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400/60"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
                >
                  {t.send}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-white/40">
              {t.pickFriend}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
