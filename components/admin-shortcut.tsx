"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminLoginOverlay } from "@/components/admin/admin-login-overlay"
import { isAdminAuthenticatedAction } from "@/app/admin/actions"

export const ADMIN_ACCESS_EVENT = "eclyps:admin-access"

export function AdminShortcut() {
  const [isOpen, setIsOpen] = useState(false)

  const requestAccess = useCallback(() => {
    isAdminAuthenticatedAction().then((authenticated) => {
      if (authenticated) {
        window.location.href = "/admin"
      } else {
        setIsOpen(true)
      }
    })
  }, [])

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
        requestAccess()
      }
    }

    function handleAccessEvent() {
      requestAccess()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener(ADMIN_ACCESS_EVENT, handleAccessEvent)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener(ADMIN_ACCESS_EVENT, handleAccessEvent)
    }
  }, [requestAccess])

  return (
    <>
      <AdminLoginOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
