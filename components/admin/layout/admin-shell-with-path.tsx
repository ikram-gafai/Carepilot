"use client"

import { usePathname } from "next/navigation"

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
      <div className={`flex min-h-dvh ${adminSurfaces.page}`}>
        <AdminSidebar pathname={pathname} sessionUser={sessionUser} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <Toaster />
    </AdminPreferencesProvider>
  )
}
