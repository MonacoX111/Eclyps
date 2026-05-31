"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createGlobalTeam } from "@/app/actions/teams"
import { useLanguage } from "@/components/language-provider"

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none transition focus:border-emerald-500/60"

const containerClassName =
  "relative w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-500/25 bg-[oklch(0.08_0.015_180/0.96)] p-6 shadow-[0_0_80px_rgba(0,200,150,0.18)]"

type CreateTeamModalProps = {
  hasApprovedPlayer: boolean
  isLoggedIn: boolean
  alreadyManagesTeam?: boolean
  initialError?: string
  initialSuccess?: string
}

export function CreateTeamModal({
  hasApprovedPlayer,
  isLoggedIn,
  alreadyManagesTeam = false,
  initialError,
  initialSuccess,
}: CreateTeamModalProps) {
  const { t, lang } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  // Map backend query error/success parameters to user-friendly messages
  useEffect(() => {
    if (initialError) {
      const messages: Record<string, string> = {
        "discord-login-required": t.account.createTeam.errors.discordLogin,
        "invalid-team-name": t.account.createTeam.errors.invalidName,
        "player-profile-not-found": t.account.createTeam.errors.profileNotFound,
        "player-approval-required": t.account.createTeam.errors.approvalRequired,
        "duplicate-team-slug": t.account.createTeam.errors.duplicateSlug,
        "duplicate-team-ownership": t.account.createTeam.errors.duplicateOwnership,
        "already-manages-team": t.account.createTeam.errors.alreadyManagesTeam,
        "mutation-failed": t.account.createTeam.errors.mutationFailed,
        "admin-client-unavailable": t.account.createTeam.errors.unavailable,
      }
      setErrorMessage(messages[initialError] ?? t.account.createTeam.errors.mutationFailed)
      // Open modal if error is related to inputs
      if (initialError === "invalid-team-name" || initialError === "duplicate-team-slug") {
        setIsOpen(true)
      }
    }

    if (initialSuccess === "created") {
      setIsOpen(false)
      setName("")
      setLogoUrl("")
      setSuccessMessage(t.account.createTeam.errors.created)
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [initialError, initialSuccess, lang, t])

  return (
    <div className={`relative flex flex-col items-stretch sm:items-center w-full sm:w-auto ${isOpen ? "z-[100]" : "z-20"}`}>
      {/* Toast Alert Feedback */}
      {successMessage && (
        <div className="fixed top-24 right-4 z-50 rounded-xl border border-emerald-500/25 bg-emerald-950/80 px-4 py-3 text-sm text-emerald-200 shadow-xl backdrop-blur-md">
          {successMessage}
        </div>
      )}

      {errorMessage && !isOpen && (
        <div className="mx-auto mb-6 max-w-md w-full rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3 text-sm text-red-200 text-center shadow-lg backdrop-blur">
          {errorMessage}
        </div>
      )}

      {/* Button to open the Modal */}
      {isLoggedIn ? (
        alreadyManagesTeam ? (
          <button
            disabled
            className="w-full rounded-xl border border-emerald-400/15 bg-emerald-400/[0.03] px-6 py-3 text-sm font-semibold text-emerald-200/60 cursor-not-allowed sm:w-auto"
          >
            {t.account.createTeam.buttonManagedLabel}
          </button>
        ) : hasApprovedPlayer ? (
          <button
            onClick={() => setIsOpen(true)}
            className="w-full rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 cursor-pointer shadow-lg shadow-emerald-950/40 sm:w-auto"
          >
            {t.account.createTeam.buttonLabel}
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-6 py-3 text-sm font-semibold text-white/40 cursor-not-allowed sm:w-auto"
            title={t.account.createTeam.errors.waitApproved}
          >
            {t.account.createTeam.buttonDisabledLabel}
          </button>
        )
      ) : (
        <a
          href="/#registration"
          className="w-full text-center rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:text-white sm:w-auto"
        >
          {t.account.createTeam.buttonLoginLabel}
        </a>
      )}

      {/* Modal Overlay & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[80] grid place-items-center px-4 py-8 overflow-y-auto">
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOpen(false)
                setErrorMessage(null)
              }}
            />
            
            <motion.div
              className={containerClassName}
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.9), transparent)",
                }}
              />
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full border border-emerald-500/10" />

              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">
                  {t.account.createTeam.errors.modalEyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">
                  {t.account.createTeam.modalTitle}
                </h2>
                <p className="mt-2 text-sm text-white/55 leading-6">
                  {t.account.createTeam.modalDesc}
                </p>

                {errorMessage && (
                  <div className="mt-4 rounded-xl border border-red-500/25 bg-red-950/50 px-4 py-3 text-xs text-red-200">
                    {errorMessage}
                  </div>
                )}

                <form action={createGlobalTeam} className="mt-6 grid gap-4" onSubmit={() => setErrorMessage(null)}>
                  <label className="space-y-2 text-sm text-white/75">
                    <span className="block font-medium">{t.account.createTeam.teamNameLabel}</span>
                    <input
                      name="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.account.createTeam.teamNamePlaceholder}
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/75">
                    <span className="block font-medium">{t.account.createTeam.logoUrlLabel}</span>
                    <input
                      name="logo_url"
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder={t.account.createTeam.logoUrlPlaceholder}
                      className={inputClassName}
                    />
                  </label>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 cursor-pointer"
                    >
                      {t.account.createTeam.buttonLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        setErrorMessage(null)
                      }}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/20 hover:text-white cursor-pointer"
                    >
                      {t.account.createTeam.cancelButton}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
