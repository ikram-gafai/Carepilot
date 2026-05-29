import type { InferSelectModel } from "drizzle-orm"

import { buildInvestigationTimeline } from "@/lib/agent/investigation-timeline"
import type { OperationalIntelligencePayload } from "@/lib/ai/orchestration/types"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"
import { cpAgentTicketHistory } from "@/lib/db/schema/cp-agent"

import { TicketDecisionSynthesis } from "./ticket-decision-synthesis"
import { TicketIncidentNarrative } from "./ticket-incident-narrative"
import { TicketIncidentSummary } from "./ticket-incident-summary"
import { TicketInvestigationBackNav } from "./ticket-investigation-back-nav"
import { TicketInvestigationHeader } from "./ticket-investigation-header"
import { TicketInvestigationTimeline } from "./ticket-investigation-timeline"
import { TicketOperationalContext } from "./ticket-operational-context"

type HistoryRow = InferSelectModel<typeof cpAgentTicketHistory>

export function TicketInvestigationWorkspace({
  ticket,
  assigneeName,
  slaLabel,
  predictedPriority,
  history,
  relatedCount,
  intelligence,
}: {
  ticket: CpAgentTicketRow
  assigneeName: string | null
  slaLabel: string
  predictedPriority?: string | null
  history: HistoryRow[]
  relatedCount: number
  intelligence: OperationalIntelligencePayload
}) {
  const timeline = buildInvestigationTimeline({
    createdAt: ticket.createdAt,
    history,
    intelligence,
    slaLabel,
    generatedAt: intelligence.meta.generatedAt,
  })

  return (
    <div className="min-w-0 space-y-3">
      <TicketInvestigationBackNav />
      <TicketInvestigationHeader
        ticket={ticket}
        assigneeName={assigneeName}
        slaLabel={slaLabel}
        predictedPriority={predictedPriority}
      />
      <TicketIncidentSummary ticket={ticket} relatedCount={relatedCount} intelligence={intelligence} />
      <TicketIncidentNarrative description={ticket.description} />
      <TicketOperationalContext ticket={ticket} relatedCount={relatedCount} />
      <TicketInvestigationTimeline entries={timeline} />
      <TicketDecisionSynthesis intelligence={intelligence} />
    </div>
  )
}
