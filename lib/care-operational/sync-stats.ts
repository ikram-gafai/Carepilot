import { count, eq } from "drizzle-orm"

import { operationalCareTicketScope } from "@/lib/care-operational/operational-ticket-scope"
import { getDb } from "@/lib/db"
import { careSourceTickets } from "@/lib/db/schema/care-source"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { CARE_SYNC_INTERVAL_LABEL } from "@/lib/sync/constants"

export async function getCareSourceTicketTotals() {
  const db = getDb()
  const [total] = await db.select({ c: count() }).from(careSourceTickets)
  return Number(total?.c ?? 0)
}

export async function getSynchronizedTicketTotals() {
  const db = getDb()
  const [row] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(operationalCareTicketScope())
  return Number(row?.c ?? 0)
}

export async function getOperationalSyncSummary() {
  const [careSourceTotal, synchronizedTickets] = await Promise.all([
    getCareSourceTicketTotals(),
    getSynchronizedTicketTotals(),
  ])

  return {
    careSourceTotal,
    synchronizedTickets,
    pendingCareRecords: Math.max(0, careSourceTotal - synchronizedTickets),
    syncIntervalLabel: CARE_SYNC_INTERVAL_LABEL,
  }
}
