"use client"

import { useState } from "react"
import { m } from "framer-motion"
import {
  dismissPlayerOnboarding,
  submitPlayerApplication,
} from "@/app/actions/player-applications"
import { useLanguage } from "@/components/language-provider"
import type { UserProfile } from "@/lib/auth/user-profile"

type PlayerOnboardingModalProps = {
  userProfile: UserProfile | null
  hasApprovedPlayer: boolean
  hasApplication: boolean
  forceOpen?: boolean
  onClose?: () => void
}

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none transition focus:border-primary/60"

const advisoryClassName =
  "mt-4 rounded-xl border border-red-300/25 border-l-red-300/60 bg-red-400/[0.08] px-4 py-3 text-sm leading-6 text-red-50/88 shadow-[0_0_34px_rgba(248,113,113,0.14)]"

export function PlayerOnboardingModal({
  userProfile,
  hasApprovedPlayer,
  hasApplication,
  forceOpen = false,
  onClose,
}: PlayerOnboardingModalProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const { t } = useLanguage()

  if (
    !userProfile ||
    (userProfile.onboarding_seen_at && !forceOpen) ||
    hasApprovedPlayer ||
    hasApplication ||
    (isHidden && !forceOpen)
  ) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center px-4 py-8">
      <m.div
        className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => {
          setIsHidden(true)
          onClose?.()
        }}
      />
      <m.div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-primary/25 bg-[oklch(0.08_0.015_180/0.96)] p-6 shadow-[0_0_80px_rgba(0,200,150,0.18)]"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <button
          type="button"
          onClick={() => {
            setIsHidden(true)
            onClose?.()
          }}
          className="absolute right-4 top-4 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white transition cursor-pointer z-10"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
            {t.playerOnboarding.discordConnected}
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            {t.playerOnboarding.becomePlayer}
          </h2>
          <p className={advisoryClassName}>
            {t.playerOnboarding.advisory}
          </p>

          {isApplying ? (
            <form action={submitPlayerApplication} className="mt-6 grid gap-3">
              <label className="space-y-2 text-sm text-white/75">
                <span className="block">{t.playerOnboarding.nickname}</span>
                <input
                  name="requested_nickname"
                  required
                  defaultValue={userProfile.display_name}
                  className={inputClassName}
                />
              </label>
              <label className="space-y-2 text-sm text-white/75">
                <span className="block">{t.registration.fields.region}</span>
                <input
                  name="requested_region"
                  className={inputClassName}
                  placeholder={t.registration.fields.regionPlaceholder}
                />
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-black transition hover:bg-primary/90 cursor-pointer"
                >
                  {t.playerOnboarding.submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white cursor-pointer"
                >
                  {t.playerOnboarding.back}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsApplying(true)}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-black transition hover:bg-primary/90 cursor-pointer"
              >
                {t.playerOnboarding.apply}
              </button>
              <form
                action={dismissPlayerOnboarding}
                onSubmit={() => {
                  setIsHidden(true)
                  onClose?.()
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white cursor-pointer"
                >
                  {t.playerOnboarding.continueBrowsing}
                </button>
              </form>
            </div>
          )}
        </div>
      </m.div>
    </div>
  )
}
