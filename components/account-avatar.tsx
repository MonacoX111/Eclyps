"use client"

import { useState } from "react"

type AccountAvatarProps = {
  url: string | null
  displayName: string
  className?: string
  textClassName?: string
}

/**
 * Renders the player avatar with premium styling.
 * Automatically falls back to display name initials on image error or if no URL is provided.
 */
export function AccountAvatar({ url, displayName, className, textClassName }: AccountAvatarProps) {
  const [error, setError] = useState(false)

  const initial = displayName ? displayName.slice(0, 1).toUpperCase() : "M"
  const sizeClassName = className ?? "h-12 w-12"

  if (url && !error) {
    return (
      <img
        src={url}
        alt={displayName}
        className={`${sizeClassName} rounded-full border border-primary/30 object-cover shrink-0`}
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    )
  }

  return (
    <div className={`${sizeClassName} rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary ${textClassName ?? "text-xl"} font-bold shrink-0`}>
      {initial}
    </div>
  )
}
