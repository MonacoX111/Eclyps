"use client"

import { useState } from "react"
import { ChevronDown, SlidersHorizontal } from "lucide-react"
import { updateOwnPlayerProfile } from "@/app/account/actions"
import { useLanguage } from "@/components/language-provider"

type EditProfileFormProps = {
  initialNickname: string | null
  initialRealName: string | null
  initialRegion: string | null
  variant?: "collapse" | "modal"
  buttonClassName?: string
}

export function EditProfileForm({
  initialNickname,
  initialRealName,
  initialRegion,
  variant = "collapse",
  buttonClassName,
}: EditProfileFormProps) {
  const { t, lang } = useLanguage()
  const [nickname, setNickname] = useState(initialNickname || "")
  const [realName, setRealName] = useState(initialRealName || "")
  const [region, setRegion] = useState(initialRegion || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)

    const formData = new FormData()
    formData.append("nickname", nickname)
    formData.append("real_name", realName)
    formData.append("region", region)

    try {
      const res = await updateOwnPlayerProfile(formData)
      if (res.ok) {
        setSuccess(true)
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(res.error || t.account.editForm.errors.failedUpdate)
      }
    } catch (err) {
      setError(t.account.editForm.errors.unexpected)
    } finally {
      setLoading(false)
    }
  }

  const inputClassName =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/60"

  const formFields = (
    <>
      {success && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200">
          {t.account.editForm.successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
          {t.account.editForm.errorMessage} {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
          <span>{t.account.editForm.nicknameLabel}</span>
          <input
            type="text"
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t.account.editForm.nicknamePlaceholder}
            className={inputClassName}
          />
        </label>

        <label className="space-y-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
          <span>{t.account.editForm.realNameLabel}</span>
          <input
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder={t.account.editForm.realNamePlaceholder}
            className={inputClassName}
          />
        </label>
      </div>

      <label className="space-y-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
        <span>{t.account.editForm.regionLabel}</span>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder={t.account.editForm.regionPlaceholder}
          className={inputClassName}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)] hover:scale-102 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? t.account.editForm.savingButton : t.account.editForm.saveButton}
      </button>
    </>
  )

  if (variant === "modal") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={buttonClassName ?? "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 cursor-pointer"}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t.account.editForm.buttonLabel}
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-md">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label={t.account.editForm.closeButton}
              onClick={() => setIsOpen(false)}
            />
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-emerald-400/25 bg-[oklch(0.08_0.015_180/0.98)] p-5 shadow-[0_0_80px_rgba(16,185,129,0.18)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">
                    {t.account.editForm.modalEyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-white">{t.account.editForm.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-white/20 hover:text-white cursor-pointer"
                >
                  {t.account.editForm.closeButton}
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                {formFields}
              </form>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="glass-card overflow-hidden rounded-2xl border border-white/5">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03] cursor-pointer sm:px-6"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold tracking-wide text-white">{t.account.editForm.title}</span>
            <span className="mt-0.5 block truncate text-xs text-white/45">{t.account.editForm.collapsedHint}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${isOpen ? "rotate-180 text-emerald-300" : ""}`} />
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-5 border-t border-white/5 px-5 py-5 sm:px-6">
          {formFields}
        </form>
      )}
    </div>
  )
}
