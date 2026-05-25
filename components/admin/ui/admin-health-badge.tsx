import { cn } from "@/lib/utils"
import type { AdminHealth } from "@/lib/queries/admin"

const MAP: Record<AdminHealth, { label: string; className: string }> = {
  stable: { label: "Stable", className: "border-border bg-muted/50 text-foreground" },
  healthy: { label: "Healthy", className: "border-border bg-muted/50 text-foreground" },
  overloaded: { label: "Overloaded", className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200" },
  degraded: { label: "Degraded", className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200" },
  delayed: { label: "Delayed", className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200" },
  partial_failure: {
    label: "Partial failure",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
}

export function AdminHealthBadge({ health }: { health: AdminHealth }) {
  const m = MAP[health]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        m.className,
      )}
    >
      {m.label}
    </span>
  )
}
