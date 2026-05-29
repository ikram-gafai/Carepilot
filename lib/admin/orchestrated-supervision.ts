/**
 * Admin supervision — même file orchestrée et mêmes décisions que l'espace agent.
 */

import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  buildAgentDecisionFeedback,
  buildDecisionDistributionChart,
  buildPerimeterPressureChart,
  buildSlaExposureChartFromQueue,
  computeAgentDashboardKpis,
  getAgentDashboardAiCoverage,
  type AgentDashboardAiCoverage,
  type AgentDashboardKpis,
  type AgentQueueRow,
} from "@/lib/carepilot-api/agent-dashboard-data"
import { getCachedAgentOperationalQueue } from "@/lib/carepilot-api/cached-operational-queue"
import type { AgentDecisionFeedbackSummary } from "@/lib/carepilot-api/agent-decision-feedback"
import {
  compareOperationalActionAlignment,
  formatAgentActionAlignmentLabel,
} from "@/lib/ai/decision-alignment"
import {
  formatOperationalDecision,
  type OperationalDecision,
} from "@/lib/ai/operational-decision"
import {
  OPERATIONAL_ACTION_KINDS,
} from "@/lib/care-operational-actions"
import { loadKmUsageAnalytics } from "@/lib/km/km-usage-analytics"
import { operationalCareTicketScope } from "@/lib/care-operational/operational-ticket-scope"
import { getOperationalSyncSummary } from "@/lib/care-operational/sync-stats"
import { getDb } from "@/lib/db"
import {
  cpAgentAiFeedback,
  cpAgentAiOperationalExplanations,
  cpAgentTicketHistory,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

export type AdminAlignmentStatus = "aligned" | "overridden" | "pending"

export type AdminOperationalDiagnostics = {
  activeTickets: number
  withOrchestration: number
  withMissingContext: number
  withKmReference: number
  withLlmExplanation: number
  withAgentAction: number
  withFeedback: number
}

export type AdminRecommendationRow = {
  ticketId: number
  careId: string
  title: string
  suggestedDecision: string
  transferTarget: string | null
  confidencePct: number | null
  signalSummary: string
  kmCode: string | null
  slaLabel: string
  agentActionLabel: string | null
  alignmentStatus: AdminAlignmentStatus
}

export type AdminFeedbackRow = {
  ticketId: number
  careId: string
  suggestedDecision: string
  agentActionLabel: string | null
  helpful: boolean | null
  confidenceRating: number | null
  comment: string | null
  alignmentStatus: AdminAlignmentStatus
}

export type AdminTransferSupervisionRow = {
  ticketId: number
  careId: string
  title: string
  targetPerimeter: string | null
  routingReason: string | null
  agentActionLabel: string | null
  alignmentStatus: AdminAlignmentStatus
}

export type AdminKmSupervisionRow = {
  kmCode: string
  title?: string | null
  usedCount: number
  resolveCount: number
  escalatedAfterCount: number
  waitingCount?: number
  missingCount: number
}

export type OrchestratedAdminContext = {
  queue: AgentQueueRow[]
  kpis: AgentDashboardKpis
  decisionFeedback: AgentDecisionFeedbackSummary
  coverage: AgentDashboardAiCoverage
  diagnostics: AdminOperationalDiagnostics
  decisionDistribution: ReturnType<typeof buildDecisionDistributionChart>
  slaExposure: ReturnType<typeof buildSlaExposureChartFromQueue>
  perimeterPressure: ReturnType<typeof buildPerimeterPressureChart>
  transferByTarget: { target: string; count: number }[]
  recommendationRows: AdminRecommendationRow[]
  feedbackRows: AdminFeedbackRow[]
  transferRows: AdminTransferSupervisionRow[]
  kmRows: AdminKmSupervisionRow[]
  kmUsage: Awaited<ReturnType<typeof loadKmUsageAnalytics>>
  synchronizedTickets: number
}

function formatAgentActionLabel(eventType: string | null): string | null {
  return formatAgentActionAlignmentLabel(eventType)
}

function alignmentStatusForRow(
  row: Pick<AgentQueueRow, "orchestratedDecision" | "decisionTarget" | "aiActionLabel">,
  agentEventType: string | null,
): AdminAlignmentStatus {
  return compareOperationalActionAlignment({
    suggestedDecision: row.orchestratedDecision,
    suggestedTarget: row.decisionTarget,
    suggestedLabel: row.aiActionLabel,
    agentEventType,
  })
}

function signalSummary(row: AgentQueueRow): string {
  const parts: string[] = []
  if (row.escalationRequired) parts.push("N3")
  if (row.transferRequired) parts.push("Routage")
  if (row.slaTone === "critical" || row.slaTone === "warning") parts.push("SLA")
  if (row.qualityLevel === "INCOMPLETE" || row.qualityLevel === "POOR") parts.push("Contexte")
  return parts.length ? parts.join(" · ") : "—"
}

async function loadLatestAgentActions(): Promise<Map<number, string>> {
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

async function loadFeedbackByTicket(): Promise<
  Map<
    number,
    { helpful: boolean | null; confidenceRating: number | null; comment: string | null; careId: string }
  >
> {
  const db = getDb()
  const rows = await db
    .select({
      ticketId: cpAgentAiFeedback.ticketId,
      careId: cpAgentTickets.careId,
      helpful: cpAgentAiFeedback.helpful,
      confidenceRating: cpAgentAiFeedback.confidenceRating,
      comment: cpAgentAiFeedback.comment,
      createdAt: cpAgentAiFeedback.createdAt,
    })
    .from(cpAgentAiFeedback)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiFeedback.ticketId))
    .where(operationalCareTicketScope())
    .orderBy(desc(cpAgentAiFeedback.createdAt))

  const out = new Map<
    number,
    { helpful: boolean | null; confidenceRating: number | null; comment: string | null; careId: string }
  >()
  for (const row of rows) {
    if (!out.has(row.ticketId)) {
      out.set(row.ticketId, {
        helpful: row.helpful,
        confidenceRating: row.confidenceRating,
        comment: row.comment,
        careId: row.careId,
      })
    }
  }
  return out
}

async function countDistinctAgentActionTickets(): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({ c: sql<number>`count(distinct ${cpAgentTicketHistory.ticketId})::int` })
    .from(cpAgentTicketHistory)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentTicketHistory.ticketId))
    .where(
      and(
        operationalCareTicketScope(),
        inArray(cpAgentTicketHistory.eventType, [...OPERATIONAL_ACTION_KINDS]),
        eq(cpAgentTicketHistory.actorLabel, "Agent"),
      ),
    )
  return row?.c ?? 0
}

async function countDistinctExplanationTickets(): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({ c: sql<number>`count(distinct ${cpAgentAiOperationalExplanations.ticketId})::int` })
    .from(cpAgentAiOperationalExplanations)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiOperationalExplanations.ticketId))
    .where(operationalCareTicketScope())
  return row?.c ?? 0
}

function buildTransferByTarget(queue: AgentQueueRow[]): { target: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of queue) {
    if (row.orchestratedDecision !== "TRANSFER") continue
    const key = row.decisionTarget ?? "Non spécifié"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([target, count]) => ({ target, count }))
    .sort((a, b) => b.count - a.count)
}

function buildKmSupervisionRowsFromAnalytics(
  analytics: Awaited<ReturnType<typeof loadKmUsageAnalytics>>,
  queue: AgentQueueRow[],
): AdminKmSupervisionRow[] {
  const rows: AdminKmSupervisionRow[] = analytics.procedures
    .filter((p) => p.matchedTickets > 0)
    .map((p) => ({
      kmCode: p.code,
      title: p.title,
      usedCount: p.matchedTickets,
      resolveCount: p.successfulCount,
      escalatedAfterCount: p.escalatedAfterCount,
      waitingCount: p.waitingCount,
      missingCount: 0,
    }))

  const missing = queue.filter(
    (r) => !r.hasKmRecommendation && r.orchestratedDecision === "RESOLVE",
  ).length
  if (missing > 0) {
    rows.push({
      kmCode: "—",
      title: null,
      usedCount: 0,
      resolveCount: 0,
      escalatedAfterCount: 0,
      waitingCount: 0,
      missingCount: missing,
    })
  }
  return rows
}

function buildRecommendationRows(
  queue: AgentQueueRow[],
  agentActions: Map<number, string>,
): AdminRecommendationRow[] {
  return queue.map((row) => {
    const eventType = agentActions.get(row.ticketId) ?? null
    return {
      ticketId: row.ticketId,
      careId: row.careId,
      title: row.title,
      suggestedDecision: row.aiActionLabel ?? formatOperationalDecision(row.orchestratedDecision),
      transferTarget: row.decisionTarget,
      confidencePct: row.actionConfidencePct,
      signalSummary: signalSummary(row),
      kmCode: row.kmCode,
      slaLabel: row.slaLabel,
      agentActionLabel: formatAgentActionLabel(eventType),
      alignmentStatus: alignmentStatusForRow(row, eventType),
    }
  })
}

function buildTransferRows(
  queue: AgentQueueRow[],
  agentActions: Map<number, string>,
): AdminTransferSupervisionRow[] {
  return queue
    .filter((row) => row.orchestratedDecision === "TRANSFER")
    .map((row) => {
      const eventType = agentActions.get(row.ticketId) ?? null
      return {
        ticketId: row.ticketId,
        careId: row.careId,
        title: row.title,
        targetPerimeter: row.decisionTarget,
        routingReason: row.actionReason,
        agentActionLabel: formatAgentActionLabel(eventType),
        alignmentStatus: alignmentStatusForRow(row, eventType),
      }
    })
}

function buildFeedbackRows(
  queue: AgentQueueRow[],
  agentActions: Map<number, string>,
  feedbackByTicket: Map<
    number,
    { helpful: boolean | null; confidenceRating: number | null; comment: string | null; careId: string }
  >,
): AdminFeedbackRow[] {
  const queueById = new Map(queue.map((r) => [r.ticketId, r]))
  const ticketIds = new Set([...queueById.keys(), ...feedbackByTicket.keys()])

  return [...ticketIds]
    .map((ticketId) => {
      const row = queueById.get(ticketId)
      const fb = feedbackByTicket.get(ticketId)
      const eventType = agentActions.get(ticketId) ?? null
      const suggested = row?.orchestratedDecision
      if (!row && !fb) return null
      return {
        ticketId,
        careId: row?.careId ?? fb?.careId ?? "—",
        suggestedDecision:
          row?.aiActionLabel ??
          (suggested ? formatOperationalDecision(suggested) : "—"),
        agentActionLabel: formatAgentActionLabel(eventType),
        helpful: fb?.helpful ?? null,
        confidenceRating: fb?.confidenceRating ?? null,
        comment: fb?.comment ?? null,
        alignmentStatus: row
          ? alignmentStatusForRow(row, eventType)
          : "pending",
      }
    })
    .filter((r): r is AdminFeedbackRow => r != null)
    .sort((a, b) => a.careId.localeCompare(b.careId))
}

async function buildDiagnostics(
  queue: AgentQueueRow[],
  decisionFeedback: AgentDecisionFeedbackSummary,
): Promise<AdminOperationalDiagnostics> {
  const [withAgentAction, withLlmExplanation] = await Promise.all([
    countDistinctAgentActionTickets(),
    countDistinctExplanationTickets(),
  ])

  return {
    activeTickets: queue.length,
    withOrchestration: queue.length,
    withMissingContext: queue.filter(
      (r) => r.qualityLevel === "INCOMPLETE" || r.qualityLevel === "POOR",
    ).length,
    withKmReference: queue.filter((r) => r.hasKmRecommendation).length,
    withLlmExplanation,
    withAgentAction,
    withFeedback: decisionFeedback.aiFeedbackSubmitted,
  }
}

/** Charge le contexte de supervision admin (même orchestration que l'agent). */
export async function loadOrchestratedAdminContext(): Promise<OrchestratedAdminContext> {
  const queue = await getCachedAgentOperationalQueue()
  const [decisionFeedback, coverage, sync, agentActions, feedbackByTicket] = await Promise.all([
    buildAgentDecisionFeedback(queue),
    getAgentDashboardAiCoverage(),
    getOperationalSyncSummary(),
    loadLatestAgentActions(),
    loadFeedbackByTicket(),
  ])

  const kpis = computeAgentDashboardKpis(queue)
  const diagnostics = await buildDiagnostics(queue, decisionFeedback)
  const kmUsage = await loadKmUsageAnalytics(queue, agentActions.keys(), sync.synchronizedTickets)
  const kmRows = buildKmSupervisionRowsFromAnalytics(kmUsage, queue)

  return {
    queue,
    kpis,
    decisionFeedback,
    coverage,
    diagnostics,
    decisionDistribution: buildDecisionDistributionChart(queue),
    slaExposure: buildSlaExposureChartFromQueue(queue),
    perimeterPressure: buildPerimeterPressureChart(queue),
    transferByTarget: buildTransferByTarget(queue),
    recommendationRows: buildRecommendationRows(queue, agentActions),
    feedbackRows: buildFeedbackRows(queue, agentActions, feedbackByTicket),
    transferRows: buildTransferRows(queue, agentActions),
    kmRows,
    kmUsage,
    synchronizedTickets: sync.synchronizedTickets,
  }
}

export function adminAlignmentLabel(status: AdminAlignmentStatus): string {
  switch (status) {
    case "aligned":
      return "Aligné"
    case "overridden":
      return "Contourné"
    default:
      return "En attente"
  }
}
