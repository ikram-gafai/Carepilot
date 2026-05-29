import { and, desc, eq, inArray } from "drizzle-orm"

import { OPERATIONAL_ACTION_KINDS } from "@/lib/care-operational-actions"
import { operationalCareTicketScope } from "@/lib/care-operational/operational-ticket-scope"
import { getDb } from "@/lib/db"
import { cpAgentTicketHistory, cpAgentTickets } from "@/lib/db/schema/cp-agent"

/** Latest agent operational action per ticket (for KM usage analytics). */
export async function loadLatestAgentActions(): Promise<Map<number, string>> {
  const db = getDb()
  const rows = await db
    .select({
      ticketId: cpAgentTicketHistory.ticketId,
      eventType: cpAgentTicketHistory.eventType,
    })
    .from(cpAgentTicketHistory)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentTicketHistory.ticketId))
    .where(
      and(
        operationalCareTicketScope(),
        inArray(cpAgentTicketHistory.eventType, [...OPERATIONAL_ACTION_KINDS]),
        eq(cpAgentTicketHistory.actorLabel, "Agent"),
      ),
    )
    .orderBy(desc(cpAgentTicketHistory.occurredAt))

  const out = new Map<number, string>()
  for (const row of rows) {
    if (!out.has(row.ticketId)) out.set(row.ticketId, row.eventType)
  }
  return out
}
