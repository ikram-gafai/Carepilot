import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

import { AI_PHASE_DISABLED, ACTION_RECOMMENDATION_ENABLED, ACTION_MODEL_ACTIVE, ESCALATION_PREDICTION_ENABLED, ESCALATION_MODEL_ACTIVE, KM_RECOMMENDATION_ENABLED, KM_RECOMMENDATION_ACTIVE, MISSING_INFORMATION_ANALYSIS_ACTIVE, MISSING_INFORMATION_ANALYSIS_ENABLED, PENDING_AI_TRAINING, PRIORITY_PREDICTION_ENABLED, PRIORITY_MODEL_ACTIVE, SIMILAR_TICKET_PREVIEW_ACTIVE, SIMILAR_TICKET_PREVIEW_ENABLED, SLA_PREDICTION_ENABLED, SLA_MODEL_ACTIVE, TRANSFER_MODEL_ACTIVE, TRANSFER_PREDICTION_ENABLED } from "@/lib/ai-phase"
import { getActionRecommendationStats } from "@/lib/ai/run-action-recommendations"
import { getEscalationPredictionStats } from "@/lib/ai/run-escalation-predictions"
import { getKmRecommendationStats } from "@/lib/ai/run-km-recommendations"
import { getMissingInformationStats } from "@/lib/ai/run-missing-information-analysis"
import { getSimilarTicketStats } from "@/lib/ai/run-similar-ticket-retrieval"
import { getPriorityPredictionStats } from "@/lib/ai/run-priority-predictions"
import { getSlaPredictionStats } from "@/lib/ai/run-sla-predictions"
import { getTransferPredictionStats } from "@/lib/ai/run-transfer-predictions"
import { DASHBOARD_OPERATIONAL_PERIMETERS } from "@/lib/admin/operational-perimeters"
import {
  CLOSED_STATUS_SQL_LIST,
  N3_TICKET_STATUS,
  TRANSFER_TICKET_STATUSES,
} from "@/lib/care-operational-actions"
import {
  operationalCareTicketScope,
  operationalOpenCareTicketScope,
} from "@/lib/care-operational/operational-ticket-scope"
import { getOperationalSyncSummary } from "@/lib/care-operational/sync-stats"
import { getDb } from "@/lib/db"
import { cpAgentAiEscalationPredictions, cpAgentAiPriorityPredictions, cpAgentAiSlaPredictions, cpAgentAiTransferPredictions, cpAgentSyncLogs, cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { reconcileStaleSyncLogs } from "@/lib/services/sync/reconcile-stale-logs"
import { isSyncRunning } from "@/lib/services/sync/sync-service"

import {
  evaluateSyncHealth,
  isReconcileGhostLog,
  pickMeaningfulSyncLogs,
  type SyncHealthLevel,
} from "./sync-health"

type SyncLogRow = InferSelectModel<typeof cpAgentSyncLogs>

const OPERATIONAL_SCOPE = operationalCareTicketScope()!
const OPEN_OPERATIONAL_SCOPE = operationalOpenCareTicketScope(CLOSED_STATUS_SQL_LIST)!

export const SLA_RISK_FILTER = sql`${OPEN_OPERATIONAL_SCOPE} AND ${cpAgentTickets.slaDueAt} IS NOT NULL AND ${cpAgentTickets.slaDueAt} > now() AND ${cpAgentTickets.slaDueAt} <= now() + interval '4 hours'`

const IN_PROGRESS_FILTER = operationalCareTicketScope(eq(cpAgentTickets.status, "IN_PROGRESS"))!
const RESOLVED_FILTER = operationalCareTicketScope(
  sql`${cpAgentTickets.status} IN ('RESOLVED', 'CLOSED')`,
)!
const N3_FILTER = operationalCareTicketScope(eq(cpAgentTickets.status, N3_TICKET_STATUS))!
const TRANSFER_STATUS_LIST = TRANSFER_TICKET_STATUSES.map((s) => `'${s}'`).join(", ")
const TRANSFER_FILTER = operationalCareTicketScope(
  sql`${cpAgentTickets.status} IN (${sql.raw(TRANSFER_STATUS_LIST)})`,
)!
const CRITICAL_OPEN_FILTER = operationalOpenCareTicketScope(
  CLOSED_STATUS_SQL_LIST,
  sql`lower(${cpAgentTickets.priority}) IN ('critical', 'high', 'p1')`,
)!

const SLA_AI_RISK_PREDICATE = or(
  eq(cpAgentAiSlaPredictions.predictedSlaBreach, true),
  eq(cpAgentAiSlaPredictions.riskLevel, "HIGH"),
)!

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
  const categoryFilter = and(OPEN_OPERATIONAL_SCOPE, eq(cpAgentTickets.category, category))!

  const [[open], [slaRisk], [escalateN3], [transfers]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentTickets).where(categoryFilter),
    SLA_PREDICTION_ENABLED
      ? db
          .select({ c: count() })
          .from(cpAgentAiSlaPredictions)
          .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiSlaPredictions.ticketId))
          .where(
            and(
              OPERATIONAL_SCOPE,
              eq(cpAgentTickets.category, category),
              OPEN_OPERATIONAL_SCOPE,
              SLA_AI_RISK_PREDICATE,
            )!,
          )
      : db
          .select({ c: count() })
          .from(cpAgentTickets)
          .where(
            sql`${categoryFilter} AND ${cpAgentTickets.slaDueAt} IS NOT NULL AND ${cpAgentTickets.slaDueAt} > now() AND ${cpAgentTickets.slaDueAt} <= now() + interval '4 hours'`,
          ),
    ESCALATION_PREDICTION_ENABLED
      ? db
          .select({ c: count() })
          .from(cpAgentAiEscalationPredictions)
          .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiEscalationPredictions.ticketId))
          .where(
            and(
              OPERATIONAL_SCOPE,
              eq(cpAgentTickets.category, category),
              eq(cpAgentAiEscalationPredictions.predictedEscalationRequired, true),
            )!,
          )
      : db
          .select({ c: count() })
          .from(cpAgentTickets)
          .where(and(categoryFilter, eq(cpAgentTickets.status, N3_TICKET_STATUS))!),
    TRANSFER_PREDICTION_ENABLED
      ? db
          .select({ c: count() })
          .from(cpAgentAiTransferPredictions)
          .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiTransferPredictions.ticketId))
          .where(
            and(
              OPERATIONAL_SCOPE,
              eq(cpAgentTickets.category, category),
              eq(cpAgentAiTransferPredictions.predictedTransferRequired, true),
            )!,
          )
      : db
          .select({ c: count() })
          .from(cpAgentTickets)
          .where(
            and(
              OPERATIONAL_SCOPE,
              eq(cpAgentTickets.category, category),
              sql`${cpAgentTickets.status} IN (${sql.raw(TRANSFER_STATUS_LIST)})`,
            )!,
          ),
  ])

  const row = {
    category,
    open: Number(open?.c ?? 0),
    slaRisk: Number(slaRisk?.c ?? 0),
    escalateN3: Number(escalateN3?.c ?? 0),
    transfers: Number(transfers?.c ?? 0),
  }
  if (AI_PHASE_DISABLED && !TRANSFER_PREDICTION_ENABLED) {
    return { ...row, transfers: 0, escalateN3: ESCALATION_PREDICTION_ENABLED ? row.escalateN3 : 0 }
  }
  if (AI_PHASE_DISABLED && TRANSFER_PREDICTION_ENABLED) {
    return { ...row, escalateN3: ESCALATION_PREDICTION_ENABLED ? row.escalateN3 : 0 }
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
    transfers: AI_PHASE_DISABLED && !TRANSFER_PREDICTION_ENABLED ? 0 : Math.min(kpis.transfers, total),
    escalations: ESCALATION_PREDICTION_ENABLED
      ? Math.min(kpis.escalations, total)
      : AI_PHASE_DISABLED
        ? 0
        : Math.min(kpis.escalations, total),
  }
}

async function aiAcceptanceMetrics(): Promise<AiAcceptanceMetrics> {
  const [escalationStats, transferStats, actionStats, slaStats, priorityStats, kmStats, similarStats, completenessStats] = await Promise.all([
    ESCALATION_PREDICTION_ENABLED ? getEscalationPredictionStats() : Promise.resolve(null),
    TRANSFER_PREDICTION_ENABLED ? getTransferPredictionStats() : Promise.resolve(null),
    ACTION_RECOMMENDATION_ENABLED ? getActionRecommendationStats() : Promise.resolve(null),
    SLA_PREDICTION_ENABLED ? getSlaPredictionStats() : Promise.resolve(null),
    PRIORITY_PREDICTION_ENABLED ? getPriorityPredictionStats() : Promise.resolve(null),
    KM_RECOMMENDATION_ENABLED ? getKmRecommendationStats() : Promise.resolve(null),
    SIMILAR_TICKET_PREVIEW_ENABLED ? getSimilarTicketStats() : Promise.resolve(null),
    MISSING_INFORMATION_ANALYSIS_ENABLED ? getMissingInformationStats() : Promise.resolve(null),
  ])

  const hasEscalation = escalationStats && escalationStats.totalPredictions > 0
  const hasTransfer = transferStats && transferStats.totalPredictions > 0
  const hasAction = actionStats && actionStats.totalPredictions > 0
  const hasSla = slaStats && slaStats.totalPredictions > 0
  const hasPriority = priorityStats && priorityStats.totalPredictions > 0
  const hasKm = kmStats && kmStats.totalRecommendations > 0
  const hasSimilar = similarStats && similarStats.totalResults > 0
  const hasCompleteness = completenessStats && completenessStats.totalAnalyses > 0

  if (!hasEscalation && !hasTransfer && !hasAction && !hasSla && !hasPriority && !hasKm && !hasSimilar && !hasCompleteness) {
    return {
      displayValue: PENDING_AI_TRAINING,
      subtitle: "Run AI models on synchronized tickets",
    }
  }

  const parts: string[] = []
  if (hasEscalation) {
    parts.push(`Task 1: ${escalationStats!.escalationCount} N3 · ${escalationStats!.avgConfidencePct}% avg`)
  }
  if (hasTransfer) {
    parts.push(`Task 2: ${transferStats!.transferCount} transfers · ${transferStats!.avgConfidencePct}% avg`)
  }
  if (hasAction) {
    parts.push(
      `Task 3: ${actionStats!.totalPredictions} actions · top ${actionStats!.mostCommonAction ?? "—"} · ${actionStats!.avgConfidencePct}% avg`,
    )
  }
  if (hasSla) {
    parts.push(
      `Task 4: ${slaStats!.breachCount} breach risk · ${slaStats!.highRiskCount} high · ${slaStats!.avgConfidencePct}% avg`,
    )
  }
  if (hasPriority) {
    parts.push(
      `Task 5: ${priorityStats!.highPriorityCount} high urgency · ${priorityStats!.p1Count} P1 · ${priorityStats!.avgConfidencePct}% avg`,
    )
  }
  if (hasKm) {
    parts.push(
      `Task 6: ${kmStats!.ticketsWithRecommendations} KM matches · ${kmStats!.avgSimilarityPct}% avg similarity`,
    )
  }
  if (hasSimilar) {
    parts.push(
      `Task 7 preview: ${similarStats!.ticketsWithResults} historical reference cases`,
    )
  }
  if (hasCompleteness) {
    parts.push(
      `Task 8: ${completenessStats!.incompleteCount} incomplete · ${completenessStats!.avgCompletenessPct}% avg completeness`,
    )
  }

  const activeTasks = [hasEscalation, hasTransfer, hasAction, hasSla, hasPriority, hasKm, hasSimilar, hasCompleteness].filter(Boolean).length
  let displayValue = PENDING_AI_TRAINING
  if (activeTasks >= 8) displayValue = "Tasks 1–8 Active"
  else if (activeTasks >= 7) displayValue = "Tasks 1–7 Active"
  else if (activeTasks >= 6) displayValue = "Tasks 1–6 Active"
  else if (activeTasks >= 5) displayValue = "Tasks 1–5 Active"
  else if (activeTasks >= 4) displayValue = "Tasks 1–4 Active"
  else if (activeTasks === 3) displayValue = "Tasks 1–3 Active"
  else if (hasEscalation && hasTransfer) displayValue = "Tasks 1 & 2 Active"
  else if (hasEscalation && hasAction) displayValue = "Tasks 1 & 3 Active"
  else if (hasTransfer && hasAction) displayValue = "Tasks 2 & 3 Active"
  else if (hasEscalation) displayValue = ESCALATION_MODEL_ACTIVE
  else if (hasTransfer) displayValue = TRANSFER_MODEL_ACTIVE
  else if (hasAction) displayValue = ACTION_MODEL_ACTIVE
  else if (hasSla) displayValue = SLA_MODEL_ACTIVE
  else if (hasPriority) displayValue = PRIORITY_MODEL_ACTIVE
  else if (hasKm) displayValue = KM_RECOMMENDATION_ACTIVE
  else if (hasSimilar) displayValue = SIMILAR_TICKET_PREVIEW_ACTIVE
  else if (hasCompleteness) displayValue = MISSING_INFORMATION_ANALYSIS_ACTIVE

  return {
    displayValue,
    subtitle: parts.join(" · "),
  }
}


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
    aiAcceptance,
    ...categoryMetrics
  ] = await Promise.all([
    db.select({ c: count() }).from(cpAgentTickets).where(OPERATIONAL_SCOPE),
    db.select({ c: count() }).from(cpAgentTickets).where(OPEN_OPERATIONAL_SCOPE),
    db.select({ c: count() }).from(cpAgentTickets).where(IN_PROGRESS_FILTER),
    db.select({ c: count() }).from(cpAgentTickets).where(RESOLVED_FILTER),
    SLA_PREDICTION_ENABLED
      ? db
          .select({ c: count() })
          .from(cpAgentAiSlaPredictions)
          .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiSlaPredictions.ticketId))
          .where(and(OPERATIONAL_SCOPE, OPEN_OPERATIONAL_SCOPE, SLA_AI_RISK_PREDICATE)!)
      : db.select({ c: count() }).from(cpAgentTickets).where(SLA_RISK_FILTER),
    TRANSFER_PREDICTION_ENABLED
      ? db
          .select({ c: count() })
          .from(cpAgentAiTransferPredictions)
          .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiTransferPredictions.ticketId))
          .where(
            and(OPERATIONAL_SCOPE, eq(cpAgentAiTransferPredictions.predictedTransferRequired, true))!,
          )
      : db.select({ c: count() }).from(cpAgentTickets).where(TRANSFER_FILTER),
    ESCALATION_PREDICTION_ENABLED
      ? db
          .select({ c: count() })
          .from(cpAgentAiEscalationPredictions)
          .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiEscalationPredictions.ticketId))
          .where(
            and(OPERATIONAL_SCOPE, eq(cpAgentAiEscalationPredictions.predictedEscalationRequired, true))!,
          )
      : db.select({ c: count() }).from(cpAgentTickets).where(N3_FILTER),
    PRIORITY_PREDICTION_ENABLED
      ? db
          .select({ c: count() })
          .from(cpAgentAiPriorityPredictions)
          .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiPriorityPredictions.ticketId))
          .where(
            and(
              OPERATIONAL_SCOPE,
              OPEN_OPERATIONAL_SCOPE,
              inArray(cpAgentAiPriorityPredictions.predictedPriority, ["P1", "P2"]),
            )!,
          )
      : db.select({ c: count() }).from(cpAgentTickets).where(CRITICAL_OPEN_FILTER),
    loadSyncHealthMetrics(),
    getOperationalSyncSummary(),
    aiAcceptanceMetrics(),
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
    escalateN3:
      ESCALATION_PREDICTION_ENABLED || !AI_PHASE_DISABLED
        ? Math.min(r.escalateN3, kpis.totalSynchronized)
        : 0,
    transfers: AI_PHASE_DISABLED && !TRANSFER_PREDICTION_ENABLED ? 0 : Math.min(r.transfers, kpis.totalSynchronized),
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
    aiAcceptance,
  }
}

export async function getSynchronizedTicketListTotal(): Promise<number> {
  const db = getDb()
  const [row] = await db.select({ c: count() }).from(cpAgentTickets).where(OPERATIONAL_SCOPE)
  return Number(row?.c ?? 0)
}

export { isReconcileGhostLog }
