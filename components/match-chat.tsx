"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Send, Trash2, MessageSquare, Users, Globe, Loader2, X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { supabase } from "@/lib/supabase/client"
import { sendMatchMessage, deleteMatchMessage, getChatMessageAuthor } from "@/app/matches/[id]/chat-actions"
import type { MatchChatMessage, MatchChatChannel } from "@/lib/data/match-chat"

type MatchChatProps = {
  matchId: string
  initialMessages: MatchChatMessage[]
  isParticipant: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  currentUserId: string | null
  currentUserName: string | null
  currentUserAvatarUrl: string | null
}

const MAX_BODY = 1000

function initials(name: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

function formatTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

function mapRow(row: Record<string, unknown>): MatchChatMessage | null {
  const id = typeof row.id === "string" ? row.id : null
  const matchId = typeof row.match_id === "string" ? row.match_id : null
  const body = typeof row.body === "string" ? row.body : null
  const createdAt = typeof row.created_at === "string" ? row.created_at : null
  if (!id || !matchId || !body || !createdAt) return null
  return {
    id,
    matchId,
    channel: row.channel === "participants" ? "participants" : "all",
    kind: row.kind === "system" ? "system" : "user",
    body,
    createdAt,
    authorId: typeof row.author_profile_id === "string" ? row.author_profile_id : null,
    authorName: null,
    authorAvatarUrl: null,
  }
}

export function MatchChat({
  matchId,
  initialMessages,
  isParticipant,
  isAuthenticated,
  isAdmin,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
}: MatchChatProps) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"
  const locale = isUk ? "uk-UA" : "en-US"

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<MatchChatChannel>("all")
  const [messages, setMessages] = useState<MatchChatMessage[]>(initialMessages)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSeenCount, setLastSeenCount] = useState(initialMessages.length)
  const listRef = useRef<HTMLDivElement | null>(null)
  const authorCache = useRef<Map<string, { name: string | null; avatarUrl: string | null }>>(new Map())

  const t = {
    title: isUk ? "Чат матчу" : "Match chat",
    open: isUk ? "Чат" : "Chat",
    tabAll: isUk ? "Всі" : "Everyone",
    tabParticipants: isUk ? "Учасники" : "Participants",
    empty: isUk ? "Повідомлень ще немає." : "No messages yet.",
    placeholder: isUk ? "Напишіть повідомлення…" : "Write a message…",
    loginRequired: isUk ? "Увійдіть, щоб писати в чат." : "Log in to post in chat.",
    participantsOnly: isUk
      ? "Писати тут можуть лише учасники матчу."
      : "Only match participants can post here.",
    send: isUk ? "Надіслати" : "Send",
    close: isUk ? "Закрити" : "Close",
    sysFailed: isUk ? "Не вдалося надіслати." : "Failed to send.",
    deleteConfirm: isUk ? "Видалити це повідомлення?" : "Delete this message?",
  }

  // Realtime: hardened pattern (unique channel name + try/catch).
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null
    try {
      ch = supabase.channel(`match-chat:${matchId}:${Math.random().toString(36).slice(2)}`)
      ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const msg = mapRow(payload.new as Record<string, unknown>)
          if (!msg) return
          // Realtime payloads only carry author_profile_id — enrich with name/avatar.
          let enriched = msg
          if (msg.authorId) {
            if (msg.authorId === currentUserId) {
              enriched = { ...msg, authorName: currentUserName, authorAvatarUrl: currentUserAvatarUrl }
            } else {
              const cached = authorCache.current.get(msg.authorId)
              if (cached) {
                enriched = { ...msg, authorName: cached.name, authorAvatarUrl: cached.avatarUrl }
              } else {
                // Fetch asynchronously, then patch the message in place.
                getChatMessageAuthor(msg.authorId)
                  .then((author) => {
                    authorCache.current.set(msg.authorId as string, author)
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === msg.id
                          ? { ...m, authorName: author.name, authorAvatarUrl: author.avatarUrl }
                          : m,
                      ),
                    )
                  })
                  .catch((err) => console.error("resolve author failed", err))
              }
            }
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === enriched.id)) return prev
            // Replace the matching optimistic (temp-) message from this user, if any.
            if (enriched.authorId && enriched.authorId === currentUserId) {
              const tempIdx = prev.findIndex(
                (m) => m.id.startsWith("temp-") && m.body === enriched.body && m.channel === enriched.channel,
              )
              if (tempIdx !== -1) {
                const next = [...prev]
                next[tempIdx] = enriched
                return next
              }
            }
            return [...prev, enriched]
          })
        },
      )
      ch.on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "match_messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const oldId = (payload.old as Record<string, unknown>)?.id
          if (typeof oldId === "string") {
            setMessages((prev) => prev.filter((m) => m.id !== oldId))
          }
        },
      )
      ch.subscribe()
    } catch (err) {
      console.error("MatchChat: failed to subscribe to realtime", err)
    }
    return () => {
      try {
        if (ch) supabase.removeChannel(ch)
      } catch (err) {
        console.error("MatchChat: failed to remove channel", err)
      }
    }
  }, [matchId])

  const visible = useMemo(
    () => messages.filter((m) => m.channel === tab).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages, tab],
  )

  // Auto-scroll to bottom when open / new messages / tab switch.
  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visible.length, tab, open])

  // Track unread count while the panel is closed.
  useEffect(() => {
    if (open) setLastSeenCount(messages.length)
  }, [open, messages.length])
  const unread = open ? 0 : Math.max(0, messages.length - lastSeenCount)

  const canPost = isAuthenticated && (tab === "all" || isParticipant)
  const lockReason = !isAuthenticated
    ? t.loginRequired
    : tab === "participants" && !isParticipant
      ? t.participantsOnly
      : null

  async function handleSend() {
    const body = draft.trim()
    if (!body || sending || !canPost) return
    setSending(true)
    setError(null)
    const previousDraft = draft
    setDraft("")

    // Optimistic UI: show the message instantly; the realtime INSERT event
    // replaces it with the real row (deduped in the subscription handler).
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimistic: MatchChatMessage = {
      id: tempId,
      matchId,
      channel: tab,
      kind: "user",
      body,
      createdAt: new Date().toISOString(),
      authorId: currentUserId,
      authorName: currentUserName,
      authorAvatarUrl: currentUserAvatarUrl,
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await sendMatchMessage({ matchId, channel: tab, body })
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setError(t.sysFailed)
        setDraft(previousDraft)
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError(t.sysFailed)
      setDraft(previousDraft)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(messageId: string) {
    if (!isAdmin) return
    if (typeof window !== "undefined" && !window.confirm(t.deleteConfirm)) return
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    try {
      await deleteMatchMessage({ matchId, messageId })
    } catch (err) {
      console.error("delete failed", err)
    }
  }

  return (
    <>
      {/* Floating launcher button — hidden while the panel is open (header has its own close button) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-black shadow-[0_8px_30px_rgba(0,200,150,0.35)] transition hover:scale-105 ${
          open ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
        aria-label={t.title}
        aria-hidden={open}
      >
        <MessageSquare className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <aside
        className={`fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-md flex-col border-l border-white/10 bg-[#0a0a0a]/95 shadow-2xl backdrop-blur-md transition-transform duration-300 sm:bottom-6 sm:right-6 sm:top-auto sm:h-[34rem] sm:max-h-[80vh] sm:rounded-3xl sm:border ${
          open ? "translate-x-0" : "translate-x-[110%]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-base font-bold text-foreground">{t.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pt-3">
          {([
            { key: "all" as const, label: t.tabAll, Icon: Globe },
            { key: "participants" as const, label: t.tabParticipants, Icon: Users },
          ]).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === key
                  ? "bg-primary text-black"
                  : "border border-white/10 bg-black/30 text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            visible.map((m) =>
              m.kind === "system" ? (
                <div key={m.id} className="group relative mx-auto my-1 flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground">
                  <span>{m.body}</span>
                  <span className="opacity-50">{formatTime(m.createdAt, locale)}</span>
                  {isAdmin && (
                    <button type="button" onClick={() => handleDelete(m.id)} className="ml-1 text-red-400/70 opacity-0 transition group-hover:opacity-100" aria-label="delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div key={m.id} className="group flex items-start gap-2.5">
                  {m.authorAvatarUrl ? (
                    <Image src={m.authorAvatarUrl} alt={m.authorName ?? ""} width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(m.authorName)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {m.authorName ?? (isUk ? "Користувач" : "User")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatTime(m.createdAt, locale)}</span>
                      {isAdmin && (
                        <button type="button" onClick={() => handleDelete(m.id)} className="ml-auto text-red-400/70 opacity-0 transition group-hover:opacity-100" aria-label="delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="break-words text-sm text-muted-foreground">{m.body}</p>
                  </div>
                </div>
              ),
            )
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 px-4 py-3">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
          {lockReason ? (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-muted-foreground">
              {lockReason}
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={1}
                placeholder={t.placeholder}
                className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-black transition hover:opacity-90 disabled:opacity-40"
                aria-label={t.send}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
