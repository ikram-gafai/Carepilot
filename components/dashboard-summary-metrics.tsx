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

/** Blend KM coverage and tickets without missing-info flags as a coarse IA quality readout. */
function aiPrecisionReadout(metrics: DashboardMetrics): number {
  const km = metrics.kmRecommendationCoverage
  const completeness = 1 - metrics.missingInformationRate
  return Math.max(0, Math.min(1, (km + completeness) / 2))
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
    metrics != null ? slaComplianceRate(metrics.backlog, metrics.slaAtRisk) : null
  const syncPct =
    metrics?.syncSuccessRate != null ? pctDisplay(metrics.syncSuccessRate) : null

  const backlog =
    demo || metrics == null ? DASHBOARD_SUMMARY_DEMO_VALUES.backlog : String(metrics.backlog)
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
    <section aria-label={demo ? "Indicateurs de démonstration" : undefined}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricTile title="Tickets ouverts (backlog actif)" value={backlog} />
        <SummaryMetricTile title="Taux de conformité SLA" value={sla} />
        <SummaryMetricTile title="Précision moyenne IA" value={ai} />
        <SummaryMetricTile title="Taux de synchronisation réussi" value={sync} />
      </div>
    </section>
  )
}
