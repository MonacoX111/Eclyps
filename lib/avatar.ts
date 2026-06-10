const SAFE_LOCAL_AVATAR_PATH = /^\/(?!\/)/

export function withAvatarCacheBust(
  avatarUrl: string | null | undefined,
  version: string | null | undefined,
): string | null {
  const trimmedUrl = typeof avatarUrl === "string" ? avatarUrl.trim() : ""
  const trimmedVersion = typeof version === "string" ? version.trim() : ""

  if (!trimmedUrl) return null
  if (!isSafeAvatarUrl(trimmedUrl)) return null
  if (!trimmedVersion) return trimmedUrl

  try {
    if (isDiscordAvatarCdnUrl(trimmedUrl)) {
      return trimmedUrl
    }

    if (SAFE_LOCAL_AVATAR_PATH.test(trimmedUrl)) {
      const url = new URL(trimmedUrl, "https://eclyps.local")
      url.searchParams.set("v", trimmedVersion)
      return `${url.pathname}${url.search}${url.hash}`
    }

    const url = new URL(trimmedUrl)
    url.searchParams.set("v", trimmedVersion)
    return url.toString()
  } catch {
    return trimmedUrl
  }
}

export function isSafeAvatarUrl(avatarUrl: string | null | undefined): avatarUrl is string {
  const trimmedUrl = typeof avatarUrl === "string" ? avatarUrl.trim() : ""
  if (!trimmedUrl) return false

  if (SAFE_LOCAL_AVATAR_PATH.test(trimmedUrl)) {
    return !trimmedUrl.startsWith("/\\")
  }

  try {
    const url = new URL(trimmedUrl)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function getAvatarVersion(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const trimmed = typeof candidate === "string" ? candidate.trim() : ""
    if (trimmed) return trimmed
  }
  return null
}

export function buildDiscordAvatarUrl(
  discordId: string | null | undefined,
  avatarHash: string | null | undefined,
) {
  const id = typeof discordId === "string" ? discordId.trim() : ""
  const hash = typeof avatarHash === "string" ? avatarHash.trim() : ""

  if (!id || !hash) return null

  const extension = hash.startsWith("a_") ? "gif" : "webp"
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${encodeURIComponent(hash)}.${extension}`
}

function isDiscordAvatarCdnUrl(avatarUrl: string) {
  try {
    const url = new URL(avatarUrl)
    const hostname = url.hostname.toLowerCase()

    return (
      (hostname === "cdn.discordapp.com" || hostname === "media.discordapp.net") &&
      url.pathname.startsWith("/avatars/")
    )
  } catch {
    return false
  }
}
