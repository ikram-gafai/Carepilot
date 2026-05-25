"use client"

import Link from "next/link"

import { CarePilotBrandMark } from "@/components/carepilot-brand-mark"
import { useAdminPreferences } from "@/components/admin/layout/admin-preferences-context"
import { AdminSidebarProfile } from "@/components/admin/layout/admin-sidebar-profile"
import { ADMIN_NAV } from "@/lib/admin-nav"
import { adminSurfaces } from "@/lib/admin-surface"
import type { CarePilotSessionUser } from "@/lib/auth/session"
import { cn } from "@/lib/utils"

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string
  items: readonly { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]
  pathname: string
}) {
  return (
    <div className="px-2 py-1">
      <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      <div className="flex flex-col gap-px">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
                active ? adminSurfaces.navActive : adminSurfaces.navIdle,
              )}
            >
              <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function AdminSidebar({
  pathname,
  sessionUser,
}: {
  pathname: string
  sessionUser?: CarePilotSessionUser | null
}) {
  const { compact } = useAdminPreferences()

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r",
        adminSurfaces.sidebar,
        compact ? "w-[12.25rem]" : "w-[13.5rem]",
      )}
    >
      <div className="flex h-12 items-center border-b border-zinc-200/90 px-3">
        <CarePilotBrandMark href="/admin/dashboard" priority />
      </div>
      <nav className="flex-1 overflow-y-auto border-b border-zinc-200/80 py-2">
        <NavGroup title="Overview" items={ADMIN_NAV.overview} pathname={pathname} />
        <div className={cn("mx-3 my-1 h-px", adminSurfaces.sidebarDivider)} />
        <NavGroup title="Operations" items={ADMIN_NAV.operations} pathname={pathname} />
        <div className={cn("mx-3 my-1 h-px", adminSurfaces.sidebarDivider)} />
        <NavGroup title="AI" items={ADMIN_NAV.ai} pathname={pathname} />
        <div className={cn("mx-3 my-1 h-px", adminSurfaces.sidebarDivider)} />
        <NavGroup title="Team" items={ADMIN_NAV.team} pathname={pathname} />
      </nav>
      <div className={cn("mt-auto border-t border-zinc-200/90", compact ? "p-2" : "p-2.5")}>
        <AdminSidebarProfile sessionUser={sessionUser} />
      </div>
    </aside>
  )
}
