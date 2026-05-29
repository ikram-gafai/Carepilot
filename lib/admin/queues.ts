import { loadOrchestratedAdminContext } from "@/lib/admin/orchestrated-supervision"
import { OPERATIONAL_QUEUE_PERIMETERS } from "@/lib/admin/operational-perimeters"
import {
  queueDisplayHealth,
  queueTrendLabel,
  type QueueSupervisionRow,
} from "@/lib/admin/queue-metrics"
import { healthFromSyncStatus } from "@/lib/admin/shared"
import { adminLatestSync } from "@/lib/admin/sync"

export type {
  QueueDisplayHealth,
  QueuePressureRow,
  QueueSupervisionRow,
  QueueTrendLabel,
  TransferDistributionRow,
} from "@/lib/admin/queue-metrics"

const labelToCategory = new Map(OPERATIONAL_QUEUE_PERIMETERS.map((p) => [p.label, p.category]))

/** Files opérationnelles — agrégées depuis la file orchestrée agent. */
export async function adminQueueSupervision() {
  const [latestSync, ctx] = await Promise.all([adminLatestSync(), loadOrchestratedAdminContext()])

  const syncHealth = healthFromSyncStatus(latestSync?.status)
  const syncLatencyMin =
    latestSync?.syncFinishedAt && latestSync?.syncStartedAt
      ? Math.round(
          (latestSync.syncFinishedAt.getTime() - latestSync.syncStartedAt.getTime()) / 60_000,
        )
      : null
  const syncUnstable =
    syncHealth === "degraded" ||
    syncHealth === "partial_failure" ||
    (syncLatencyMin != null && syncLatencyMin >= 12) ||
    (latestSync?.recordsFailed ?? 0) > 0

  const byCategory = new Map<
    string,
    { open: number; slaRisk: number; escalateN3: number; transfers: number }
  >()

  for (const row of ctx.queue) {
    const category = labelToCategory.get(row.perimeterLabel) ?? "CHECKOUT"
    const cur = byCategory.get(category) ?? { open: 0, slaRisk: 0, escalateN3: 0, transfers: 0 }
    cur.open += 1
    if (row.slaTone === "critical" || row.slaTone === "warning") cur.slaRisk += 1
    if (row.orchestratedDecision === "ESCALATE_N3") cur.escalateN3 += 1
    if (row.orchestratedDecision === "TRANSFER") cur.transfers += 1
    byCategory.set(category, cur)
  }

  const rows: QueueSupervisionRow[] = OPERATIONAL_QUEUE_PERIMETERS.map((p) => {
    const stats = byCategory.get(p.category) ?? { open: 0, slaRisk: 0, escalateN3: 0, transfers: 0 }
    const pressure = {
      category: p.category,
      name: p.label,
      open: stats.open,
      slaRisk: stats.slaRisk,
      escalateN3: stats.escalateN3,
      transfers: stats.transfers,
    }
    return {
      ...pressure,
      health: queueDisplayHealth(pressure, syncUnstable && p.category === "SYNC"),
      trendPoints: [],
      trend: queueTrendLabel(pressure, []),
    }
  })

  rows.sort(
    (a, b) =>
      (OPERATIONAL_QUEUE_PERIMETERS.find((p) => p.category === a.category)?.sortOrder ?? 99) -
      (OPERATIONAL_QUEUE_PERIMETERS.find((p) => p.category === b.category)?.sortOrder ?? 99),
  )

  return { rows, syncUnstable }
}
