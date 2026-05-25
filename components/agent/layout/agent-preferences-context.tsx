"use client"

import * as React from "react"

const COMPACT_KEY = "carepilot-agent-compact"
const NOTIFY_KEY = "carepilot-agent-notify-pref"

type AgentPreferencesContextValue = {
  compact: boolean
  setCompact: (value: boolean) => void
  notifyEnabled: boolean
  setNotifyEnabled: (value: boolean) => void
}

const AgentPreferencesContext = React.createContext<AgentPreferencesContextValue | null>(null)

export function AgentPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [compact, setCompactState] = React.useState(false)
  const [notifyEnabled, setNotifyEnabledState] = React.useState(true)

  React.useEffect(() => {
    setCompactState(localStorage.getItem(COMPACT_KEY) === "1")
    setNotifyEnabledState(localStorage.getItem(NOTIFY_KEY) !== "0")
  }, [])

  const setCompact = React.useCallback((value: boolean) => {
    setCompactState(value)
    localStorage.setItem(COMPACT_KEY, value ? "1" : "0")
  }, [])

  const setNotifyEnabled = React.useCallback((value: boolean) => {
    setNotifyEnabledState(value)
    localStorage.setItem(NOTIFY_KEY, value ? "1" : "0")
  }, [])

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
