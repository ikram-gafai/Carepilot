import { desc, sql } from "drizzle-orm"

import { getCarePilotOperationalMetrics, getSynchronizedTicketListTotal } from "@/lib/carepilot-api/metrics"
import { getDb } from "@/lib/db"
import { cpAgentSyncLogs } from "@/lib/db/schema/cp-agent"

export type DashboardMetrics = {
  openTickets: number
  slaAtRisk: number
  transfers: number
  escalations: number
  synchronizedTotal: number
  syncHealth: string
  lastSync: {
    finishedAt: string | null
    status: string | null
    inserted: number
    updated: number
    skipped: number
  } | null
}

/** Legacy API — delegates to cp_agent operational metrics (CARE sync MVP). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { kpis, sync } = await getCarePilotOperationalMetrics()
  const db = getDb()

  const [latest] = await db
    .select()
    .from(cpAgentSyncLogs)
    .where(sql`${cpAgentSyncLogs.syncFinishedAt} IS NOT NULL`)
    .orderBy(desc(cpAgentSyncLogs.syncStartedAt))
    .limit(1)

  const synchronizedTotal = await getSynchronizedTicketListTotal()

  return {
    openTickets: kpis.openTickets,
    slaAtRisk: kpis.slaRisk,
    transfers: kpis.transfers,
    escalations: kpis.escalations,
    synchronizedTotal: synchronizedTotal || kpis.totalSynchronized,
    syncHealth: sync.label,
    lastSync: latest
      ? {
          finishedAt: latest.syncFinishedAt?.toISOString() ?? null,
          status: latest.status,
          inserted: latest.insertedCount ?? latest.recordsImported ?? 0,
          updated: latest.updatedCount ?? latest.recordsUpdated ?? 0,
          skipped: latest.skippedCount ?? 0,
        }
      : null,
  }
}
