"use client"

import { useState, useEffect } from "react"
import { m } from "framer-motion"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronDown, CircleHelp } from "lucide-react"
import { logoutDiscord } from "@/app/auth/actions"
import { DiscordLoginOnboarding } from "@/components/discord-login-onboarding"
import { useLanguage } from "@/components/language-provider"
import type { UserProfile } from "@/lib/auth/user-profile"
import { withAvatarCacheBust } from "@/lib/avatar"
import { NotificationsBell } from "@/components/notifications-bell"
import { FirstVisitGuide, FIRST_VISIT_GUIDE_OPEN_EVENT } from "@/components/first-visit-guide"

type NavbarProps = {
  participantLabel?: "Teams" | "Players"
  homeHref?: string
  navHrefPrefix?: string
  userProfile?: UserProfile | null
  autoShowGuide?: boolean
}

export function Navbar({
  participantLabel = "Teams",
  homeHref = "/",
  navHrefPrefix = "",
  userProfile = null,
  autoShowGuide,
}: NavbarProps) {
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { t, lang } = useLanguage()
  const pathname = usePathname()
  const shouldAutoShowGuide = autoShowGuide ?? (pathname === "/" && !userProfile)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const primaryNavLinks = [
    { href: "/tournament", label: t.navbar.tournament },
    { href: "/registration", label: t.navbar.registration },
    { href: "/teams", label: t.navbar.teams },
    { href: "/players", label: t.navbar.players },
    { href: "/matches", label: t.navbar.matches },
  ]
  const secondaryNavLinks = [
    { href: "/rankings", label: lang === "uk" ? "Рейтинг" : "Rankings" },
    { href: "/tournaments", label: t.navbar.archive },
    { href: "/news", label: t.navbar.news },
  ]
  const mobileNavLinks = [...primaryNavLinks, ...secondaryNavLinks]

  return (
    <>
      <FirstVisitGuide autoOpen={shouldAutoShowGuide} />
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
          {/* Logo */}
          <a href={homeHref} className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Eclyps logo"
              width={36}
              height={36}
              loading="lazy"
              sizes="36px"
              className="h-8 w-8 object-contain sm:h-9 sm:w-9"
            />
            <span className="hidden text-sm font-bold tracking-wider uppercase text-foreground sm:inline">
              Eclyps
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden items-center gap-5 md:flex lg:gap-7">
            {primaryNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((value) => !value)}
                onBlur={() => window.setTimeout(() => setMoreOpen(false), 120)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
                aria-expanded={moreOpen}
              >
                {t.navbar.more}
                <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen ? (
                <div className="glass-card absolute right-0 top-8 z-50 grid min-w-40 gap-1 rounded-xl border border-white/10 bg-black/90 p-2 shadow-[0_18px_60px_oklch(0.02_0.01_180_/_0.55)]">
                  {secondaryNavLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-primary/10 hover:text-primary"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-4">
              <GuideButton />
              <LanguageSwitcher />
              {userProfile && <NotificationsBell userProfile={userProfile} />}
              <AuthControl userProfile={userProfile} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 md:hidden">
            <LanguageSwitcher />
            {userProfile && <NotificationsBell userProfile={userProfile} />}
            <MobileAuthAvatar userProfile={userProfile} />
            <button
              className="-mr-2 flex flex-col gap-1.5 p-2 cursor-pointer"
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
          <div className="flex max-h-[calc(100svh-4rem)] flex-col gap-3 overflow-y-auto px-4 py-5">
            {mobileNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-primary"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <GuideButton mobile onClick={() => setOpen(false)} />
            <AuthControl userProfile={userProfile} mobile />
          </div>
        </m.div>
      )}
      </m.nav>
    </>
  )
}

function GuideButton({ mobile = false, onClick }: { mobile?: boolean; onClick?: () => void }) {
  const { t } = useLanguage()

  const openGuide = () => {
    window.dispatchEvent(new CustomEvent(FIRST_VISIT_GUIDE_OPEN_EVENT))
    onClick?.()
  }

  return (
    <button
      type="button"
      onClick={openGuide}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary/55 hover:bg-primary/15 ${
        mobile ? "w-full" : ""
      }`}
    >
      <CircleHelp className="h-4 w-4" />
      {t.navbar.guide}
    </button>
  )
}

function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage()

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-black/30 p-0.5">
      <button
        type="button"
        onClick={() => setLanguage("uk")}
        className={`rounded-full px-1.5 py-1 text-[10px] font-bold transition-all duration-200 cursor-pointer sm:px-2 ${
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
        className={`rounded-full px-1.5 py-1 text-[10px] font-bold transition-all duration-200 cursor-pointer sm:px-2 ${
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
    <div className={`flex items-center gap-3 ${mobile ? "justify-between w-full" : ""}`}>
      <a
        href="/account"
        className="flex min-w-0 items-center gap-2 hover:text-primary transition group cursor-pointer"
      >
        <Avatar userProfile={userProfile} />
        <span className="max-w-36 truncate text-sm font-medium text-white/80 group-hover:text-primary transition">
          {userProfile.discord_username}
        </span>
      </a>
      <form action={logoutDiscord} className="shrink-0">
        <button
          type="submit"
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-primary/40 hover:text-primary cursor-pointer"
        >
          {t.navbar.logout}
        </button>
      </form>
    </div>
  )
}

function MobileAuthAvatar({ userProfile }: { userProfile: UserProfile | null }) {
  if (!userProfile) return null

  return (
    <a href="/account" className="cursor-pointer hover:opacity-80 transition shrink-0">
      <Avatar userProfile={userProfile} />
    </a>
  )
}

function Avatar({ userProfile }: { userProfile: UserProfile }) {
  const avatarUrl = withAvatarCacheBust(userProfile.avatar_url, userProfile.updated_at)

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
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