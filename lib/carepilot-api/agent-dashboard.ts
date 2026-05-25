import {
  cpAgentHighRiskTickets,
  cpAgentRecentActivity,
  cpAgentSlaRiskBuckets,
  cpAgentTicketCountsByPriority,
  cpAgentTicketCountsByStatus,
} from "@/lib/queries/cp-agent"

import { getCarePilotOperationalMetrics } from "./metrics"

/** Synchronized operational metrics for the agent dashboard (cp_agent store). */
export async function getAgentDashboardBundle() {
  const [operational, byStatus, byPriority, slaBuckets, highRisk, activity] = await Promise.all([
    getCarePilotOperationalMetrics(),
    cpAgentTicketCountsByStatus(),
    cpAgentTicketCountsByPriority(),
    cpAgentSlaRiskBuckets(),
    cpAgentHighRiskTickets(10),
    cpAgentRecentActivity(14),
  ])

  const { kpis, aiAcceptance } = operational

  return {
    metrics: {
      openTickets: kpis.openTickets,
      slaAtRisk: kpis.slaRisk,
      synchronizedTotal: kpis.totalSynchronized,
      transfers: kpis.transfers,
      escalations: kpis.escalations,
      actionRequired: kpis.openTickets + kpis.slaRisk,
    },
    byStatus,
    byPriority,
    slaBuckets,
    outcomes: [],
    highRisk,
    activity,
    syncHealth: operational.sync,
    aiAcceptance,
  }
}

export type AgentDashboardBundle = Awaited<ReturnType<typeof getAgentDashboardBundle>>
