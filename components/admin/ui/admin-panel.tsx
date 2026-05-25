import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

export function AdminPanel({
  children,
  className,
  accent,
}: {
  children: React.ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <div className={cn(accent ? adminSurfaces.panelAccent : adminSurfaces.panel, className)}>{children}</div>
  )
}
