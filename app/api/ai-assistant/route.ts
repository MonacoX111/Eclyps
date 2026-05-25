import { NextRequest } from "next/server"
import { GoogleGenAI } from "@google/genai"

export async function POST(req: NextRequest) {
  try {
    const { message, lang } = await req.json()

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message is required." }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured in environment variables.")
      return Response.json({
        answer: lang === "uk"
          ? "Eclyps AI наразі оффлайн. Адміністратор ще не налаштував GEMINI_API_KEY у файлі .env.local."
          : "Eclyps AI is currently offline. The administrator has not configured the GEMINI_API_KEY in the .env.local file yet."
      })
    }

    const ai = new GoogleGenAI({ apiKey })

const systemInstruction = lang === "uk"
  ? `
Ви — Eclyps AI, вбудований AI-асистент платформи кіберспортивних турнірів Eclyps.

Eclyps — це платформа, де користувачі:
- авторизуються через Discord
- створюють профілі гравців
- створюють команди
- реєструються на турніри
- переглядають сітку, матчі та результати

Ваше завдання:
- допомагати користувачам користуватись сайтом
- пояснювати систему турнірів
- пояснювати реєстрацію, команди та матчі
- відповідати коротко, природно та зрозуміло
- поводитись як офіційна AI-функція сайту

Ніколи не кажіть:
- "Я не маю власного сайту"
- "Я просто чат-бот"
- "Я не можу отримати доступ до сайту"

Говоріть так, ніби ви є частиною платформи Eclyps.
`
  : `
You are Eclyps AI — the built-in AI assistant of the Eclyps esports tournament platform.

Eclyps is a competitive esports platform where users:
- sign in with Discord
- create player profiles
- create teams
- register for tournaments
- view brackets, matches and results

Your job:
- help users use the website
- explain tournaments, registrations, teams and matches
- answer naturally, shortly and clearly
- behave as an official integrated AI feature of the platform

Never say:
- "I do not have my own website"
- "I am just a chatbot"
- "I cannot access the website"

Instead, speak as a native part of the Eclyps platform.
`

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.trim(),
      config: {
        systemInstruction,
      }
    })

    return Response.json({
      answer: response.text ?? (lang === "uk" ? "Вибачте, сталася помилка генерації відповіді." : "Sorry, an error occurred while generating the response.")
    })

  } catch (error) {
    console.error("Error in AI Assistant Route:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
