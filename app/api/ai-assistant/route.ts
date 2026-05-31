import { NextRequest } from "next/server"
import { GoogleGenAI } from "@google/genai"
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
        answer: t.aiChat.offlineMessage
      })
    }

    const ai = new GoogleGenAI({ apiKey })
    const latestNews = await getLatestNewsForAi(5)
    const latestNewsContext =
      latestNews.length > 0
        ? latestNews
            .map((post, index) => {
              const date = post.date ? new Date(post.date).toISOString().slice(0, 10) : "date TBA"
              return `${index + 1}. ${post.title} | ${post.category ?? "uncategorized"} | ${date} | ${post.excerpt ?? "No excerpt."}`
            })
            .join("\n")
        : "No published news posts are available right now."

    const systemInstruction = t.aiChat.systemInstruction

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.trim(),
      config: {
        systemInstruction: `${systemInstruction}

Latest published Eclyps news for user questions, including "Які останні новини?":
${latestNewsContext}`,
      }
    })

    return Response.json({
      answer: response.text ?? t.aiChat.fallbackError
    })

  } catch (error) {
    console.error("Error in AI Assistant Route:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
