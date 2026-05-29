import { buildIncidentSummary } from "@/lib/agent/incident-summary"
import type { OperationalIntelligencePayload } from "@/lib/ai/orchestration/types"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"

import { InvestigationSection } from "./investigation-section"

export function TicketIncidentSummary({
  ticket,
  relatedCount,
  intelligence,
}: {
  ticket: CpAgentTicketRow
  relatedCount: number
  intelligence: OperationalIntelligencePayload
}) {
  const { summary } = buildIncidentSummary({
    title: ticket.title,
    description: ticket.description,
    perimeter: ticket.perimeter,
    category: ticket.category,
    priority: ticket.priority,
    relatedCount,
    intelligence,
  })

  return (
    <InvestigationSection title="Synthèse incident">
      <p className="text-xs font-medium leading-relaxed text-foreground">{summary}</p>
    </InvestigationSection>
  )
}
