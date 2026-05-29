import {
  buildAgentDecisionFeedback,
  buildAgentOperationalQueue,
  buildDecisionDistributionChart,
  buildNextTicketsQueue,
  buildPriorityChart,
  buildSlaExposureChartFromQueue,
  computeAgentDashboardKpis,
} from "./agent-dashboard-data"
import { getCachedAgentOperationalQueue } from "./cached-operational-queue"
import { refreshOperationalSlaTimestamps } from "@/lib/care-operational/refresh-sla-timestamps"
import { getDb } from "@/lib/db"

async function loadOperationalQueue() {
  let queue = await getCachedAgentOperationalQueue()
  const breached = queue.filter((r) => r.slaLabel === "Breached").length
  const driftThreshold = Math.max(10, Math.round(queue.length * 0.18))
  if (queue.length > 0 && breached > driftThreshold) {
    await refreshOperationalSlaTimestamps(getDb())
    queue = await buildAgentOperationalQueue()
  }
  return queue
}

/** Agent dashboard — decision-support cockpit for N1/N2 agents. */
export async function getAgentDashboardBundle() {
  const queue = await loadOperationalQueue()
  const kpis = computeAgentDashboardKpis(queue)

  const decisionFeedback = await buildAgentDecisionFeedback(queue)
  const priorityChart = buildPriorityChart(queue)

  return {
    kpis,
    nextTickets: buildNextTicketsQueue(queue, 8),
    decisionFeedback,
    charts: {
      slaExposure: buildSlaExposureChartFromQueue(queue),
      priorityChart,
      actionDistribution: buildDecisionDistributionChart(queue),
    },
  }
}

export type AgentDashboardBundle = Awaited<ReturnType<typeof getAgentDashboardBundle>>
