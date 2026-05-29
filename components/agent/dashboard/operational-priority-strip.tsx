import { MetricCard } from "@/components/agent/ui/metric-card"
import { DASHBOARD_KPIS, DASHBOARD_KPI_HINTS } from "@/lib/ai/decision-support-terminology"
import type { AgentDashboardKpis } from "@/lib/carepilot-api/agent-dashboard-data"

const KPI_KEYS = Object.keys(DASHBOARD_KPIS) as (keyof AgentDashboardKpis)[]

export function OperationalPriorityStrip({ strip }: { strip: AgentDashboardKpis }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
      {KPI_KEYS.map((key) => (
        <MetricCard
          key={key}
          title={DASHBOARD_KPIS[key]}
          hint={DASHBOARD_KPI_HINTS[key]}
          value={String(strip[key])}
          emphasis={strip[key] > 0 && key !== "openTickets"}
        />
      ))}
    </div>
  )
}
