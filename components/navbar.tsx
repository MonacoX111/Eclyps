"use client"

import { useState } from "react"
import { m } from "framer-motion"
import Image from "next/image"

type NavbarProps = {
  participantLabel?: "Teams" | "Players"
}

export function Navbar({ participantLabel = "Teams" }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const navLinks = [
    { href: "#tournament", label: "Tournament" },
    { href: "#teams", label: participantLabel },
    { href: "#schedule", label: "Schedule" },
    { href: "#results", label: "Results" },
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
          <a href="#" className="flex items-center gap-2">
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
          </div>

          {/* Mobile menu button */}
          <button
            className="flex flex-col gap-1.5 md:hidden"
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
          </div>
        </m.div>
      )}
    </m.nav>
  )
}
