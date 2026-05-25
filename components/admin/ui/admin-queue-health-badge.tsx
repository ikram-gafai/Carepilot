import { cn } from "@/lib/utils"
import type { QueueDisplayHealth } from "@/lib/admin/queue-metrics"

const MAP: Record<QueueDisplayHealth, string> = {
  healthy: "border-border bg-muted/40 text-foreground",
  stable: "border-border bg-muted/40 text-muted-foreground",
  degraded: "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100",
  critical: "border-destructive/35 bg-destructive/5 text-destructive",
}

export function AdminQueueHealthBadge({ health }: { health: QueueDisplayHealth }) {
  const label = health.charAt(0).toUpperCase() + health.slice(1)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
        MAP[health],
      )}
    >
      {label}
    </span>
  )
}
