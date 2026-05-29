import { and, count, eq, gte, sql } from "drizzle-orm"

import { getCarePilotOperationalMetrics } from "@/lib/carepilot-api/metrics"
import { TRANSFER_DESTINATIONS } from "@/lib/care-operational-actions"
import { getDb } from "@/lib/db"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

import { fillDailySeries, type SeriesPoint } from "./chart-data"
import { OPERATIONAL_QUEUE_PERIMETERS } from "./operational-perimeters"
import { hoursAgo, OPERATIONAL_TICKET_SCOPE } from "./shared"

export type QueuePressureRow = {
  category: string
  name: string
  open: number
  slaRisk: number
  escalateN3: number
  transfers: number
}

export type QueueDisplayHealth = "healthy" | "stable" | "degraded" | "critical"

export type QueueTrendLabel = "↑ En hausse" | "↓ Stable" | "↗ Hausse SLA" | "↘ Reprise" | "—"

export type QueueSupervisionRow = QueuePressureRow & {
  health: QueueDisplayHealth
  trendPoints: number[]
  trend: QueueTrendLabel
}

export type QueuePressureSummary = {
  highestSlaExposure: string
  highestEscalation: string
  highestTransfers: string
  mostUnstable: string
  backlogTrend: string
}

async function loadPressureByCategory() {
  const { pressure } = await getCarePilotOperationalMetrics()
  return new Map(pressure.map((r) => [r.category, r]))
}

export async function workloadTrendSeries(category: string): Promise<number[]> {
  const db = getDb()
  const since = hoursAgo(7 * 24)
  const rows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${cpAgentTickets.createdAt})`,
      count: count(),
    })
    .from(cpAgentTickets)
    .where(
      and(
        OPERATIONAL_TICKET_SCOPE,
        eq(cpAgentTickets.category, category),
        gte(cpAgentTickets.createdAt, since),
      )!,
    )
    .groupBy(sql`date_trunc('day', ${cpAgentTickets.createdAt})`)

  const series: SeriesPoint[] = fillDailySeries(
    rows.map((r) => ({ day: r.day, count: Number(r.count) })),
    7,
  )
  return series.map((p) => p.value)
}

export function queueDisplayHealth(
  row: QueuePressureRow,
  syncUnstable = false,
): QueueDisplayHealth {
  if (row.category === "SYNC" && syncUnstable) return "degraded"
  if (row.slaRisk >= 4 || row.escalateN3 >= 2) return "critical"
  if (row.slaRisk >= 2 || row.escalateN3 >= 1 || row.open >= 8) return "degraded"
  if (row.slaRisk >= 1 || row.open >= 4 || row.transfers >= 3) return "stable"
  return "healthy"
}

export function queueTrendLabel(row: QueuePressureRow, trendPoints: number[]): QueueTrendLabel {
  if (trendPoints.length < 2) return "—"
  const recent = trendPoints.slice(-2).reduce((a, b) => a + b, 0)
  const prior = trendPoints.slice(0, 2).reduce((a, b) => a + b, 0)
  if (row.slaRisk >= 2 && recent >= prior) return "↗ Hausse SLA"
  if (recent > prior + 1) return "↑ En hausse"
  if (recent < prior) return "↘ Reprise"
  return "↓ Stable"
}

export type TransferDistributionRow = { name: string; value: number }

export async function adminTransferDistribution(): Promise<TransferDistributionRow[]> {
  const db = getDb()
  const rows: TransferDistributionRow[] = []
  for (const dest of TRANSFER_DESTINATIONS) {
    const [row] = await db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, dest.status))!)
    const n = Number(row?.c ?? 0)
    if (n > 0) rows.push({ name: dest.label, value: n })
  }
  return rows.sort((a, b) => b.value - a.value)
}

export function queueHealthCounts(rows: QueueSupervisionRow[]) {
  return rows.reduce(
    (acc, r) => {
      acc[r.health] += 1
      return acc
    },
    { healthy: 0, stable: 0, degraded: 0, critical: 0 } as Record<QueueDisplayHealth, number>,
  )
}

/** Same perimeter breakdown as Dashboard operational pressure (plus transfers). */
export async function adminOperationalPressureRows(): Promise<QueuePressureRow[]> {
  const byCategory = await loadPressureByCategory()
  const rows = OPERATIONAL_QUEUE_PERIMETERS.map((p) => {
    const hit = byCategory.get(p.category)
    return {
      category: p.category,
      name: p.label,
      open: hit?.open ?? 0,
      slaRisk: hit?.slaRisk ?? 0,
      escalateN3: hit?.escalateN3 ?? 0,
      transfers: hit?.transfers ?? 0,
    }
  })

  return rows
    .filter((r) => r.open + r.slaRisk + r.escalateN3 + r.transfers > 0)
    .sort((a, b) => {
      const ai = OPERATIONAL_QUEUE_PERIMETERS.findIndex((p) => p.category === a.category)
      const bi = OPERATIONAL_QUEUE_PERIMETERS.findIndex((p) => p.category === b.category)
      if (ai !== bi) return ai - bi
      return b.open + b.slaRisk - (a.open + a.slaRisk)
    })
}

/** Dashboard chart rows — include all canonical perimeters with activity or top SLA/N3. */
export async function adminDashboardPressureRows(): Promise<QueuePressureRow[]> {
  const rows = await adminOperationalPressureRows()
  const byCat = new Map(rows.map((r) => [r.category, r]))

  return OPERATIONAL_QUEUE_PERIMETERS.map((p) => {
    const hit = byCat.get(p.category)
    return (
      hit ?? {
        category: p.category,
        name: p.label,
        open: 0,
        slaRisk: 0,
        escalateN3: 0,
        transfers: 0,
      }
    )
  }).filter((r) => r.open + r.slaRisk + r.escalateN3 > 0)
}

export function buildQueuePressureSummary(rows: QueueSupervisionRow[]): QueuePressureSummary {
  if (rows.length === 0) {
    return {
      highestSlaExposure: "—",
      highestEscalation: "—",
      highestTransfers: "—",
      mostUnstable: "—",
      backlogTrend: "—",
    }
  }

  const topSla = [...rows].sort((a, b) => b.slaRisk - a.slaRisk)[0]!
  const topN3 = [...rows].sort((a, b) => b.escalateN3 - a.escalateN3)[0]!
  const topTr = [...rows].sort((a, b) => b.transfers - a.transfers)[0]!
  const unstable = [...rows].sort((a, b) => healthRank(b.health) - healthRank(a.health))[0]!

  const totalOpen = rows.reduce((s, r) => s + r.open, 0)
  const rising = rows.filter((r) => r.trend === "↑ En hausse" || r.trend === "↗ Hausse SLA").length

  return {
    highestSlaExposure: topSla.slaRisk > 0 ? `${topSla.name} · ${topSla.slaRisk}` : "—",
    highestEscalation: topN3.escalateN3 > 0 ? `${topN3.name} · ${topN3.escalateN3}` : "—",
    highestTransfers: topTr.transfers > 0 ? `${topTr.name} · ${topTr.transfers}` : "—",
    mostUnstable:
      unstable.health !== "healthy" && unstable.health !== "stable"
        ? `${unstable.name} · ${capitalize(unstable.health)}`
        : "—",
    backlogTrend:
      rising >= 2 ? "↑ En hausse" : totalOpen > 12 ? "↑ Élevée" : "↓ Stable",
  }
}

function healthRank(h: QueueDisplayHealth): number {
  if (h === "critical") return 4
  if (h === "degraded") return 3
  if (h === "stable") return 2
  return 1
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function adminQueueSupervisionRows(syncUnstable = false): Promise<{
  rows: QueueSupervisionRow[]
  pressureChart: QueuePressureRow[]
  summary: QueuePressureSummary
  totals: { open: number; slaRisk: number; escalateN3: number; transfers: number }
}> {
  const byCategory = await loadPressureByCategory()
  const rows: QueueSupervisionRow[] = await Promise.all(
    OPERATIONAL_QUEUE_PERIMETERS.map(async (p) => {
      const hit = byCategory.get(p.category)
      const m = {
        open: hit?.open ?? 0,
        slaRisk: hit?.slaRisk ?? 0,
        escalateN3: hit?.escalateN3 ?? 0,
        transfers: hit?.transfers ?? 0,
      }
      const trendPoints = await workloadTrendSeries(p.category)
      const pressure: QueuePressureRow = { category: p.category, name: p.label, ...m }
      const health = queueDisplayHealth(pressure, syncUnstable && p.category === "SYNC")
      return {
        ...pressure,
        health,
        trendPoints,
        trend: queueTrendLabel(pressure, trendPoints),
      }
    }),
  )

  rows.sort(
    (a, b) =>
      (OPERATIONAL_QUEUE_PERIMETERS.find((p) => p.category === a.category)?.sortOrder ?? 99) -
      (OPERATIONAL_QUEUE_PERIMETERS.find((p) => p.category === b.category)?.sortOrder ?? 99),
  )

  const pressureChart = rows.filter((r) => r.open + r.slaRisk + r.escalateN3 + r.transfers > 0)

  const totals = rows.reduce(
    (acc, r) => ({
      open: acc.open + r.open,
      slaRisk: acc.slaRisk + r.slaRisk,
      escalateN3: acc.escalateN3 + r.escalateN3,
      transfers: acc.transfers + r.transfers,
    }),
    { open: 0, slaRisk: 0, escalateN3: 0, transfers: 0 },
  )

  return {
    rows,
    pressureChart,
    summary: buildQueuePressureSummary(rows),
    totals,
  }
}

/** Queues page — table-focused drill-down (no dashboard KPIs). */
export async function adminQueueSupervisionDetail(syncUnstable = false) {
  const base = await adminQueueSupervisionRows(syncUnstable)
  return { rows: base.rows }
}
