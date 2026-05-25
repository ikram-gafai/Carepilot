import { cn } from "@/lib/utils"
import type { DashboardMetrics } from "@/lib/queries/dashboard-metrics"

/** Placeholder figures for the hero KPI row — swap `demo` off when aggregates are ready to ship. */
export const DASHBOARD_SUMMARY_DEMO_VALUES = {
  backlog: "10",
  slaCompliancePct: "80%",
  aiPrecisionPct: "50%",
  syncSuccessPct: "60%",
} as const

function pctDisplay(n: number) {
  return `${Math.round(n * 100)}%`
}

function slaComplianceRate(backlog: number, slaAtRisk: number): number {
  if (backlog <= 0) return 1
  return Math.max(0, Math.min(1, (backlog - slaAtRisk) / backlog))
}

function aiPrecisionReadout(_metrics: DashboardMetrics): number {
  return 0
}

function SummaryMetricTile({
  title,
  value,
  className,
}: {
  title: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-background p-5 text-xl shadow-none",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium leading-snug text-muted-foreground">{title}</p>
        <p className="text-[40px] font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function DashboardSummaryMetrics({
  metrics,
  /** When true (default), shows {@link DASHBOARD_SUMMARY_DEMO_VALUES}. Set false and pass `metrics` for live data. */
  demo = true,
}: {
  metrics?: DashboardMetrics | null
  demo?: boolean
}) {
  const slaOk =
    metrics != null ? slaComplianceRate(metrics.openTickets, metrics.slaAtRisk) : null
  const syncPct = metrics?.syncHealth ? metrics.syncHealth : null

  const backlog =
    demo || metrics == null ? DASHBOARD_SUMMARY_DEMO_VALUES.backlog : String(metrics.openTickets)
  const sla =
    demo || slaOk == null
      ? DASHBOARD_SUMMARY_DEMO_VALUES.slaCompliancePct
      : pctDisplay(slaOk)
  const ai =
    demo || metrics == null
      ? DASHBOARD_SUMMARY_DEMO_VALUES.aiPrecisionPct
      : pctDisplay(aiPrecisionReadout(metrics))
  const sync =
    demo || metrics == null || syncPct == null
      ? DASHBOARD_SUMMARY_DEMO_VALUES.syncSuccessPct
      : syncPct

  return (
    <section aria-label={demo ? "Demo indicators" : undefined}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricTile title="Open tickets (active backlog)" value={backlog} />
        <SummaryMetricTile title="SLA compliance rate" value={sla} />
        <SummaryMetricTile title="Average AI precision" value={ai} />
        <SummaryMetricTile title="Successful sync rate" value={sync} />
      </div>
    </section>
  )
}
