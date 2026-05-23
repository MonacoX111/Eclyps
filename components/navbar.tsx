"use client"

import { useState } from "react"
import { m } from "framer-motion"
import Image from "next/image"
import { logoutDiscord } from "@/app/auth/actions"
import { DiscordLoginOnboarding } from "@/components/discord-login-onboarding"
import { useLanguage } from "@/components/language-provider"
import type { UserProfile } from "@/lib/auth/user-profile"

type NavbarProps = {
  participantLabel?: "Teams" | "Players"
  homeHref?: string
  navHrefPrefix?: string
  userProfile?: UserProfile | null
}

export function Navbar({
  participantLabel = "Teams",
  homeHref = "/",
  navHrefPrefix = "",
  userProfile = null,
}: NavbarProps) {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  const participantHref = participantLabel === "Players" ? "/players" : "/teams"
  const navLinks = [
    { href: "/tournament", label: t.navbar.tournament },
    { href: "/registration", label: t.navbar.registration },
    { href: participantHref, label: participantLabel === "Players" ? t.navbar.players : t.navbar.teams },
    { href: "/bracket", label: t.navbar.bracket },
    { href: "/schedule", label: t.navbar.schedule },
    { href: "/results", label: t.navbar.results },
  ]

  return (
    <m.nav
      className="fixed left-0 right-0 top-0 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div
        className="border-b"
        style={{
          background: "oklch(0.07 0.01 180 / 0.8)",
          backdropFilter: "blur(16px)",
          borderColor: "oklch(0.78 0.18 165 / 0.1)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <a href={homeHref} className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Eclyps logo"
              width={36}
              height={36}
              loading="lazy"
              sizes="36px"
              className="h-9 w-9 object-contain"
            />
            <span className="hidden text-sm font-bold tracking-wider uppercase text-foreground sm:inline">
              Eclyps
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <AuthControl userProfile={userProfile} />
            </div>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher />
            <MobileAuthAvatar userProfile={userProfile} />
            <button
              className="flex flex-col gap-1.5"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              <span
                className="block h-0.5 w-5 transition-all duration-200"
                style={{
                  background: "oklch(0.78 0.18 165)",
                  transform: open ? "rotate(45deg) translate(2px, 3px)" : "none",
                }}
              />
              <span
                className="block h-0.5 w-5 transition-all duration-200"
                style={{
                  background: "oklch(0.78 0.18 165)",
                  opacity: open ? 0 : 1,
                }}
              />
              <span
                className="block h-0.5 w-5 transition-all duration-200"
                style={{
                  background: "oklch(0.78 0.18 165)",
                  transform: open ? "rotate(-45deg) translate(2px, -3px)" : "none",
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <m.div
          className="border-b md:hidden"
          style={{
            background: "oklch(0.07 0.01 180 / 0.95)",
            backdropFilter: "blur(16px)",
            borderColor: "oklch(0.78 0.18 165 / 0.1)",
          }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col gap-4 px-4 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <AuthControl userProfile={userProfile} mobile />
          </div>
        </m.div>
      )}
    </m.nav>
  )
}

function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/30 p-0.5 shrink-0">
      <button
        type="button"
        onClick={() => setLanguage("uk")}
        className={`rounded-full px-2 py-1 text-[10px] font-bold transition-all duration-200 cursor-pointer ${
          lang === "uk"
            ? "bg-primary text-black shadow-[0_0_12px_oklch(0.78_0.18_165_/_0.4)] font-extrabold"
            : "text-white/60 hover:text-white"
        }`}
      >
        UK
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-full px-2 py-1 text-[10px] font-bold transition-all duration-200 cursor-pointer ${
          lang === "en"
            ? "bg-primary text-black shadow-[0_0_12px_oklch(0.78_0.18_165_/_0.4)] font-extrabold"
            : "text-white/60 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  )
}

function AuthControl({
  userProfile,
  mobile = false,
}: {
  userProfile: UserProfile | null
  mobile?: boolean
}) {
  const { t } = useLanguage()

  if (!userProfile) {
    return (
      <DiscordLoginOnboarding
        label={t.navbar.loginDiscord}
        className={`rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary/60 hover:bg-primary/15 ${
          mobile ? "w-full text-center" : ""
        }`}
      />
    )
  }

  return (
    <form
      action={logoutDiscord}
      className={`flex items-center gap-3 ${mobile ? "justify-between" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Avatar userProfile={userProfile} />
        <span className="max-w-36 truncate text-sm font-medium text-white/80">
          {userProfile.discord_username}
        </span>
      </div>
      <button
        type="submit"
        className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-primary/40 hover:text-primary cursor-pointer"
      >
        {t.navbar.logout}
      </button>
    </form>
  )
}

function MobileAuthAvatar({ userProfile }: { userProfile: UserProfile | null }) {
  if (!userProfile) return null

  return <Avatar userProfile={userProfile} />
}

function Avatar({ userProfile }: { userProfile: UserProfile }) {
  if (userProfile.avatar_url) {
    return (
      <Image
        src={userProfile.avatar_url}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-full border border-primary/30 object-cover"
      />
    )
  }

  return (
    <span className="grid h-7 w-7 place-items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
      {userProfile.discord_username.slice(0, 1).toUpperCase()}
    </span>
  )
}
