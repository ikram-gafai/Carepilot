import { adminSurfaces } from "@/lib/admin-surface"
import { healthValueClass } from "@/lib/admin/visual"
import { cn } from "@/lib/utils"
import type { AdminHealth } from "@/lib/queries/admin"

const HEALTH_LABEL: Record<AdminHealth, string> = {
  stable: "Stable",
  overloaded: "Overloaded",
  degraded: "Degraded",
  healthy: "Healthy",
  delayed: "Delayed",
  partial_failure: "Partial failure",
}

export function AdminMetricTile({
  label,
  value,
  sub,
  health,
  className,
}: {
  label: string
  value: string
  sub?: string
  health?: AdminHealth
  className?: string
}) {
  return (
    <div className={cn(adminSurfaces.metric, className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight",
          health ? healthValueClass(health) : "text-zinc-900",
        )}
      >
        {health ? HEALTH_LABEL[health] : value}
      </p>
      {sub ? <p className="mt-0.5 text-[10px] text-zinc-500">{sub}</p> : null}
      {health && value !== HEALTH_LABEL[health] ? (
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">{value}</p>
      ) : null}
    </div>
  )
}
