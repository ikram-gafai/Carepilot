import { and, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm"

import { N3_TICKET_STATUS, TRANSFER_DESTINATIONS } from "@/lib/care-operational-actions"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import { getDb } from "@/lib/db"
import { cpAdminEscalationRecords } from "@/lib/db/schema/cp-admin"
import {
  cpAgentAiAnalyses,
  cpAgentAiFeedback,
  cpAgentSyncLogs,
  cpAgentTicketHistory,
  cpAgentTickets,
  cpAgentUsers,
} from "@/lib/db/schema/cp-agent"

import { hoursAgo, OPEN_FILTER } from "./shared"

export type SeriesPoint = { label: string; value: number }

export function fillDailySeries(
  rows: { day: Date | string; count: number }[],
  days: number,
): SeriesPoint[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = r.day instanceof Date ? r.day : new Date(r.day)
    const key = d.toISOString().slice(0, 10)
    map.set(key, Number(r.count))
  }
  const out: SeriesPoint[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({
      label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d),
      value: map.get(key) ?? 0,
    })
  }
  return out
}

function trendPct(recent: number, prior: number): number | null {
  if (prior === 0) return recent > 0 ? 100 : null
  return Math.round(((recent - prior) / prior) * 100)
}

export async function adminTicketVolumeSeries(days = 7): Promise<SeriesPoint[]> {
  const db = getDb()
  const since = hoursAgo(days * 24)
  const rows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${cpAgentTickets.createdAt})`,
      count: count(),
    })
    .from(cpAgentTickets)
    .where(gte(cpAgentTickets.createdAt, since))
    .groupBy(sql`date_trunc('day', ${cpAgentTickets.createdAt})`)
    .orderBy(sql`date_trunc('day', ${cpAgentTickets.createdAt})`)

  return fillDailySeries(
    rows.map((r) => ({ day: r.day, count: Number(r.count) })),
    days,
  )
}

const SLA_AT_RISK_FILTER = and(
  isNotNull(cpAgentTickets.slaDueAt),
  sql`${cpAgentTickets.slaDueAt} > now()`,
  sql`${cpAgentTickets.slaDueAt} <= now() + interval '4 hours'`,
)!

export type CategoryPressureRow = {
  name: string
  open: number
  slaRisk: number
  escalateN3: number
  transfers?: number
}

import { adminDashboardPressureRows } from "./queue-metrics"

/** Open workload, SLA exposure, N3, and transfers by operational perimeter (Dashboard + Queues). */
export async function adminCategoryPressureChart(): Promise<CategoryPressureRow[]> {
  const rows = await adminDashboardPressureRows()
  return rows.map((r) => ({
    name: r.name,
    open: r.open,
    slaRisk: r.slaRisk,
    escalateN3: r.escalateN3,
    transfers: r.transfers,
  }))
}

/** @deprecated Use adminCategoryPressureChart */
export const adminQueuePressureChartRows = adminCategoryPressureChart

export async function adminEscalationDailySeries7d(): Promise<SeriesPoint[]> {
  const db = getDb()
  const since = hoursAgo(7 * 24)
  const escRows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${cpAgentTickets.updatedAt})`,
      count: count(),
    })
    .from(cpAgentTickets)
    .where(
      and(
        eq(cpAgentTickets.source, "CARE"),
        eq(cpAgentTickets.status, N3_TICKET_STATUS),
        gte(cpAgentTickets.updatedAt, since),
      )!,
    )
    .groupBy(sql`date_trunc('day', ${cpAgentTickets.updatedAt})`)

  return fillDailySeries(
    escRows.map((r) => ({ day: r.day, count: Number(r.count) })),
    7,
  )
}

export async function adminTransferDailySeries7d(): Promise<SeriesPoint[]> {
  const db = getDb()
  const since = hoursAgo(7 * 24)
  const rows = await db
    .select({
      day: sql<Date>`date_trunc('day', coalesce(${cpAgentTickets.externalCreatedAt}, ${cpAgentTickets.createdAt}))`,
      count: count(),
    })
    .from(cpAgentTickets)
    .where(
      and(
        eq(cpAgentTickets.source, "CARE"),
        eq(cpAgentTickets.aiRecommendedAction, "transfer"),
        gte(cpAgentTickets.createdAt, since),
      )!,
    )
    .groupBy(sql`date_trunc('day', coalesce(${cpAgentTickets.externalCreatedAt}, ${cpAgentTickets.createdAt}))`)

  return fillDailySeries(
    rows.map((r) => ({ day: r.day, count: Number(r.count) })),
    7,
  )
}

/** @deprecated Prefer merging adminKpiSparklines().slaExposure with adminEscalationDailySeries7d() in callers. */
export async function adminSlaEscalationTrend7d() {
  const spark = await adminKpiSparklines()
  const escFilled = await adminEscalationDailySeries7d()
  return spark.slaExposure.map((p, i) => ({
    label: p.label,
    slaRisk: p.value,
    escalations: escFilled[i]?.value ?? 0,
  }))
}

export async function adminTransferPerimeterDistribution() {
  const db = getDb()
  const out: { name: string; value: number }[] = []
  for (const dest of TRANSFER_DESTINATIONS) {
    const [row] = await db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(eq(cpAgentTickets.status, dest.status))
    out.push({ name: dest.label, value: Number(row?.c ?? 0) })
  }
  return out.filter((d) => d.value > 0)
}

export async function adminCategoryPressureBars() {
  const db = getDb()

  const categories = await db
    .select({ category: cpAgentTickets.category })
    .from(cpAgentTickets)
    .where(OPEN_FILTER)
    .groupBy(cpAgentTickets.category)

  const bars = await Promise.all(
    categories.map(async ({ category }) => {
      const base = eq(cpAgentTickets.category, category)
      const open = and(base, OPEN_FILTER)!
      const [active] = await db.select({ c: count() }).from(cpAgentTickets).where(open)
      const [slaRisk] = await db
        .select({ c: count() })
        .from(cpAgentTickets)
        .where(and(open, SLA_AT_RISK_FILTER)!)
      const [escalated] = await db
        .select({ c: count() })
        .from(cpAgentTickets)
        .where(and(open, eq(cpAgentTickets.status, "ESCALATED_N3"))!)

      return {
        category: cpAgentCategoryLabel(category),
        active: Number(active?.c ?? 0),
        slaRisk: Number(slaRisk?.c ?? 0),
        escalated: Number(escalated?.c ?? 0),
      }
    }),
  )

  return bars.sort((a, b) => b.active - a.active).slice(0, 6)
}

export async function adminEscalationDonut() {
  const db = getDb()
  const categoryRows = await db
    .select({ category: cpAgentTickets.category, c: count() })
    .from(cpAgentTickets)
    .where(eq(cpAgentTickets.status, N3_TICKET_STATUS))
    .groupBy(cpAgentTickets.category)
    .orderBy(desc(count()))

  return categoryRows
    .map((r) => ({ name: cpAgentCategoryLabel(r.category), value: Number(r.c) }))
    .filter((d) => d.value > 0)
}

const CARE_OPEN = and(eq(cpAgentTickets.source, "CARE"), OPEN_FILTER, isNotNull(cpAgentTickets.storeCode))!

export async function adminStoreImpact() {
  const db = getDb()

  const grouped = await db
    .select({
      store: cpAgentTickets.storeCode,
      open: count(),
      atRisk: sql<number>`count(*) FILTER (WHERE ${cpAgentTickets.slaDueAt} IS NOT NULL AND ${cpAgentTickets.slaDueAt} > now() AND ${cpAgentTickets.slaDueAt} <= now() + interval '4 hours')`,
      esc: sql<number>`count(*) FILTER (WHERE ${cpAgentTickets.aiRecommendedAction} = 'escalate')`,
    })
    .from(cpAgentTickets)
    .where(CARE_OPEN)
    .groupBy(cpAgentTickets.storeCode)
    .orderBy(desc(count()))
    .limit(5)

  const rows = await Promise.all(
    grouped.map(async ({ store, open, atRisk, esc }) => {
      const storeEq = eq(cpAgentTickets.storeCode, store!)
      const [recent] = await db
        .select({ c: count() })
        .from(cpAgentTickets)
        .where(and(storeEq, eq(cpAgentTickets.source, "CARE"), gte(cpAgentTickets.createdAt, hoursAgo(72)))!)
      const [prior] = await db
        .select({ c: count() })
        .from(cpAgentTickets)
        .where(
          and(
            storeEq,
            eq(cpAgentTickets.source, "CARE"),
            gte(cpAgentTickets.createdAt, hoursAgo(144)),
            lt(cpAgentTickets.createdAt, hoursAgo(72)),
          )!,
        )

      return {
        store: store!,
        open: Number(open),
        atRisk: Number(atRisk),
        esc: Number(esc),
        trend: trendPct(Number(recent?.c ?? 0), Number(prior?.c ?? 0)),
      }
    }),
  )

  return rows
}

export async function adminKpiSparklines() {
  const volume = await adminTicketVolumeSeries(7)
  const db = getDb()
  const since = hoursAgo(7 * 24)

  const slaRows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${cpAgentTickets.createdAt})`,
      count: count(),
    })
    .from(cpAgentTickets)
    .where(
      and(
        gte(cpAgentTickets.createdAt, since),
        isNotNull(cpAgentTickets.slaDueAt),
        SLA_AT_RISK_FILTER,
        OPEN_FILTER,
      )!,
    )
    .groupBy(sql`date_trunc('day', ${cpAgentTickets.createdAt})`)

  const feedbackRows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${cpAgentAiFeedback.createdAt})`,
      count: count(),
    })
    .from(cpAgentAiFeedback)
    .where(and(gte(cpAgentAiFeedback.createdAt, since), eq(cpAgentAiFeedback.helpful, true)))
    .groupBy(sql`date_trunc('day', ${cpAgentAiFeedback.createdAt})`)

  const syncRows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${cpAgentSyncLogs.syncStartedAt})`,
      count: count(),
    })
    .from(cpAgentSyncLogs)
    .where(gte(cpAgentSyncLogs.syncStartedAt, since))
    .groupBy(sql`date_trunc('day', ${cpAgentSyncLogs.syncStartedAt})`)

  return {
    openTickets: volume,
    slaExposure: fillDailySeries(
      slaRows.map((r) => ({ day: r.day, count: Number(r.count) })),
      7,
    ),
    syncActivity: fillDailySeries(
      syncRows.map((r) => ({ day: r.day, count: Number(r.count) })),
      7,
    ),
    aiAcceptance: fillDailySeries(
      feedbackRows.map((r) => ({ day: r.day, count: Number(r.count) })),
      7,
    ),
  }
}

export async function adminSyncTimelineSeries() {
  const db = getDb()
  const logs = await db
    .select()
    .from(cpAgentSyncLogs)
    .orderBy(desc(cpAgentSyncLogs.syncStartedAt))
    .limit(12)

  return [...logs].reverse().map((l, i) => ({
    label: `#${i + 1}`,
    imported: l.recordsImported || l.recordsProcessed,
    failed: l.recordsFailed,
    status: l.status,
  }))
}

export async function adminFeedbackValidationSeries(days = 14) {
  const db = getDb()
  const since = hoursAgo(days * 24)
  const rows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${cpAgentAiFeedback.createdAt})`,
      accepted: sql<number>`sum(case when ${cpAgentAiFeedback.helpful} = true then 1 else 0 end)::int`,
      rejected: sql<number>`sum(case when ${cpAgentAiFeedback.helpful} = false then 1 else 0 end)::int`,
    })
    .from(cpAgentAiFeedback)
    .where(gte(cpAgentAiFeedback.createdAt, since))
    .groupBy(sql`date_trunc('day', ${cpAgentAiFeedback.createdAt})`)

  const map = new Map<string, { accepted: number; rejected: number }>()
  for (const r of rows) {
    const key = new Date(r.day).toISOString().slice(0, 10)
    map.set(key, { accepted: Number(r.accepted), rejected: Number(r.rejected) })
  }
  const out: { label: string; accepted: number; rejected: number }[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const v = map.get(key) ?? { accepted: 0, rejected: 0 }
    out.push({
      label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(d),
      ...v,
    })
  }
  return out
}

export type ConfidenceGovernanceBucket = {
  name: string
  accepted: number
  rejected: number
  pending: number
  total: number
}

const CONFIDENCE_BUCKETS = [
  { name: "50–60%", min: 0.5, max: 0.6 },
  { name: "60–70%", min: 0.6, max: 0.7 },
  { name: "70–80%", min: 0.7, max: 0.8 },
  { name: "80–90%", min: 0.8, max: 0.9 },
  { name: "90%+", min: 0.9, max: 1.01 },
] as const

/** @deprecated Use adminConfidenceGovernanceBuckets */
export async function adminConfidenceDistribution() {
  const { buckets } = await adminConfidenceGovernanceBuckets()
  return buckets.map((b) => ({ name: b.name, value: b.total }))
}

export async function adminConfidenceGovernanceBuckets() {
  const db = getDb()
  const rows = await db
    .select({
      confidence: cpAgentAiAnalyses.confidence,
      helpful: cpAgentAiFeedback.helpful,
    })
    .from(cpAgentAiAnalyses)
    .leftJoin(cpAgentAiFeedback, eq(cpAgentAiFeedback.ticketId, cpAgentAiAnalyses.ticketId))

  const buckets: ConfidenceGovernanceBucket[] = CONFIDENCE_BUCKETS.map((b) => {
    const inBucket = rows.filter((r) => r.confidence >= b.min && r.confidence < b.max)
    const accepted = inBucket.filter((r) => r.helpful === true).length
    const rejected = inBucket.filter((r) => r.helpful === false).length
    const pending = inBucket.filter((r) => r.helpful == null).length
    return {
      name: b.name,
      accepted,
      rejected,
      pending,
      total: inBucket.length,
    }
  })

  const avgConfidencePct = rows.length
    ? Math.round((100 * rows.reduce((s, r) => s + r.confidence, 0)) / rows.length)
    : 0

  return { buckets, avgConfidencePct }
}

/** Open ticket count per assignee — support workload for admin agent supervision. */
export async function adminAgentOpenWorkloadSeries() {
  const db = getDb()

  const rows = await db
    .select({
      name: cpAgentUsers.displayName,
      value: count(),
    })
    .from(cpAgentTickets)
    .innerJoin(cpAgentUsers, eq(cpAgentTickets.assignedUserId, cpAgentUsers.id))
    .where(OPEN_FILTER)
    .groupBy(cpAgentUsers.id, cpAgentUsers.displayName)
    .orderBy(desc(count()))

  const [unassigned] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(and(OPEN_FILTER, isNull(cpAgentTickets.assignedUserId))!)

  const series = rows.map((r) => ({
    name: r.name.split(/\s+/)[0] ?? r.name,
    value: Number(r.value),
  }))

  const unassignedCount = Number(unassigned?.c ?? 0)
  if (unassignedCount > 0) {
    series.push({ name: "Unassigned", value: unassignedCount })
  }

  return series
}
