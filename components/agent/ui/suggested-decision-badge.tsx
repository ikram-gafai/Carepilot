import { baseDecisionFromLabel } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { cn } from "@/lib/utils"

const DECISION_STYLES: Record<string, string> = {
  REQUEST_INFORMATION: "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  RESOLVE: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
  ESCALATE_N3: "border-destructive/30 bg-destructive/10 text-destructive",
  TRANSFER: "border-primary/30 bg-primary/10 text-foreground",
  SUSPEND: "border-border bg-muted/25 text-muted-foreground",
}

export function SuggestedDecisionBadge({ label }: { label: string }) {
  const display = label && label !== "—" ? label : "—"
  const base = baseDecisionFromLabel(display)
  const style =
    (base && DECISION_STYLES[base]) ??
    "border-border bg-muted/20 text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex max-w-[14rem] items-center truncate rounded-md border px-2 py-0.5 text-[11px] font-medium",
        style,
      )}
      title={display}
    >
      {display}
    </span>
  )
}
