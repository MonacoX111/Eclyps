"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { m } from "framer-motion"
import { loginWithDiscord } from "@/app/auth/actions"

type DiscordLoginOnboardingProps = {
  className?: string
  label?: string
}

export function DiscordLoginOnboarding({
  className,
  label = "Login with Discord",
}: DiscordLoginOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const modal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center overflow-y-auto px-4 py-8">
            <m.button
              type="button"
              aria-label="Close Discord login prompt"
              className="fixed inset-0 bg-black/80 backdrop-blur-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setIsOpen(false)}
            />
            <m.div
              className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-primary/25 bg-[oklch(0.08_0.015_180/0.98)] p-6 shadow-[0_0_80px_rgba(0,200,150,0.24)]"
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, oklch(0.78 0.18 165 / 0.9), transparent)",
                }}
              />
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full border border-primary/20" />

              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
                  Before Discord Auth
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  Become an Eclyps Player?
                </h2>
                <p className="mt-4 text-sm leading-6 text-white/68">
                  You do not need to become a player to browse tournaments,
                  matches, rankings, and results. Continue to Discord only if you
                  want to start the player application path.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <form action={loginWithDiscord}>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-black transition hover:bg-primary/90"
                    >
                      Yes, continue
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
                  >
                    Continue Browsing
                  </button>
                </div>
              </div>
            </m.div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {label}
      </button>
      {modal}
    </>
  )
}
