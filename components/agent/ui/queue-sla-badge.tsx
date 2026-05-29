import { formatQueueSlaLabel } from "@/lib/agent/ticket-queue-display"
import { cn } from "@/lib/utils"

export function QueueSlaBadge({ slaLabel }: { slaLabel: string }) {
  const { label, tone } = formatQueueSlaLabel(slaLabel)
  const cls =
    tone === "critical"
      ? "border-destructive/35 bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "border-primary/30 bg-primary/10 text-foreground"
        : tone === "success"
          ? "border-border/80 bg-muted/30 text-muted-foreground"
          : "border-border bg-muted/20 text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        cls,
      )}
    >
      {label}
    </span>
  )
}
