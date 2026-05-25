import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const map: Record<string, { className: string; label: string }> = {
  P1: {
    className:
      "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15 dark:text-destructive",
    label: "P1",
  },
  P2: {
    className:
      "border-primary/35 bg-primary/10 text-foreground dark:border-primary/40 dark:bg-primary/15 dark:text-foreground",
    label: "P2",
  },
  P3: {
    className:
      "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
    label: "P3",
  },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const m = map[priority] ?? {
    className: "border-border bg-muted/40 text-foreground dark:border-border dark:bg-muted/30 dark:text-foreground",
    label: priority,
  }
  return (
    <Badge variant="outline" className={cn("rounded-md px-2 py-0 text-[11px] font-semibold", m.className)}>
      {m.label}
    </Badge>
  )
}
