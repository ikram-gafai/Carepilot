"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { AdminHeader } from "@/components/admin/layout/admin-header"
import { getAdminPageMeta } from "@/lib/admin-page-meta"

type AdminHeaderContextValue = {
  actions: React.ReactNode | null
  setActions: React.Dispatch<React.SetStateAction<React.ReactNode | null>>
}

const AdminHeaderContext = React.createContext<AdminHeaderContextValue | null>(null)

export function AdminHeaderProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = React.useState<React.ReactNode | null>(null)
  const value = React.useMemo(() => ({ actions, setActions }), [actions])

  return <AdminHeaderContext.Provider value={value}>{children}</AdminHeaderContext.Provider>
}

export function AdminShellHeader() {
  const pathname = usePathname()
  const ctx = React.useContext(AdminHeaderContext)
  const meta = getAdminPageMeta(pathname)

  if (!meta) return null

  return (
    <AdminHeader title={meta.title} description={meta.description}>
      {ctx?.actions}
    </AdminHeader>
  )
}

/** Registers right-aligned toolbar controls for {@link AdminShellHeader}. */
export function AdminSetHeaderActions({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(AdminHeaderContext)
  const setActions = ctx?.setActions

  React.useLayoutEffect(() => {
    if (!setActions) return
    setActions(children)
    return () => setActions(null)
  }, [children, setActions])

  return null
}
