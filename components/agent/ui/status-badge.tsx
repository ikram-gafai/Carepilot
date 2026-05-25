import { Badge } from "@/components/ui/badge"
import { ticketStatusUiLabel } from "@/lib/care-operational-actions"
import { cn } from "@/lib/utils"

const transferTone =
  "border-primary/30 bg-primary/[0.07] text-foreground dark:border-primary/35 dark:bg-primary/10 dark:text-foreground"

const tone: Record<string, string> = {
  OPEN:
    "border-border bg-muted/40 text-foreground dark:border-border dark:bg-muted/30 dark:text-foreground",
  IN_PROGRESS:
    "border-primary/35 bg-primary/10 text-foreground dark:border-primary/40 dark:bg-primary/15 dark:text-foreground",
  ESCALATED:
    "border-destructive/35 bg-destructive/10 text-destructive dark:border-destructive/45 dark:bg-destructive/12 dark:text-destructive",
  MONITORING:
    "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/12 dark:text-amber-100",
  WAITING_STORE:
    "border-border bg-muted/40 text-muted-foreground dark:border-border dark:bg-muted/25 dark:text-muted-foreground",
  ESCALATED_N3:
    "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15 dark:text-destructive",
  RESOLVED:
    "border-border bg-muted/30 text-muted-foreground dark:border-border dark:bg-muted/20 dark:text-muted-foreground",
  TRANSFERRED_MON: transferTone,
  TRANSFERRED_MAT: transferTone,
  TRANSFERRED_BO: transferTone,
  TRANSFERRED_RES: transferTone,
  TRANSFERRED_BUR: transferTone,
  TRANSFERRED_INF: transferTone,
  SUSPENDED:
    "border-border bg-muted/50 text-foreground dark:border-border dark:bg-muted/35 dark:text-foreground",
}

export function agentTicketStatusLabel(status: string): string {
  return ticketStatusUiLabel(status)
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    tone[status] ??
    "border-border bg-muted/40 text-foreground dark:border-border dark:bg-muted/30 dark:text-foreground"
  return (
    <Badge variant="outline" className={cn("rounded-md px-2 py-0 text-[11px] font-medium", cls)}>
      {agentTicketStatusLabel(status)}
    </Badge>
  )
}
