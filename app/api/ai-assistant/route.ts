import { NextRequest } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { buildAiLiveContext } from "@/lib/ai/context"
import { getLatestNewsForAi } from "@/lib/data/news"
import { translations } from "@/lib/i18n/translations"

export async function POST(req: NextRequest) {
  try {
    const { message, lang } = await req.json()

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message is required." }, { status: 400 })
    }

    const langKey = lang === "en" ? "en" : "uk"
    const t = translations[langKey]

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured in environment variables.")
      return Response.json({
        answer: t.aiChat.offlineMessage,
      })
    }

    const ai = new GoogleGenAI({ apiKey })
    const [latestNews, liveContext] = await Promise.all([
      getLatestNewsForAi(5),
      buildAiLiveContext(),
    ])
    const latestNewsContext =
      latestNews.length > 0
        ? latestNews
            .map((post, index) => {
              const date = post.date
                ? new Date(post.date).toISOString().slice(0, 10)
                : "date TBA"
              return `${index + 1}. ${post.title} | ${post.category ?? "uncategorized"} | ${date} | ${post.excerpt ?? "No excerpt."}`
            })
            .join("\n")
        : "No published news posts are available right now."

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.trim(),
      config: {
        systemInstruction: `${t.aiChat.systemInstruction}

Live Eclyps site context:
${JSON.stringify(liveContext, null, 2)}

Latest published Eclyps news:
${latestNewsContext}

Answer rules:
- Use the live site context above as the source of truth for tournaments, teams, players, matches, bracket, registrations, notifications, and admin summaries.
- If a fact is not present in the live context, say you do not have enough live information instead of guessing.
- Do not invent tournaments, match times, scores, teams, users, registrations, or admin data.
- Respect viewer permissions in the context. Public visitors only get public data. Logged-in users only get their own private data. Admin summaries are available only when viewer.isAdmin is true.
- Never expose secrets, service-role details, raw database access, private data for other users, or hidden admin data.
- For actions, explain where the user can do them in Eclyps. Do not claim an action was performed unless the site context explicitly says so.
- Reply in ${langKey === "uk" ? "Ukrainian" : "English"}.`,
      },
    })

    return Response.json({
      answer: response.text ?? t.aiChat.fallbackError,
    })
  } catch (error) {
    console.error("Error in AI Assistant Route:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
