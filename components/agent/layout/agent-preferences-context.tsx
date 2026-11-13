"use client"

import * as React from "react"

import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag"

const COMPACT_KEY = "carepilot-agent-compact"
const NOTIFY_KEY = "carepilot-agent-notify-pref"

type AgentPreferencesContextValue = {
  compact: boolean
  setCompact: (value: boolean) => void
  notifyEnabled: boolean
  setNotifyEnabled: (value: boolean) => void
}

const AgentPreferencesContext = React.createContext<AgentPreferencesContextValue | null>(null)

const parseCompact = (raw: string | null) => raw === "1"
const parseNotify = (raw: string | null) => raw !== "0"

export function AgentPreferencesProvider({ children }: { children: React.ReactNode }) {
  // Server render and hydration use the defaults; stored values apply right after hydration.
  const [compact, setCompact] = useLocalStorageFlag(COMPACT_KEY, parseCompact, false)
  const [notifyEnabled, setNotifyEnabled] = useLocalStorageFlag(NOTIFY_KEY, parseNotify, true)

  const value = React.useMemo(
    () => ({ compact, setCompact, notifyEnabled, setNotifyEnabled }),
    [compact, notifyEnabled, setCompact, setNotifyEnabled],
  )

  return <AgentPreferencesContext.Provider value={value}>{children}</AgentPreferencesContext.Provider>
}

export function useAgentPreferences() {
  const ctx = React.useContext(AgentPreferencesContext)
  if (!ctx) {
    throw new Error("useAgentPreferences must be used within AgentPreferencesProvider")
  }
  return ctx
}
