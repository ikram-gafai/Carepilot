/**
 * Realign open operational ticket SLA timestamps to stable demo distribution.
 * Called after CARE sync so sla_due_at / created_at do not drift into mass breach.
 */

import { eq, notInArray, sql } from "drizzle-orm"

import {
  buildSlaTimingForBucket,
  slaExposureBucketForIndex,
} from "@/lib/care-operational/sla-exposure"
import { isDemoCareTicketId } from "@/lib/care-operational/operational-ticket-scope"
import { CLOSED_TICKET_STATUSES } from "@/lib/care-operational-actions"
import type { Db } from "@/lib/db"
import { careSourceTickets } from "@/lib/db/schema/care-source"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

const CLOSED = [...CLOSED_TICKET_STATUSES, "CLOSED", "RESOLVED"] as const

function mapPriorityToP(priority: string): string {
  if (priority.toUpperCase().startsWith("P")) return priority.toUpperCase()
  switch (priority) {
    case "critical":
      return "P1"
    case "high":
      return "P2"
    case "medium":
      return "P3"
    default:
      return "P4"
  }
}

export type RefreshSlaTimestampsResult = {
  careSourceUpdated: number
  cpAgentUpdated: number
  openOperationalTickets: number
}

/** Refresh SLA anchors for open operational tickets (excludes CARE-DEMO-*). */
export async function refreshOperationalSlaTimestamps(
  db: Db,
  now = Date.now(),
): Promise<RefreshSlaTimestampsResult> {
  const openCare = await db
    .select({
      id: careSourceTickets.id,
      careTicketId: careSourceTickets.careTicketId,
      priority: careSourceTickets.priority,
    })
    .from(careSourceTickets)
    .where(notInArray(careSourceTickets.status, [...CLOSED]))
    .orderBy(careSourceTickets.careTicketId)

  const operationalCare = openCare.filter((r) => !isDemoCareTicketId(r.careTicketId))

  let careUpdated = 0
  for (let i = 0; i < operationalCare.length; i++) {
    const row = operationalCare[i]!
    const bucket = slaExposureBucketForIndex(i, operationalCare.length)
    const timing = buildSlaTimingForBucket(mapPriorityToP(row.priority), bucket, i, now)
    await db
      .update(careSourceTickets)
      .set({
        createdAt: timing.createdAt,
        updatedAt: timing.updatedAt,
        slaDueAt: timing.slaDueAt,
      })
      .where(eq(careSourceTickets.id, row.id))
    careUpdated++
  }

  const openAgent = await db
    .select({
      id: cpAgentTickets.id,
      careId: cpAgentTickets.careId,
      priority: cpAgentTickets.priority,
    })
    .from(cpAgentTickets)
    .where(
      sql`${cpAgentTickets.source} = 'CARE' AND ${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED.map((s) => `'${s}'`).join(", "))})`,
    )
    .orderBy(cpAgentTickets.careId)

  const operationalAgent = openAgent.filter((r) => !isDemoCareTicketId(r.careId))

  let agentUpdated = 0
  for (let i = 0; i < operationalAgent.length; i++) {
    const row = operationalAgent[i]!
    const bucket = slaExposureBucketForIndex(i, operationalAgent.length)
    const timing = buildSlaTimingForBucket(row.priority, bucket, i, now)
    await db
      .update(cpAgentTickets)
      .set({
        externalCreatedAt: timing.createdAt,
        externalUpdatedAt: timing.updatedAt,
        createdAt: timing.createdAt,
        updatedAt: timing.updatedAt,
        slaDueAt: timing.slaDueAt,
        ttrTargetHours: timing.ttrTargetHours,
      })
      .where(eq(cpAgentTickets.id, row.id))
    agentUpdated++
  }

  return {
    careSourceUpdated: careUpdated,
    cpAgentUpdated: agentUpdated,
    openOperationalTickets: operationalAgent.length,
  }
}
