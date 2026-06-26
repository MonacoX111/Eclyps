"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { sendFriendRequest, respondFriendRequest } from "@/app/actions/friends"
import type { FriendshipStatus } from "@/lib/data/friends"

type Props = {
  targetUserProfileId: string
  initialStatus: FriendshipStatus
  incomingFriendshipId?: string | null
}

export function FriendButton({
  targetUserProfileId,
  initialStatus,
  incomingFriendshipId,
}: Props) {
  const { lang } = useLanguage()
  const isUk = lang === "uk"
  const router = useRouter()
  const [status, setStatus] = useState<FriendshipStatus>(initialStatus)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  const labels = {
    add: isUk ? "Додати в друзі" : "Add friend",
    requested: isUk ? "Заявку надіслано" : "Request sent",
    accept: isUk ? "Прийняти заявку" : "Accept request",
    friends: isUk ? "Ви друзі" : "Friends",
    message: isUk ? "Написати" : "Message",
    error: isUk ? "Помилка, спробуйте ще" : "Something went wrong",
  }

  function handleAdd() {
    setError(false)
    startTransition(async () => {
      const res = await sendFriendRequest(targetUserProfileId)
      if (res.ok) setStatus("pending_outgoing")
      else setError(true)
    })
  }

  function handleAccept() {
    if (!incomingFriendshipId) return
    setError(false)
    startTransition(async () => {
      const res = await respondFriendRequest(incomingFriendshipId, true)
      if (res.ok) {
        setStatus("friends")
        router.refresh()
      } else setError(true)
    })
  }

  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "none" ? (
        <button onClick={handleAdd} disabled={pending} className={`${base} bg-emerald-400 text-black hover:bg-emerald-300`}>
          {labels.add}
        </button>
      ) : null}

      {status === "pending_outgoing" ? (
        <span className={`${base} cursor-default border border-white/15 text-white/60`}>
          {labels.requested}
        </span>
      ) : null}

      {status === "pending_incoming" ? (
        <button onClick={handleAccept} disabled={pending} className={`${base} bg-emerald-400 text-black hover:bg-emerald-300`}>
          {labels.accept}
        </button>
      ) : null}

      {status === "friends" ? (
        <>
          <span className={`${base} cursor-default border border-emerald-400/30 text-emerald-300`}>
            {labels.friends}
          </span>
          <a href="/friends" className={`${base} border border-white/15 text-white/80 hover:bg-white/5`}>
            {labels.message}
          </a>
        </>
      ) : null}

      {error ? <span className="text-xs text-rose-400">{labels.error}</span> : null}
    </div>
  )
}
