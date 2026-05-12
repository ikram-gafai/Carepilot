import { DashboardHeroKpiRow } from "@/components/dashboard-hero-kpi-row"
import { DashboardOperationalBarCharts } from "@/components/dashboard-operational-bar-charts"
import { DashboardPriorityQueueCard } from "@/components/dashboard-priority-queue-card"
import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import { getDashboardMetrics } from "@/lib/queries/dashboard-metrics"

export default async function DashboardPage() {
  let metrics = null as Awaited<ReturnType<typeof getDashboardMetrics>> | null

  try {
    metrics = await getDashboardMetrics()
  } catch {
    metrics = null
  }

  return (
    <div className="space-y-4">
      <CarePilotSetHeader title="Dashboard" />

      <DashboardHeroKpiRow metrics={metrics} />

      <DashboardOperationalBarCharts />

      <DashboardPriorityQueueCard />
    </div>
  )
}
