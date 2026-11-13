"use client"

import * as React from "react"

import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag"

const COMPACT_KEY = "carepilot-admin-compact"
const NOTIFY_KEY = "carepilot-admin-notify-pref"

type AdminPreferencesContextValue = {
  compact: boolean
  setCompact: (value: boolean) => void
  notifyEnabled: boolean
  setNotifyEnabled: (value: boolean) => void
}

const AdminPreferencesContext = React.createContext<AdminPreferencesContextValue | null>(null)

const parseCompact = (raw: string | null) => raw === "1"
const parseNotify = (raw: string | null) => raw !== "0"

export function AdminPreferencesProvider({ children }: { children: React.ReactNode }) {
  // Server render and hydration use the defaults; stored values apply right after hydration.
  const [compact, setCompact] = useLocalStorageFlag(COMPACT_KEY, parseCompact, false)
  const [notifyEnabled, setNotifyEnabled] = useLocalStorageFlag(NOTIFY_KEY, parseNotify, true)

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
