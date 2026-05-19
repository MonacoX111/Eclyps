import type React from "react"
import type { AdminFeedback } from "@/lib/admin/types"

export const panelGridClassName =
  "mt-6 grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]"
export const innerPanelClassName = "rounded-2xl border border-white/10 bg-black/20 p-4"
export const recordClassName = "rounded-2xl border border-white/10 bg-white/[0.02] p-4"
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
  return (
    <section id={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
      <PanelHeader title={title} description={description} />
      <FeedbackBlock feedback={feedback} />
      <FetchError message={fetchError} label={fetchLabel} />
      {children}
    </section>
  )
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/70">
        Live module
      </p>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-white/60">{description}</p>
    </div>
  )
}

function FeedbackBlock({ feedback }: { feedback: AdminFeedback | null }) {
  if (!feedback) return null

  return (
    <div
      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
        feedback.tone === "success"
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          : "border-red-300/20 bg-red-300/10 text-red-100"
      }`}
    >
      {feedback.message}
    </div>
  )
}

function FetchError({ message, label }: { message: string | null; label: string }) {
  if (!message) return null

  return (
    <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
      Unable to load {label} from Supabase: {message}
    </div>
  )
}

export function AdminEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-white/55">
      {children}
    </p>
  )
}
