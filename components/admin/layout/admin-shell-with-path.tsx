"use client"

import { usePathname } from "next/navigation"

import {
  AdminHeaderProvider,
  AdminShellHeader,
} from "@/components/admin/layout/admin-header-context"
import { AdminPreferencesProvider } from "@/components/admin/layout/admin-preferences-context"
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar"
import { Toaster } from "@/components/ui/sonner"
import type { CarePilotSessionUser } from "@/lib/auth/session"
import { adminSurfaces } from "@/lib/admin-surface"

export function AdminShellWithPath({
  children,
  sessionUser,
}: {
  children: React.ReactNode
  sessionUser?: CarePilotSessionUser | null
}) {
  const pathname = usePathname()
  return (
    <AdminPreferencesProvider>
      <AdminHeaderProvider>
        <div className={`flex h-dvh overflow-hidden ${adminSurfaces.page}`}>
          <AdminSidebar pathname={pathname} sessionUser={sessionUser} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <AdminShellHeader />
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </AdminHeaderProvider>
      <Toaster />
    </AdminPreferencesProvider>
  )
}
