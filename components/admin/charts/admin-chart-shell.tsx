"use client"

import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

export function AdminChartShell({
  title,
  subtitle,
  children,
  className,
  accent,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <div className={cn(accent ? adminSurfaces.panelAccent : adminSurfaces.panel, "flex flex-col", className)}>
      <div className="mb-2 shrink-0">
        <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
