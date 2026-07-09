"use client"

import type React from "react"
import { AlertTriangle, CheckCircle2, Inbox } from "lucide-react"
import type { AdminFeedback } from "@/lib/admin/types"
import { useLanguage } from "@/components/language-provider"

export const panelGridClassName =
  "mt-6 grid gap-5 2xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]"
export const innerPanelClassName = "min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
export const recordClassName = "rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.035]"
export const pillClassName =
  "max-w-full break-words rounded-full border border-white/10 px-2.5 py-1 text-white/65"

export function AdminSection({
  id,
  title,
  description,
  feedback,
  fetchError,
  fetchLabel,
  children,
}: {
  id: string
  title: string
  description: string
  feedback: AdminFeedback | null
  fetchError: string | null
  fetchLabel: string
  children: React.ReactNode
}) {
  const { lang } = useLanguage()

  return (
    <section id={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur sm:p-5">
      <PanelHeader title={title} description={description} lang={lang} />
      <FeedbackBlock feedback={feedback} />
      <FetchError message={fetchError} label={fetchLabel} lang={lang} />
      {children}
    </section>
  )
}

function PanelHeader({ title, description, lang }: { title: string; description: string; lang: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/5 pb-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300/70">
          {lang === "uk" ? "Активний модуль" : "Live module"}
        </p>
        <h2 className="mt-2 break-words text-2xl font-semibold text-white">{title}</h2>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-white/60">{description}</p>
    </div>
  )
}

function FeedbackBlock({ feedback }: { feedback: AdminFeedback | null }) {
  if (!feedback) return null

  return (
    <div
      role={feedback.tone === "success" ? "status" : "alert"}
      className={`mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 ${
        feedback.tone === "success"
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          : "border-red-300/20 bg-red-300/10 text-red-100"
      }`}
    >
      {feedback.tone === "success" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0 break-words">{feedback.message}</span>
    </div>
  )
}

function FetchError({ message, label, lang }: { message: string | null; label: string; lang: string }) {
  if (!message) return null

  return (
    <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm leading-6 text-red-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">
        {lang === "uk"
          ? `Не вдалося завантажити ${label} з Supabase: ${message}`
          : `Unable to load ${label} from Supabase: ${message}`}
      </span>
    </div>
  )
}

export function AdminEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-black/15 px-4 py-4 text-sm leading-6 text-white/55">
      <Inbox className="h-4 w-4 shrink-0 text-emerald-300/70" />
      <p className="min-w-0 break-words">{children}</p>
    </div>
  )
}
