import type React from "react"

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-white">
      {children}
    </main>
  )
}
