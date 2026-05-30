"use client"

import { useEffect, useState } from "react"
import { AdminLoginOverlay } from "@/components/admin/admin-login-overlay"

export function AdminShortcut() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      ) {
        return
      }

      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "e") {
        event.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <>
      <AdminLoginOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
