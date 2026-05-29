import type { Metadata } from "next"

import { DecisionFeedbackPanel } from "@/components/agent/dashboard/ai-decision-feedback-panel"
import { AgentDashboardCharts } from "@/components/agent/dashboard/agent-operational-charts"
import { NextTicketsQueue } from "@/components/agent/dashboard/next-tickets-queue"
import { OperationalPriorityStrip } from "@/components/agent/dashboard/operational-priority-strip"
import { AgentPageBody } from "@/components/agent/layout/agent-header"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { getAgentDashboardBundle } from "@/lib/carepilot-api/agent-dashboard"
import { getDbOrNull } from "@/lib/db"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"

export const metadata: Metadata = { title: "Tableau de bord" }
export const dynamic = "force-dynamic"

export default async function AgentDashboardPage() {
  if (!getDbOrNull()) {
    return (
      <AgentPageBody className="p-4">
        <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
      </AgentPageBody>
    )
  }

  let bundle
  try {
    bundle = await getAgentDashboardBundle()
  } catch {
    return (
      <AgentPageBody className="p-4">
        <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("unavailable")} />
      </AgentPageBody>
    )
  }

  const { kpis, nextTickets, decisionFeedback, charts } = bundle

  return (
    <>
      <CarepilotAutoRefresh />
      <AgentPageBody className="mx-auto max-w-[1600px] space-y-3 p-4">
        <OperationalPriorityStrip strip={kpis} />

        <AgentDashboardCharts {...charts} />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <NextTicketsQueue tickets={nextTickets} />
          <DecisionFeedbackPanel summary={decisionFeedback} />
        </div>
      </AgentPageBody>
    </>
  )
}
