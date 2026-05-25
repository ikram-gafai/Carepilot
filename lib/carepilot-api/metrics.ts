import { and, count, desc, eq, or, sql } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

import { AI_PHASE_DISABLED, PENDING_AI_TRAINING } from "@/lib/ai-phase"
import { DASHBOARD_OPERATIONAL_PERIMETERS } from "@/lib/admin/operational-perimeters"
import {
  CLOSED_STATUS_SQL_LIST,
  N3_TICKET_STATUS,
  TRANSFER_TICKET_STATUSES,
} from "@/lib/care-operational-actions"
import { getOperationalSyncSummary } from "@/lib/care-operational/sync-stats"
import { getDb } from "@/lib/db"
import { cpAgentSyncLogs, cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { reconcileStaleSyncLogs } from "@/lib/services/sync/reconcile-stale-logs"
import { isSyncRunning } from "@/lib/services/sync/sync-service"

import {
  evaluateSyncHealth,
  isReconcileGhostLog,
  pickMeaningfulSyncLogs,
  type SyncHealthLevel,
} from "./sync-health"

type SyncLogRow = InferSelectModel<typeof cpAgentSyncLogs>

const CARE_FILTER = sql`${cpAgentTickets.source} = 'CARE'`
const OPEN_FILTER = sql`${CARE_FILTER} AND ${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_STATUS_SQL_LIST)})`
const SYNC_OPEN = sql`${CARE_FILTER} AND ${OPEN_FILTER}`

export const SLA_RISK_FILTER = sql`${SYNC_OPEN} AND ${cpAgentTickets.slaDueAt} IS NOT NULL AND ${cpAgentTickets.slaDueAt} > now() AND ${cpAgentTickets.slaDueAt} <= now() + interval '4 hours'`

const IN_PROGRESS_FILTER = sql`${CARE_FILTER} AND ${cpAgentTickets.status} = 'IN_PROGRESS'`
const RESOLVED_FILTER = sql`${CARE_FILTER} AND ${cpAgentTickets.status} IN ('RESOLVED', 'CLOSED')`
const N3_FILTER = sql`${CARE_FILTER} AND ${cpAgentTickets.status} = ${N3_TICKET_STATUS}`
const TRANSFER_STATUS_LIST = TRANSFER_TICKET_STATUSES.map((s) => `'${s}'`).join(", ")
const TRANSFER_FILTER = sql`${CARE_FILTER} AND ${cpAgentTickets.status} IN (${sql.raw(TRANSFER_STATUS_LIST)})`
const CRITICAL_OPEN_FILTER = sql`${SYNC_OPEN} AND lower(${cpAgentTickets.priority}) IN ('critical', 'high', 'p1')`

export type OperationalPressureRow = {
  category: string
  name: string
  open: number
  slaRisk: number
  escalateN3: number
  transfers: number
}

export type OperationalKpis = {
  totalSynchronized: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  slaRisk: number
  transfers: number
  escalations: number
}

export type AiAcceptanceMetrics = {
  displayValue: string
  subtitle: string
}

export type SyncHealthMetrics = {
  level: SyncHealthLevel
  label: string
  lastIngestionAt: Date | null
  reason?: string
  running: boolean
  latestLog: SyncLogRow | null
  lastIngestionLog: SyncLogRow | null
}

export type CarePilotOperationalMetrics = {
  kpis: OperationalKpis
  pressure: OperationalPressureRow[]
  pressureTotals: OperationalKpis
  criticalOpen: number
  sync: SyncHealthMetrics
  syncSummary: Awaited<ReturnType<typeof getOperationalSyncSummary>>
  aiAcceptance: AiAcceptanceMetrics
}

function isCompletedIngestion(row: SyncLogRow): boolean {
  if (!row.syncFinishedAt) return false
  const status = row.status?.toLowerCase() ?? ""
  if (status === "success") return true
  if (status === "partial_success") {
    return (row.insertedCount ?? row.recordsImported ?? 0) + (row.updatedCount ?? row.recordsUpdated ?? 0) > 0
  }
  return false
}

/** Refresh SLA deadlines from CARE source. */
export async function refreshSynchronizedSlaFromCareSource(): Promise<number> {
  const db = getDb()
  const result = await db.execute(sql`
    UPDATE cp_agent.tickets AS t
    SET sla_due_at = c.sla_due_at, updated_at = NOW()
    FROM care_source.tickets AS c
    WHERE t.source = 'CARE'
      AND (t.external_id = c.care_ticket_id OR t.care_id = c.care_ticket_id)
      AND c.sla_due_at IS NOT NULL
      AND (t.sla_due_at IS DISTINCT FROM c.sla_due_at)
  `)
  return Number(result.count ?? 0)
}

export async function loadSyncHealthMetrics(): Promise<SyncHealthMetrics> {
  const db = getDb()
  await reconcileStaleSyncLogs(db)

  const logs = await db
    .select()
    .from(cpAgentSyncLogs)
    .orderBy(desc(cpAgentSyncLogs.syncStartedAt))
    .limit(24)

  const meaningful = pickMeaningfulSyncLogs(logs)
  const latestFinished =
    meaningful.find((l) => l.syncFinishedAt && l.status !== "running") ??
    logs.find((l) => l.syncFinishedAt && l.status !== "running") ??
    null

  const lastIngestion =
    meaningful.find((l) => isCompletedIngestion(l)) ??
    (
      await db
        .select()
        .from(cpAgentSyncLogs)
        .where(
          or(
            eq(cpAgentSyncLogs.status, "success"),
            sql`${cpAgentSyncLogs.status} = 'partial_success' AND COALESCE(${cpAgentSyncLogs.insertedCount}, 0) + COALESCE(${cpAgentSyncLogs.updatedCount}, 0) > 0`,
          ),
        )
        .orderBy(desc(cpAgentSyncLogs.syncFinishedAt))
        .limit(1)
    )[0] ??
    null

  const running = isSyncRunning()
  const health = evaluateSyncHealth({
    running,
    latestFinished,
    lastSuccessful: lastIngestion,
  })

  return {
    ...health,
    running,
    latestLog: latestFinished,
    lastIngestionLog: lastIngestion,
  }
}

async function metricsForCategory(category: string): Promise<Omit<OperationalPressureRow, "name">> {
  const db = getDb()
  const categoryFilter = sql`${SYNC_OPEN} AND ${cpAgentTickets.category} = ${category}`

  const [[open], [slaRisk], [escalateN3], [transfers]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentTickets).where(categoryFilter),
    db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(
        sql`${categoryFilter} AND ${cpAgentTickets.slaDueAt} IS NOT NULL AND ${cpAgentTickets.slaDueAt} > now() AND ${cpAgentTickets.slaDueAt} <= now() + interval '4 hours'`,
      ),
    db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(sql`${categoryFilter} AND ${cpAgentTickets.status} = ${N3_TICKET_STATUS}`),
    db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(
        sql`${CARE_FILTER} AND ${cpAgentTickets.category} = ${category} AND ${cpAgentTickets.status} IN (${sql.raw(TRANSFER_STATUS_LIST)})`,
      ),
  ])

  const row = {
    category,
    open: Number(open?.c ?? 0),
    slaRisk: Number(slaRisk?.c ?? 0),
    escalateN3: Number(escalateN3?.c ?? 0),
    transfers: Number(transfers?.c ?? 0),
  }
  if (AI_PHASE_DISABLED) {
    return { ...row, escalateN3: 0, transfers: 0 }
  }
  return row
}

function capOperationalKpis(kpis: OperationalKpis, careCap: number): OperationalKpis {
  const cap = Math.max(0, careCap)
  const total = Math.min(kpis.totalSynchronized, cap)
  return {
    totalSynchronized: total,
    openTickets: Math.min(kpis.openTickets, total),
    inProgressTickets: Math.min(kpis.inProgressTickets, total),
    resolvedTickets: Math.min(kpis.resolvedTickets, total),
    slaRisk: Math.min(kpis.slaRisk, total),
    transfers: AI_PHASE_DISABLED ? 0 : Math.min(kpis.transfers, total),
    escalations: AI_PHASE_DISABLED ? 0 : Math.min(kpis.escalations, total),
  }
}

function pendingAiAcceptance(): AiAcceptanceMetrics {
  return {
    displayValue: PENDING_AI_TRAINING,
    subtitle: "Model training not started",
  }
}

/** Single operational metrics source for Agent and Admin dashboards. */
export async function getCarePilotOperationalMetrics(): Promise<CarePilotOperationalMetrics> {
  await refreshSynchronizedSlaFromCareSource()

  const db = getDb()

  const [
    [totalSynchronized],
    [openTickets],
    [inProgressTickets],
    [resolvedTickets],
    [slaRisk],
    [transfers],
    [escalations],
    [criticalOpen],
    sync,
    syncSummary,
    ...categoryMetrics
  ] = await Promise.all([
    db.select({ c: count() }).from(cpAgentTickets).where(CARE_FILTER),
    db.select({ c: count() }).from(cpAgentTickets).where(SYNC_OPEN),
    db.select({ c: count() }).from(cpAgentTickets).where(IN_PROGRESS_FILTER),
    db.select({ c: count() }).from(cpAgentTickets).where(RESOLVED_FILTER),
    db.select({ c: count() }).from(cpAgentTickets).where(SLA_RISK_FILTER),
    db.select({ c: count() }).from(cpAgentTickets).where(TRANSFER_FILTER),
    db.select({ c: count() }).from(cpAgentTickets).where(N3_FILTER),
    db.select({ c: count() }).from(cpAgentTickets).where(CRITICAL_OPEN_FILTER),
    loadSyncHealthMetrics(),
    getOperationalSyncSummary(),
    ...DASHBOARD_OPERATIONAL_PERIMETERS.map((p) => metricsForCategory(p.category)),
  ])

  const pressure: OperationalPressureRow[] = DASHBOARD_OPERATIONAL_PERIMETERS.map((p, i) => ({
    name: p.label,
    ...categoryMetrics[i]!,
  })).filter((r) => r.open + r.slaRisk > 0)

  const rawKpis: OperationalKpis = {
    totalSynchronized: Number(totalSynchronized?.c ?? 0),
    openTickets: Number(openTickets?.c ?? 0),
    inProgressTickets: Number(inProgressTickets?.c ?? 0),
    resolvedTickets: Number(resolvedTickets?.c ?? 0),
    slaRisk: Number(slaRisk?.c ?? 0),
    transfers: Number(transfers?.c ?? 0),
    escalations: Number(escalations?.c ?? 0),
  }

  const kpis = capOperationalKpis(rawKpis, syncSummary.careSourceTotal)
  const pressureCapped = pressure.map((r) => ({
    ...r,
    escalateN3: AI_PHASE_DISABLED ? 0 : Math.min(r.escalateN3, kpis.totalSynchronized),
    transfers: AI_PHASE_DISABLED ? 0 : Math.min(r.transfers, kpis.totalSynchronized),
    open: Math.min(r.open, kpis.totalSynchronized),
    slaRisk: Math.min(r.slaRisk, kpis.totalSynchronized),
  }))

  return {
    kpis,
    pressure: pressureCapped,
    pressureTotals: kpis,
    criticalOpen: Math.min(Number(criticalOpen?.c ?? 0), kpis.totalSynchronized),
    sync,
    syncSummary,
    aiAcceptance: pendingAiAcceptance(),
  }
}

export async function getSynchronizedTicketListTotal(): Promise<number> {
  const db = getDb()
  const [row] = await db.select({ c: count() }).from(cpAgentTickets).where(CARE_FILTER)
  return Number(row?.c ?? 0)
}

export { isReconcileGhostLog }
