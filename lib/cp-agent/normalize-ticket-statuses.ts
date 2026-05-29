import { and, eq, inArray } from "drizzle-orm"

import {
  AGENT_OUTCOME_STATUSES,
  isAgentOutcomeStatus,
  mapCareSourceToWorkflowStatus,
  normalizeUntreatedTicketStatus,
} from "@/lib/cp-agent/ticket-workflow"
import type { Db } from "@/lib/db"
import { cpAgentTicketHistory, cpAgentTickets } from "@/lib/db/schema/cp-agent"

const AGENT_OUTCOME_EVENTS = [
  "resolve",
  "escalate_n3",
  "transfer_monetique",
  "transfer_materiel",
  "transfer_bo",
  "transfer_reseau",
  "transfer_bureautique",
  "transfer_infrastructure",
] as const

/**
 * Reset outcome statuses that were set by AI/sync without an agent action.
 * Preserves statuses when agent history records a real outcome.
 */
export async function normalizeUntreatedTicketStatuses(db: Db): Promise<number> {
  const outcomeStatuses = [...AGENT_OUTCOME_STATUSES, "CLOSED"]

  const rows = await db
    .select({ id: cpAgentTickets.id, status: cpAgentTickets.status })
    .from(cpAgentTickets)
    .where(inArray(cpAgentTickets.status, outcomeStatuses))

  if (rows.length === 0) return 0

  const ids = rows.map((r) => r.id)
  const agentRows = await db
    .selectDistinct({ ticketId: cpAgentTicketHistory.ticketId })
    .from(cpAgentTicketHistory)
    .where(
      and(
        inArray(cpAgentTicketHistory.ticketId, ids),
        inArray(cpAgentTicketHistory.eventType, [...AGENT_OUTCOME_EVENTS]),
        eq(cpAgentTicketHistory.actorLabel, "Agent"),
      ),
    )

  const agentOutcomeIds = new Set(agentRows.map((r) => r.ticketId))
  let updated = 0

  for (const row of rows) {
    const next = normalizeUntreatedTicketStatus(row.status, agentOutcomeIds.has(row.id))
    if (next !== row.status) {
      await db
        .update(cpAgentTickets)
        .set({ status: next, updatedAt: new Date() })
        .where(eq(cpAgentTickets.id, row.id))
      updated++
    }
  }

  // Legacy ESCALATED → IN_PROGRESS
  const legacy = await db
    .update(cpAgentTickets)
    .set({ status: "IN_PROGRESS", updatedAt: new Date() })
    .where(eq(cpAgentTickets.status, "ESCALATED"))
    .returning({ id: cpAgentTickets.id })

  return updated + legacy.length
}

export function resolveSyncStatus(
  existingStatus: string | undefined,
  careSourceStatus: string,
  hasAgentOutcomeHistory: boolean,
): string {
  if (existingStatus && isAgentOutcomeStatus(existingStatus) && hasAgentOutcomeHistory) {
    return existingStatus
  }
  return mapCareSourceToWorkflowStatus(careSourceStatus)
}
