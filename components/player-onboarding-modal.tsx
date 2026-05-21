"use client"

import { useState } from "react"
import { m } from "framer-motion"
import {
  dismissPlayerOnboarding,
  submitPlayerApplication,
} from "@/app/actions/player-applications"
import type { UserProfile } from "@/lib/auth/user-profile"

type PlayerOnboardingModalProps = {
  userProfile: UserProfile | null
  hasApprovedPlayer: boolean
  hasApplication: boolean
}

const inputClassName =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none transition focus:border-primary/60"

export function PlayerOnboardingModal({
  userProfile,
  hasApprovedPlayer,
  hasApplication,
}: PlayerOnboardingModalProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  if (
    !userProfile ||
    userProfile.onboarding_seen_at ||
    hasApprovedPlayer ||
    hasApplication ||
    isHidden
  ) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center px-4 py-8">
      <m.div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <m.div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-primary/25 bg-[oklch(0.08_0.015_180/0.96)] p-6 shadow-[0_0_80px_rgba(0,200,150,0.18)]"
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
            Discord Connected
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            Become an Eclyps Player?
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/68">
            You do not need to become a player to browse tournaments, matches,
            rankings, and results. Apply only if you want to participate in
            Eclyps tournaments.
          </p>

          {isApplying ? (
            <form action={submitPlayerApplication} className="mt-6 grid gap-3">
              <label className="space-y-2 text-sm text-white/75">
                <span className="block">Player nickname</span>
                <input
                  name="requested_nickname"
                  required
                  defaultValue={userProfile.display_name}
                  className={inputClassName}
                />
              </label>
              <label className="space-y-2 text-sm text-white/75">
                <span className="block">Region</span>
                <input
                  name="requested_region"
                  className={inputClassName}
                  placeholder="Ukraine, EU, North America"
                />
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-black transition hover:bg-primary/90"
                >
                  Submit Application
                </button>
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsApplying(true)}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-black transition hover:bg-primary/90"
              >
                Apply as Player
              </button>
              <form
                action={dismissPlayerOnboarding}
                onSubmit={() => setIsHidden(true)}
              >
                <button
                  type="submit"
                  className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  Continue Browsing
                </button>
              </form>
            </div>
          )}
        </div>
      </m.div>
    </div>
  )
}
