"use client"

import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

export function AdminChartShell({
  title,
  children,
  className,
  accent,
}: {
  title: string
  children: React.ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <div className={cn(accent ? adminSurfaces.panelAccent : adminSurfaces.panel, "flex flex-col", className)}>
      <h3 className="mb-2 shrink-0 text-sm font-medium text-zinc-900">{title}</h3>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
