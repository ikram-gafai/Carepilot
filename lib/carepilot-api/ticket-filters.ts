import { AGENT_TICKET_FILTER_STATUSES } from "@/lib/cp-agent/ticket-workflow"
import { agentTicketStatusLabel } from "@/components/agent/ui/status-badge"
import { operationalCareTicketScope } from "@/lib/care-operational/operational-ticket-scope"
import { getDb } from "@/lib/db"
import { cpAgentTickets, cpAgentUsers } from "@/lib/db/schema/cp-agent"
import { asc } from "drizzle-orm"

export async function getTicketFilterOptions() {
  const db = getDb()
  const scope = operationalCareTicketScope()
  const [priorities, categories, agents] = await Promise.all([
    db.selectDistinct({ v: cpAgentTickets.priority }).from(cpAgentTickets).where(scope).orderBy(asc(cpAgentTickets.priority)),
    db.selectDistinct({ v: cpAgentTickets.category }).from(cpAgentTickets).where(scope).orderBy(asc(cpAgentTickets.category)),    db
      .select({ id: cpAgentUsers.id, name: cpAgentUsers.displayName })
      .from(cpAgentUsers)
      .orderBy(asc(cpAgentUsers.displayName)),
  ])

  return {
    statuses: [...AGENT_TICKET_FILTER_STATUSES],
    statusLabels: Object.fromEntries(
      AGENT_TICKET_FILTER_STATUSES.map((s) => [s, agentTicketStatusLabel(s)]),
    ),
    priorities: priorities.map((x) => x.v),
    categories: categories.map((x) => x.v),
    agents,
  }
}
