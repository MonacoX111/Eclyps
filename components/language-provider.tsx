"use client"

import React, { createContext, useContext, useState, useTransition } from "react"
import { translations, type Language, type TranslationSchema } from "@/lib/i18n/translations"

type LanguageContextType = {
  lang: Language
  setLanguage: (lang: Language) => void
  t: TranslationSchema
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode
  initialLang: Language
}) {
  const [lang, setLangState] = useState<Language>(initialLang)
  const [, startTransition] = useTransition()

  const setLanguage = (newLang: Language) => {
    // Write cookie
    document.cookie = `lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`
    setLangState(newLang)

    startTransition(() => {
      // Reload page to re-render server components in-place with the correct language
      window.location.reload()
    })
  }

  const t = translations[lang]

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
