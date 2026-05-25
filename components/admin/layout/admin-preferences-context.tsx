"use client"

import * as React from "react"

const COMPACT_KEY = "carepilot-admin-compact"
const NOTIFY_KEY = "carepilot-admin-notify-pref"

type AdminPreferencesContextValue = {
  compact: boolean
  setCompact: (value: boolean) => void
  notifyEnabled: boolean
  setNotifyEnabled: (value: boolean) => void
}

const AdminPreferencesContext = React.createContext<AdminPreferencesContextValue | null>(null)

export function AdminPreferencesProvider({ children }: { children: React.ReactNode }) {
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

  return <AdminPreferencesContext.Provider value={value}>{children}</AdminPreferencesContext.Provider>
}

export function useAdminPreferences() {
  const ctx = React.useContext(AdminPreferencesContext)
  if (!ctx) {
    throw new Error("useAdminPreferences must be used within AdminPreferencesProvider")
  }
  return ctx
}
