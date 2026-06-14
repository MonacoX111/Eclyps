export const DISCORD_AUTH_IN_PROGRESS_KEY = "eclyps:discord-auth-in-progress"

export function markDiscordAuthInProgress() {
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.setItem(DISCORD_AUTH_IN_PROGRESS_KEY, "1")
  } catch {
    // Non-critical: the server callback still handles the auth redirect.
  }
}

export function clearDiscordAuthInProgress() {
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.removeItem(DISCORD_AUTH_IN_PROGRESS_KEY)
  } catch {
    // Non-critical.
  }
}

export function consumeDiscordAuthInProgress() {
  if (typeof window === "undefined") return false

  try {
    const wasInProgress = window.sessionStorage.getItem(DISCORD_AUTH_IN_PROGRESS_KEY) === "1"
    if (wasInProgress) {
      window.sessionStorage.removeItem(DISCORD_AUTH_IN_PROGRESS_KEY)
    }
    return wasInProgress
  } catch {
    return false
  }
}
