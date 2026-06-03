"use client"

import React from "react"

export type ProfileTabItem<T extends string> = {
  id: T
  label: string
}

export function ProfileTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: ProfileTabItem<T>[]
  activeTab: T
  onChange: (tab: T) => void
}) {
  return (
    <div className="mt-6 overflow-x-auto scrollbar-thin">
      <div
        role="tablist"
        className="flex min-w-max gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`max-w-[12rem] truncate rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wider transition ${
                isActive
                  ? "bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function useProfileTab<T extends string>(validTabs: readonly T[], defaultTab: T) {
  const [activeTab, setActiveTab] = React.useState<T>(defaultTab)
  const validTabsKey = validTabs.join("|")

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get("tab") || window.location.hash.replace("#", "")

    if (validTabsKey.split("|").includes(requestedTab)) {
      setActiveTab(requestedTab as T)
    }
  }, [validTabsKey])

  const changeTab = React.useCallback(
    (tab: T) => {
      setActiveTab(tab)

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        url.searchParams.set("tab", tab)
        url.hash = tab
        window.history.replaceState(null, "", url.toString())
      }
    },
    [],
  )

  return [activeTab, changeTab] as const
}
