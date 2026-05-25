import type { AdminHealth } from "@/lib/queries/admin"
import { cn } from "@/lib/utils"

/** Card shell — zinc border by default; accent only when something needs attention. */
export function adminCardShell(risk?: "watch" | "critical" | false) {
  return cn(
    "rounded-xl border border-border/90 bg-card shadow-sm dark:border-zinc-800",
    risk === "watch" && "border-amber-500/35",
    risk === "critical" && "border-destructive/40",
  )
}

export function metricCellClass(value: number, kind: "risk" | "escalation") {
  if (value <= 0) return "font-mono tabular-nums text-foreground"
  if (kind === "escalation") return "font-mono tabular-nums text-destructive"
  return "font-mono tabular-nums text-amber-700 dark:text-amber-600"
}

export function healthValueClass(health?: AdminHealth) {
  if (!health || health === "stable" || health === "healthy") return "text-foreground"
  if (health === "partial_failure") return "text-destructive"
  return "text-amber-700 dark:text-amber-600"
}

export function syncBadgeVariant(
  health: AdminHealth,
): "default" | "secondary" | "destructive" | "outline" {
  if (health === "healthy" || health === "stable") return "outline"
  if (health === "delayed" || health === "overloaded" || health === "degraded" || health === "partial_failure") {
    if (health === "partial_failure") return "destructive"
    return "secondary"
  }
  return "destructive"
}

export function agingBucketClass(count: number, bucket: string) {
  if (count <= 0) return "font-mono text-sm font-semibold tabular-nums text-foreground"
  if (bucket === ">72h") return "font-mono text-sm font-semibold tabular-nums text-destructive"
  return "font-mono text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-600"
}
