import { cookies } from "next/headers"
import { translations, type Language } from "./translations"

export async function getLanguage(): Promise<Language> {
  try {
    const cookieStore = await cookies()
    const lang = cookieStore.get("lang")?.value
    return (lang === "en" ? "en" : "uk") as Language
  } catch (error: any) {
    // Rethrow Next.js dynamic routing/rendering control errors so that Next.js
    // knows the component/layout is dynamic and shouldn't be statically pre-rendered.
    if (
      error &&
      (error.name === "DynamicServerError" ||
        error.message?.includes("DynamicServerError") ||
        error.digest === "DYNAMIC_SERVER_USAGE" ||
        error.digest?.startsWith("NEXT_"))
    ) {
      throw error
    }
    // Fallback if accessed outside request context (e.g. static builds)
    return "uk"
  }
}

export async function getTranslations() {
  const lang = await getLanguage()
  return translations[lang]
}
