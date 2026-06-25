import "server-only"

const DISCORD_API = "https://discord.com/api/v10"

/**
 * Sends a DIRECT MESSAGE to a single Discord user via a Discord bot.
 * Requires the DISCORD_BOT_TOKEN env var. The recipient must share a
 * server with the bot and have DMs enabled, otherwise Discord rejects it.
 * Fire-and-forget: never throws, never blocks the caller.
 */
export type DiscordDMPayload = {
  discordId: string | null | undefined
  title: string
  message: string
  type?: string
}

export async function sendDiscordDM({ discordId, title, message, type }: DiscordDMPayload) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    // Discord DMs are optional — silently skip when the bot is not configured.
    return { ok: false as const, skipped: true as const, reason: "no-bot-token" }
  }
  if (!discordId) {
    // This user has no linked Discord account on file — nothing to DM.
    return { ok: false as const, skipped: true as const, reason: "no-discord-id" }
  }

  try {
    // 1. Open (or reuse) a private DM channel with this user.
    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordId }),
    })

    if (!dmRes.ok) {
      console.error("sendDiscordDM: Failed to open DM channel:", dmRes.status)
      return { ok: false as const, status: dmRes.status }
    }

    const dmChannel = (await dmRes.json()) as { id?: string }
    if (!dmChannel.id) {
      return { ok: false as const, error: "no-dm-channel-id" }
    }

    // 2. Post the notification into that DM channel.
    const msgRes = await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: message,
            color: 0x16a34a,
            footer: type ? { text: type } : undefined,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })

    if (!msgRes.ok) {
      console.error("sendDiscordDM: Failed to send DM message:", msgRes.status)
      return { ok: false as const, status: msgRes.status }
    }

    return { ok: true as const }
  } catch (err) {
    console.error("sendDiscordDM: Unexpected error delivering DM:", err)
    return { ok: false as const, error: err instanceof Error ? err.message : "unexpected-error" }
  }
}
