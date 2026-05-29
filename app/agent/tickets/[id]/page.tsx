import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TicketAiInvestigationPanel } from "@/components/agent/ai/ticket-ai-investigation-panel"
import { AgentPageBody } from "@/components/agent/layout/agent-header"
import { TicketInvestigationWorkspace } from "@/components/agent/tickets/investigation/ticket-investigation-workspace"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { ADMIN_ROLES } from "@/lib/admin-nav"
import {
  aggregateAiSignals,
  orchestrateOperationalIntelligence,
} from "@/lib/ai/orchestration/operational-intelligence-orchestrator"
import { getAgentTicketTitle, loadAgentTicketDetailPage, TicketNotFoundError } from "@/lib/carepilot-api/agent-ticket-detail"
import { getCarePilotSession } from "@/lib/auth/session"
import { getDbOrNull } from "@/lib/db"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import { cpAgentSlaLabel } from "@/lib/queries/cp-agent"

type Props = { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const ticketId = Number(id)
  if (!Number.isFinite(ticketId)) {
    return { title: "Ticket" }
  }
  if (!getDbOrNull()) return { title: "Ticket" }
  try {
    const title = await getAgentTicketTitle(ticketId)
    return { title: title ? agentTicketDisplayTitle(title).slice(0, 80) : "Ticket" }
  } catch {
    return { title: "Ticket" }
  }
}

export default async function AgentTicketDetailPage({ params }: Props) {
  const { id } = await params
  const ticketId = Number(id)
  if (!Number.isFinite(ticketId)) notFound()

  if (!getDbOrNull()) {
    return (
      <>
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
        </AgentPageBody>
      </>
    )
  }

  let detail
  try {
    detail = await loadAgentTicketDetailPage(ticketId)
  } catch (e) {
    if (e instanceof TicketNotFoundError) notFound()
    return (
      <>
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("unavailable")} />
        </AgentPageBody>
      </>
    )
  }

  const { ticket, assigneeName, history, km, relatedIncidents } = detail
  const sla = cpAgentSlaLabel(ticket.slaDueAt, ticket.status, {
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    externalCreatedAt: ticket.externalCreatedAt,
    ttrTargetHours: ticket.ttrTargetHours,
  })
  const [signals, session] = await Promise.all([aggregateAiSignals(ticketId), getCarePilotSession()])
  const intelligence = orchestrateOperationalIntelligence(
    ticketId,
    ticket.careId,
    ticket.status,
    signals,
    ticket.priority,
    ticket.category,
    ticket.perimeter,
    ticket.title,
    ticket.description,
  )
  const canRunPrediction = session
    ? ADMIN_ROLES.includes(session.role as (typeof ADMIN_ROLES)[number])
    : false

  const primaryKm = km[0]

  return (
    <>
      <CarepilotAutoRefresh intervalMs={180_000} />
      <AgentPageBody className="px-4 pb-4 pt-3">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <TicketInvestigationWorkspace
              ticket={ticket}
              assigneeName={assigneeName}
              slaLabel={sla.label}
              predictedPriority={signals.priority?.predictedPriority ?? null}
              history={history}
              relatedCount={relatedIncidents.length}
              intelligence={intelligence}
            />

            <aside className="min-w-0 lg:sticky lg:top-3 lg:self-start lg:pl-4">
              <TicketAiInvestigationPanel
                ticketId={ticketId}
                intelligence={intelligence}
                kmSteps={primaryKm?.steps}
                canRunAi={canRunPrediction}
              />
            </aside>
          </div>
        </div>
      </AgentPageBody>
    </>
  )
}
