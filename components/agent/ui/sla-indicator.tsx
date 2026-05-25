import { cn } from "@/lib/utils"

export function SlaIndicator({
  label,
  tone,
}: {
  label: string
  tone: "critical" | "warning" | "success" | "neutral"
}) {
  const cls =
    tone === "critical"
      ? "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15 dark:text-destructive"
      : tone === "warning"
        ? "border-primary/35 bg-primary/10 text-foreground dark:border-primary/40 dark:bg-primary/15 dark:text-foreground"
        : tone === "success"
          ? "border-border bg-muted/35 text-muted-foreground dark:border-border dark:bg-muted/25 dark:text-muted-foreground"
          : "border-border bg-muted/30 text-muted-foreground dark:border-border dark:bg-muted/20 dark:text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        cls,
      )}
    >
      SLA · {label}
    </span>
  )
}
