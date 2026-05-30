"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Shield, Terminal } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AdminLoginForm } from "@/app/admin/login-form"
import { loginAdmin, checkAdminPassword, getAdminAuthHealthAction } from "@/app/admin/actions"
import type { AdminAuthHealth } from "@/lib/admin/types"

type AdminLoginOverlayProps = {
  isOpen: boolean
  onClose: () => void
}

export function AdminLoginOverlay({ isOpen, onClose }: AdminLoginOverlayProps) {
  const { t, lang } = useLanguage()
  const [error, setError] = useState<string | undefined>(undefined)
  const [retryAfter, setRetryAfter] = useState<string | undefined>(undefined)
  const [health, setHealth] = useState<AdminAuthHealth | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Sync health indicators on modal open
  useEffect(() => {
    if (isOpen) {
      getAdminAuthHealthAction().then((h) => setHealth(h))
      setError(undefined)
      setRetryAfter(undefined)
    }
  }, [isOpen])

  // Escape key event listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleLoginSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(undefined)
    setRetryAfter(undefined)

    const password = formData.get("password") as string

    // 1. Client-safe password validation pre-flight check
    const res = await checkAdminPassword(password)
    if (!res.ok) {
      setError(res.error)
      if (res.retryAfter) {
        setRetryAfter(res.retryAfter)
      }
      setIsLoading(false)
      return
    }

    // 2. Verified password! Proceed with Next.js standard Server Action redirecting login flow
    try {
      await loginAdmin(formData)
    } catch (err) {
      // loginAdmin redirects the client-side router on success.
    }
    setIsLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Fade-in */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.section
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
            className="relative w-full max-w-md rounded-2xl border border-emerald-500/20 bg-neutral-950 p-6 shadow-[0_0_50px_rgba(52,211,153,0.12)] overflow-hidden"
          >
            {/* Cyber Scanline/Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(52,211,153,0.3),rgba(52,211,153,0.1),rgba(52,211,153,0.3))] bg-[size:100%_4px,3px_100%] animate-pulse" />

            {/* Header content */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.2)] animate-pulse">
                  <Shield className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                    {t.admin.subtitle}
                  </p>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    {t.admin.login.title}
                  </h2>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition"
                aria-label="Close admin access overlay"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Subtext description */}
            <p className="mt-3.5 text-xs text-white/55 leading-relaxed flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{t.admin.login.desc}</span>
            </p>

            {/* Login Form Wrapper */}
            <div className="relative mt-2">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/60 rounded-xl backdrop-blur-xs">
                  <div className="h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <AdminLoginForm
                action={handleLoginSubmit}
                error={error}
                health={health}
                retryAfter={retryAfter}
              />
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  )
}
