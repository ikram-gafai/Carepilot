import { Badge } from "@/components/ui/badge"
import {
  TICKET_SIGNAL_LABELS,
  type TicketSignalKey,
} from "@/lib/cp-agent/ticket-workflow"
import { cn } from "@/lib/utils"

const tone: Record<TicketSignalKey, string> = {
  n3: "border-destructive/35 bg-destructive/10 text-destructive",
  routing: "border-primary/30 bg-primary/[0.08] text-foreground",
  missing_context: "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  sla: "border-orange-500/35 bg-orange-500/10 text-orange-900 dark:text-orange-100",
  km: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
}

export function TicketSignalsBadges({
  signals,
  className,
}: {
  signals: TicketSignalKey[]
  className?: string
}) {
  if (signals.length === 0) {
    return <span className="text-[11px] text-muted-foreground">—</span>
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {signals.map((key) => (
        <Badge
          key={key}
          variant="outline"
          className={cn("rounded-md px-1.5 py-0 text-[10px] font-medium", tone[key])}
        >
          {TICKET_SIGNAL_LABELS[key]}
        </Badge>
      ))}
    </div>
  )
}
