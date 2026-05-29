import type { AgentDecisionFeedbackSummary } from "@/lib/carepilot-api/agent-decision-feedback"
export type {
  AgentDecisionAlignmentRow,
  AgentDecisionAlignmentSummary,
  AgentDecisionFeedbackRow,
  AgentDecisionFeedbackSummary,
} from "@/lib/carepilot-api/agent-decision-feedback"
export {
  buildAgentDecisionFeedbackRows,
  buildDecisionAlignmentRows,
  buildDecisionFeedbackRows,
  decisionAlignmentSegments,
  decisionFeedbackChartSegments,
} from "@/lib/carepilot-api/agent-decision-feedback"

import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import { perimeterLabel, resolvePerimeterCategory } from "@/lib/admin/operational-perimeters"
import {
  compareOperationalActionAlignment,
} from "@/lib/ai/decision-alignment"
import {
  isPendingHoldDecision,
  type OperationalDecision,
} from "@/lib/ai/operational-decision"
import { buildOrchestratedTicketDecision } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { plannedOperationalOutcomeForCareId } from "@/lib/care-operational/catalog-operational-outcome"
import {
  isOrchestratedSlaAttention,
  latestRowByTicketId,
} from "@/lib/ai/orchestration/resolve-operational-decision"
import { escalationSeverity } from "@/lib/ai/escalation-calibration"
import { loadAiPredictionsForTickets, primaryKmByTicketId } from "@/lib/ai/load-predictions-for-tickets"
import type { ActionRecommendationRow } from "@/lib/ai/run-action-recommendations"
import { CLOSED_TICKET_STATUSES, OPERATIONAL_ACTION_KINDS } from "@/lib/care-operational-actions"
import {
  isOperationalCareTicketId,
  operationalCareTicketScope,
  operationalOpenCareTicketScope,
} from "@/lib/care-operational/operational-ticket-scope"
import { classifySlaExposure } from "@/lib/care-operational/sla-exposure"
import { getOperationalSyncSummary } from "@/lib/care-operational/sync-stats"
import { getDb } from "@/lib/db"
import {
  cpAgentAiActionRecommendations,
  cpAgentAiEscalationPredictions,
  cpAgentAiFeedback,
  cpAgentAiKmRecommendations,
  cpAgentAiMissingInformationAnalysis,
  cpAgentAiOperationalExplanations,
  cpAgentAiPriorityPredictions,
  cpAgentAiSlaPredictions,
  cpAgentAiTransferPredictions,
  cpAgentTicketHistory,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"
import {
  cpAgentLatestSyncLog,
  cpAgentRecentActivity,
  cpAgentSlaLabel,
  cpAgentSlaRiskBuckets,
  cpAgentTicketCountsByPriority,
  cpAgentTicketCountsByStatus,
} from "@/lib/queries/cp-agent"

const CLOSED = [...CLOSED_TICKET_STATUSES, "CLOSED"] as const
const OPEN_FILTER = operationalOpenCareTicketScope(CLOSED.map((s) => `'${s}'`).join(", "))

export type AgentDashboardAiCoverage = {
  synchronizedTickets: number
  escalationPredictions: number
  transferPredictions: number
  slaPredictions: number
  priorityPredictions: number
  actionRecommendations: number
  kmRecommendations: number
  missingInformationAnalyses: number
  operationalExplanations: number
}

export type AgentDashboardKpis = {
  openTickets: number
  slaAttention: number
  escalation: number
  transfer: number
  suspend: number
}

export type AgentPriorityStrip = AgentDashboardKpis

export type AgentQueueRow = {
  ticketId: number
  careId: string
  title: string
  storeName: string | null
  perimeterLabel: string
  priority: string
  predictedPriority: string | null
  status: string
  slaDueAt: string | null
  slaLabel: string
  slaTone: "critical" | "warning" | "success" | "neutral"
  slaRiskLevel: string | null
  slaPredictedBreach: boolean
  aiAction: string | null
  orchestratedDecision: OperationalDecision
  aiActionLabel: string | null
  decisionTarget: string | null
  kmCode: string | null
  actionConfidencePct: number | null
  actionReason: string | null
  recommendedNextStep: string
  escalationRequired: boolean
  escalationConfidencePct: number | null
  escalationSeverity: "high" | "medium" | "low" | "none"
  transferRequired: boolean
  qualityLevel: string | null
  hasKmRecommendation: boolean
  sortScore: number
  createdAt: string
  updatedAt: string
}

export type AgentHighAttentionRow = Pick<
  AgentQueueRow,
  | "ticketId"
  | "careId"
  | "title"
  | "predictedPriority"
  | "priority"
  | "aiActionLabel"
  | "actionReason"
  | "recommendedNextStep"
>

/** @deprecated Use AgentHighAttentionRow */
export type AgentHighRiskRow = AgentHighAttentionRow

/** Orchestrated suggestion snapshot for tickets no longer in the open queue. */
export type OrchestratedSuggestionSnapshot = {
  decision: OperationalDecision
  target: string | null
  label: string
}

/** Orchestrated decision for tickets no longer in the open queue (e.g. after resolve). */
async function resolveOrchestratedDecisionsForTicketIds(
  ticketIds: number[],
): Promise<Map<number, OrchestratedSuggestionSnapshot>> {
  const out = new Map<number, OrchestratedSuggestionSnapshot>()
  if (ticketIds.length === 0) return out

  const db = getDb()
  const [tickets, predictions] = await Promise.all([
    db
      .select({
        id: cpAgentTickets.id,
        careId: cpAgentTickets.careId,
        title: cpAgentTickets.title,
        description: cpAgentTickets.description,
        category: cpAgentTickets.category,
        perimeter: cpAgentTickets.perimeter,
        priority: cpAgentTickets.priority,
        status: cpAgentTickets.status,
        slaDueAt: cpAgentTickets.slaDueAt,
        createdAt: cpAgentTickets.createdAt,
        externalCreatedAt: cpAgentTickets.externalCreatedAt,
        ttrTargetHours: cpAgentTickets.ttrTargetHours,
      })
      .from(cpAgentTickets)
      .where(inArray(cpAgentTickets.id, ticketIds)),
    loadAiPredictionsForTickets(ticketIds),
  ])

  const { sla: slaRows, priority: priorityRows, escalation: escalationRows, transfer: transferRows, missing: missingRows, km: kmRows } = predictions

  const slaByTicket = latestRowByTicketId(slaRows)
  const priorityByTicket = latestRowByTicketId(priorityRows)
  const escalationByTicket = latestRowByTicketId(escalationRows)
  const transferByTicket = latestRowByTicketId(transferRows)
  const missingByTicket = latestRowByTicketId(missingRows)
  const kmByTicket = primaryKmByTicketId(kmRows)

  for (const t of tickets) {
    const sla = slaByTicket.get(t.id)
    const priority = priorityByTicket.get(t.id)
    const escalation = escalationByTicket.get(t.id)
    const transfer = transferByTicket.get(t.id)
    const missing = missingByTicket.get(t.id)
    const kmRow = kmByTicket.get(t.id)
    const catalogPlan = plannedOperationalOutcomeForCareId(t.careId)
    const slaExposure = classifySlaExposure({
      status: t.status,
      priority: t.priority,
      slaDueAt: t.slaDueAt,
      createdAt: t.createdAt,
      externalCreatedAt: t.externalCreatedAt,
      ttrTargetHours: t.ttrTargetHours,
    })
    const final = buildOrchestratedTicketDecision({
      careId: t.careId,
      title: t.title,
      description: t.description,
      ticketStatus: t.status,
      category: t.category,
      perimeter: t.perimeter,
      priority: t.priority,
      predictedPriority: priority?.predictedPriority ?? null,
      qualityLevel: missing?.qualityLevel ?? null,
      completenessScore: missing?.completenessScore ?? null,
      missingFields: missing?.missingFields ?? [],
      escalationSignal: escalation?.predictedEscalationRequired ?? false,
      escalationConfidence: escalation?.confidenceScore ?? null,
      transferSignal: transfer?.predictedTransferRequired ?? false,
      transferConfidence: transfer?.confidenceScore ?? null,
      transferTarget: transfer?.targetPerimeter ?? null,
      aiKmId: kmRow?.kmId ?? catalogPlan?.kmCode ?? null,
      aiKmTitle: kmRow?.kmTitle ?? null,
      aiSimilarity: kmRow?.similarityScore ?? null,
      slaLabel: slaExposure.label,
      slaRiskLevel: sla?.riskLevel ?? null,
      slaPredictedBreach: sla?.predictedSlaBreach ?? false,
      slaConfidence: sla?.confidenceScore ?? null,
      priorityConfidence: priority?.confidenceScore ?? null,
      missingContextConfidence: missing?.confidenceScore ?? null,
    })
    out.set(t.id, {
      decision: final.finalSuggestedDecision,
      target: final.decisionTarget,
      label: final.decisionLabel,
    })
  }

  return out
}

/** Compare orchestrated AI decisions with agent actions and feedback (Actions page source). */
export async function buildAgentDecisionFeedback(
  queue: AgentQueueRow[],
): Promise<AgentDecisionFeedbackSummary> {
  const db = getDb()
  const queueById = new Map(queue.map((r) => [r.ticketId, r]))

  const [historyRows, feedbackStats] = await Promise.all([
    db
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
      .orderBy(desc(cpAgentTicketHistory.occurredAt)),
    db
      .select({
        submitted: sql<number>`count(*)::int`,
        helpful: sql<number>`count(*) filter (where ${cpAgentAiFeedback.helpful} is true)::int`,
        notHelpful: sql<number>`count(*) filter (where ${cpAgentAiFeedback.helpful} is false)::int`,
      })
      .from(cpAgentAiFeedback)
      .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiFeedback.ticketId))
      .where(operationalCareTicketScope()),
  ])

  const latestAgentEventByTicket = new Map<number, string>()
  for (const row of historyRows) {
    if (latestAgentEventByTicket.has(row.ticketId)) continue
    if ((OPERATIONAL_ACTION_KINDS as readonly string[]).includes(row.eventType)) {
      latestAgentEventByTicket.set(row.ticketId, row.eventType)
    }
  }

  const closedActionIds = [...latestAgentEventByTicket.keys()].filter((id) => !queueById.has(id))
  const closedOrchestrated = await resolveOrchestratedDecisionsForTicketIds(closedActionIds)

  let followedAi = 0
  let adjustedDecisions = 0

  for (const [ticketId, agentEventType] of latestAgentEventByTicket) {
    const queueRow = queueById.get(ticketId)
    const closedSuggestion = closedOrchestrated.get(ticketId)
    const alignment = compareOperationalActionAlignment({
      suggestedDecision: queueRow?.orchestratedDecision ?? closedSuggestion?.decision ?? null,
      suggestedTarget: queueRow?.decisionTarget ?? closedSuggestion?.target ?? null,
      suggestedLabel: queueRow?.aiActionLabel ?? closedSuggestion?.label ?? null,
      agentEventType,
    })
    if (alignment === "aligned") followedAi++
    else if (alignment === "overridden") adjustedDecisions++
  }

  const stats = feedbackStats[0]

  return {
    actionsCompleted: latestAgentEventByTicket.size,
    followedAi,
    adjustedDecisions,
    aiFeedbackSubmitted: stats?.submitted ?? 0,
    aiFeedbackHelpful: stats?.helpful ?? 0,
    aiFeedbackNotHelpful: stats?.notHelpful ?? 0,
  }
}

export type AgentActivityRow = {
  id: string
  ticketId: number
  careId: string
  label: string
  occurredAt: string
}

export type StatusChartRow = { label: string; count: number }
export type PriorityChartRow = { priority: string; count: number }

export type AgentWorkSectionRow = Pick<
  AgentQueueRow,
  | "ticketId"
  | "careId"
  | "title"
  | "storeName"
  | "perimeterLabel"
  | "aiActionLabel"
  | "actionConfidencePct"
  | "actionReason"
  | "slaLabel"
  | "slaTone"
>

export type PerimeterPressureChartRow = {
  label: string
  active: number
  slaRisk: number
}

export type ActionDistributionChartRow = {
  action: string
  label: string
  count: number
}

export type SlaExposureChartRow = {
  bucket: string
  label: string
  count: number
}

export type TicketQualityChartRow = {
  level: string
  label: string
  count: number
}

export type StorePressureRow = {
  storeName: string
  open: number
  slaRisk: number
}

function normalizeActionRow(row: ActionRecommendationRow): ActionRecommendationRow {
  const dist = row.probabilityDistribution
  if (!dist || Object.keys(dist).length === 0) return row
  const ranked = Object.entries(dist).sort((a, b) => b[1] - a[1])
  const [topClass, topProb] = ranked[0] ?? [row.recommendedAction, row.confidenceScore]
  if (topClass === row.recommendedAction) return row
  return {
    ...row,
    recommendedAction: topClass,
    confidenceScore: topProb,
  }
}

function recommendedNextStep(input: {
  orchestratedDecision: OperationalDecision
  actionReason: string | null
  slaLabel: string
}): string {
  if (input.actionReason) return input.actionReason
  switch (input.orchestratedDecision) {
    case "REQUEST_INFORMATION":
      return "Décision suggérée : Demander des informations — obtenir les éléments manquants du magasin."
    case "ESCALATE_N3":
      return "Décision suggérée : Escalade N3 — revoir le parcours spécialiste."
    case "TRANSFER":
      return "Décision suggérée : Transfert — préparer la passation périmètre."
    case "SUSPEND":
      return "Décision suggérée : Suspendre — en attente retour magasin ou dépendance."
    case "RESOLVE":
      return "Décision suggérée : Résoudre — appliquer la KM correspondante et clôturer après validation."
    default:
      return "Revoir la décision opérationnelle suggérée."
  }
}

function isEscalationSignal(
  escalationRequired: boolean,
  aiAction: string | null,
): boolean {
  return escalationRequired || aiAction === "ESCALATE_N3"
}
function priorityRank(p: string | null | undefined): number {
  switch (p?.toUpperCase()) {
    case "P1":
    case "CRITICAL":
      return 40
    case "P2":
    case "HIGH":
      return 30
    case "P3":
    case "MEDIUM":
      return 15
    default:
      return 5
  }
}

function slaRiskScore(
  sla: { riskLevel?: string; predictedSlaBreach?: boolean } | null,
  ticket: {
    slaDueAt: Date | null
    status: string
    priority: string
    createdAt: Date
    externalCreatedAt: Date | null
    ttrTargetHours: number | null
  },
): number {
  if (sla?.riskLevel === "HIGH" || sla?.predictedSlaBreach) return 100
  if (sla?.riskLevel === "MEDIUM") return 55
  const label = cpAgentSlaLabel(ticket.slaDueAt, ticket.status, {
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    externalCreatedAt: ticket.externalCreatedAt,
    ttrTargetHours: ticket.ttrTargetHours,
  })
  if (label.tone === "critical") return 85
  if (label.tone === "warning") return 60
  return 0
}

function computeSortScore(input: {
  slaScore: number
  predictedPriority: string | null
  escalationRequired: boolean
  transferRequired: boolean
  qualityLevel: string | null
  aiAction: string | null
}): number {
  let score = input.slaScore
  score += priorityRank(input.predictedPriority)
  if (input.escalationRequired) score += 35
  if (input.transferRequired) score += 30
  if (input.qualityLevel === "POOR") score += 25
  if (input.qualityLevel === "INCOMPLETE") score += 20
  if (input.aiAction === "ESCALATE_N3") score += 15
  if (input.aiAction === "TRANSFER_PERIMETER") score += 12
  if (input.aiAction === "REQUEST_INFORMATION") score += 10
  return score
}

export async function getAgentDashboardAiCoverage(): Promise<AgentDashboardAiCoverage> {
  const db = getDb()
  const sync = await getOperationalSyncSummary()

  const [
    [esc],
    [trf],
    [sla],
    [pri],
    [act],
    [km],
    [miss],
    [expl],
  ] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiEscalationPredictions),
    db.select({ c: count() }).from(cpAgentAiTransferPredictions),
    db.select({ c: count() }).from(cpAgentAiSlaPredictions),
    db.select({ c: count() }).from(cpAgentAiPriorityPredictions),
    db.select({ c: count() }).from(cpAgentAiActionRecommendations),
    db.select({ c: count() }).from(cpAgentAiKmRecommendations),
    db.select({ c: count() }).from(cpAgentAiMissingInformationAnalysis),
    db.select({ c: count() }).from(cpAgentAiOperationalExplanations),
  ])

  return {
    synchronizedTickets: sync.synchronizedTickets,
    escalationPredictions: Number(esc?.c ?? 0),
    transferPredictions: Number(trf?.c ?? 0),
    slaPredictions: Number(sla?.c ?? 0),
    priorityPredictions: Number(pri?.c ?? 0),
    actionRecommendations: Number(act?.c ?? 0),
    kmRecommendations: Number(km?.c ?? 0),
    missingInformationAnalyses: Number(miss?.c ?? 0),
    operationalExplanations: Number(expl?.c ?? 0),
  }
}

export async function buildAgentOperationalQueue(): Promise<AgentQueueRow[]> {
  const db = getDb()

  const tickets = await db
    .select({
      id: cpAgentTickets.id,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
      priority: cpAgentTickets.priority,
      status: cpAgentTickets.status,
      slaDueAt: cpAgentTickets.slaDueAt,
      createdAt: cpAgentTickets.createdAt,
      externalCreatedAt: cpAgentTickets.externalCreatedAt,
      ttrTargetHours: cpAgentTickets.ttrTargetHours,
      updatedAt: cpAgentTickets.updatedAt,
    })
    .from(cpAgentTickets)
    .where(OPEN_FILTER)
    .orderBy(desc(cpAgentTickets.createdAt))

  const ticketIds = tickets.map((t) => t.id)
  const { actions, sla: slaRows, priority: priorityRows, escalation: escalationRows, transfer: transferRows, missing: missingRows, km: kmRows } =
    await loadAiPredictionsForTickets(ticketIds)

  const actionByTicket = latestRowByTicketId(actions.map(normalizeActionRow))
  const slaByTicket = latestRowByTicketId(slaRows)
  const priorityByTicket = latestRowByTicketId(priorityRows)
  const escalationByTicket = latestRowByTicketId(escalationRows)
  const transferByTicket = latestRowByTicketId(transferRows)
  const missingByTicket = latestRowByTicketId(missingRows)
  const kmByTicket = primaryKmByTicketId(kmRows)

  const rows: AgentQueueRow[] = tickets.map((t) => {
    const action = actionByTicket.get(t.id)
    const sla = slaByTicket.get(t.id)
    const priority = priorityByTicket.get(t.id)
    const escalation = escalationByTicket.get(t.id)
    const transfer = transferByTicket.get(t.id)
    const missing = missingByTicket.get(t.id)
    const escalationRequired = isEscalationSignal(
      escalation?.predictedEscalationRequired ?? false,
      action?.recommendedAction ?? null,
    )
    const transferRequired = transfer?.predictedTransferRequired ?? false
    const slaExposure = classifySlaExposure({
      status: t.status,
      priority: t.priority,
      slaDueAt: t.slaDueAt,
      createdAt: t.createdAt,
      externalCreatedAt: t.externalCreatedAt,
      ttrTargetHours: t.ttrTargetHours,
    })
    const slaLabel = { label: slaExposure.label, tone: slaExposure.tone }
    const category = resolvePerimeterCategory(t.category)
    const perimeterDisplay = category ? perimeterLabel(category) : t.perimeter ?? "—"
    const aiAction = action?.recommendedAction ?? null
    const kmRow = kmByTicket.get(t.id)
    const catalogPlan = plannedOperationalOutcomeForCareId(t.careId)
    const final = buildOrchestratedTicketDecision({
      careId: t.careId,
      title: t.title,
      description: t.description,
      ticketStatus: t.status,
      category: t.category,
      perimeter: t.perimeter,
      priority: t.priority,
      predictedPriority: priority?.predictedPriority ?? null,
      qualityLevel: missing?.qualityLevel ?? null,
      completenessScore: missing?.completenessScore ?? null,
      missingFields: missing?.missingFields ?? [],
      escalationSignal: escalation?.predictedEscalationRequired ?? false,
      escalationConfidence: escalation?.confidenceScore ?? null,
      transferSignal: transferRequired,
      transferConfidence: transfer?.confidenceScore ?? null,
      transferTarget: transfer?.targetPerimeter ?? null,
      aiKmId: kmRow?.kmId ?? catalogPlan?.kmCode ?? null,
      aiKmTitle: kmRow?.kmTitle ?? null,
      aiSimilarity: kmRow?.similarityScore ?? null,
      slaLabel: slaLabel.label,
      slaRiskLevel: sla?.riskLevel ?? null,
      slaPredictedBreach: sla?.predictedSlaBreach ?? false,
      slaConfidence: sla?.confidenceScore ?? null,
      priorityConfidence: priority?.confidenceScore ?? null,
      missingContextConfidence: missing?.confidenceScore ?? null,
    })
    const orchestratedDecision = final.finalSuggestedDecision
    const slaScore = slaRiskScore(sla ?? null, {
      slaDueAt: t.slaDueAt,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      externalCreatedAt: t.externalCreatedAt,
      ttrTargetHours: t.ttrTargetHours,
    })
    const escConfidence = escalation ? Math.round(escalation.confidenceScore * 100) : null
    const nextStep = recommendedNextStep({
      orchestratedDecision,
      actionReason: action?.reason ?? null,
      slaLabel: slaLabel.label,
    })

    return {
      ticketId: t.id,
      careId: t.careId,
      title: t.title,
      storeName: t.storeName,
      perimeterLabel: perimeterDisplay,
      priority: t.priority,
      predictedPriority: priority?.predictedPriority ?? null,
      status: t.status,
      slaDueAt: t.slaDueAt?.toISOString() ?? null,
      slaLabel: slaLabel.label,
      slaTone: slaLabel.tone,
      slaRiskLevel: sla?.riskLevel ?? null,
      slaPredictedBreach: sla?.predictedSlaBreach ?? false,
      aiAction,
      orchestratedDecision,
      aiActionLabel: final.decisionLabel,
      decisionTarget: final.decisionTarget,
      kmCode: final.kmReference.kmId,
      actionConfidencePct: final.decisionConfidencePct,
      actionReason: final.decisionReasoning,
      recommendedNextStep: nextStep,
      escalationRequired,
      escalationConfidencePct: escConfidence,
      escalationSeverity: escalationSeverity(
        escalationRequired,
        escalation?.confidenceScore ?? 0,
        priority?.predictedPriority ?? t.priority,
      ),
      transferRequired,
      qualityLevel: missing?.qualityLevel ?? null,
      hasKmRecommendation: final.kmReference.available,
      sortScore: computeSortScore({
        slaScore,
        predictedPriority: priority?.predictedPriority ?? null,
        escalationRequired,
        transferRequired,
        qualityLevel: missing?.qualityLevel ?? null,
        aiAction,
      }),
      createdAt: t.createdAt.toISOString(),
      updatedAt: (t.updatedAt ?? t.createdAt).toISOString(),
    }
  })

  return rows.sort(compareNextTickets)
}

function slaPressureRank(label: string): number {
  if (label === "Breached") return 3
  if (label === "At risk") return 2
  return 1
}

/** Next-handle order: P1/P2 → SLA pressure → AI score → updated date. */
export function compareNextTickets(a: AgentQueueRow, b: AgentQueueRow): number {
  const prA = priorityRank(a.predictedPriority ?? a.priority)
  const prB = priorityRank(b.predictedPriority ?? b.priority)
  if (prB !== prA) return prB - prA

  const slaA = slaPressureRank(a.slaLabel)
  const slaB = slaPressureRank(b.slaLabel)
  if (slaB !== slaA) return slaB - slaA

  if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

export function computeAgentDashboardKpis(queue: AgentQueueRow[]): AgentDashboardKpis {
  return {
    openTickets: queue.length,
    slaAttention: queue.filter((r) => isOrchestratedSlaAttention(r.slaLabel, r.slaRiskLevel)).length,
    escalation: queue.filter((r) => r.orchestratedDecision === "ESCALATE_N3").length,
    transfer: queue.filter((r) => r.orchestratedDecision === "TRANSFER").length,
    suspend: queue.filter((r) => isPendingHoldDecision(r.orchestratedDecision)).length,
  }
}

/** @deprecated Use computeAgentDashboardKpis */
export function computeAgentPriorityStrip(queue: AgentQueueRow[]): AgentPriorityStrip {
  return computeAgentDashboardKpis(queue)
}

function isMissingContext(qualityLevel: string | null): boolean {
  return qualityLevel === "INCOMPLETE" || qualityLevel === "POOR"
}

function isHighAttentionTicket(r: AgentQueueRow): boolean {
  const p1p2 = r.predictedPriority === "P1" || r.predictedPriority === "P2"
  const slaBreached = r.slaLabel === "Breached" || r.slaPredictedBreach
  return (
    p1p2 ||
    r.escalationRequired ||
    r.transferRequired ||
    slaBreached ||
    isMissingContext(r.qualityLevel)
  )
}

export function buildHighAttentionTickets(queue: AgentQueueRow[], limit = 10): AgentHighAttentionRow[] {
  return queue
    .filter(isHighAttentionTicket)
    .slice(0, limit)
    .map((r) => ({
      ticketId: r.ticketId,
      careId: r.careId,
      title: r.title,
      predictedPriority: r.predictedPriority,
      priority: r.priority,
      aiActionLabel: r.aiActionLabel,
      actionReason: r.actionReason ?? r.recommendedNextStep,
      recommendedNextStep: r.recommendedNextStep,
    }))
}

/** @deprecated Use buildHighAttentionTickets */
export function buildHighRiskTickets(queue: AgentQueueRow[], limit = 10): AgentHighAttentionRow[] {
  return buildHighAttentionTickets(queue, limit)
}

export function buildNextTicketsQueue(queue: AgentQueueRow[], limit = 8): AgentQueueRow[] {
  return [...queue].sort(compareNextTickets).slice(0, limit)
}

const FEED_DECISION_LABELS: Partial<Record<OperationalDecision, string>> = {
  ESCALATE_N3: "Escalation suggested",
  TRANSFER: "Transfer suggested",
  SUSPEND: "Suspend suggested",
}

const AGENT_ACTION_EVENT_TYPES = new Set([
  "resolve",
  "escalate_n3",
  "transfer_monetique",
  "transfer_materiel",
  "transfer_bo",
  "transfer_reseau",
  "transfer_bureautique",
  "transfer_infrastructure",
  "agent_feedback",
  "ai_feedback",
])

function feedLabelForDecision(decision: OperationalDecision): string | null {
  return FEED_DECISION_LABELS[decision] ?? null
}

function isAgentActionEvent(eventType: string): boolean {
  return AGENT_ACTION_EVENT_TYPES.has(eventType)
}

function dedupeFeedEvents(events: AgentActivityRow[]): AgentActivityRow[] {
  const latestByKey = new Map<string, AgentActivityRow>()
  for (const event of events) {
    const key = `${event.careId}:${event.label}`
    const existing = latestByKey.get(key)
    if (
      !existing ||
      new Date(event.occurredAt).getTime() > new Date(existing.occurredAt).getTime()
    ) {
      latestByKey.set(key, event)
    }
  }
  return [...latestByKey.values()]
}

/** Queue-linked operational feed — same orchestration source as dashboard KPIs. */
export async function buildOperationalFeed(
  queue: AgentQueueRow[],
  limit = 8,
): Promise<AgentActivityRow[]> {
  const events: AgentActivityRow[] = []

  for (const row of queue) {
    const label = feedLabelForDecision(row.orchestratedDecision)
    if (!label) continue
    events.push({
      id: `orch-${row.ticketId}-${row.orchestratedDecision}`,
      ticketId: row.ticketId,
      careId: row.careId,
      label,
      occurredAt: row.updatedAt,
    })
  }

  const [syncLog, historyRows] = await Promise.all([
    cpAgentLatestSyncLog(),
    cpAgentRecentActivity(limit * 3),
  ])

  if (syncLog?.syncFinishedAt && queue.length > 0) {
    const syncAnchor = [...queue].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0]!
    events.push({
      id: `sync-${syncLog.id ?? syncLog.syncFinishedAt.toISOString()}`,
      ticketId: syncAnchor.ticketId,
      careId: syncAnchor.careId,
      label: "Ticket synchronized",
      occurredAt: syncLog.syncFinishedAt.toISOString(),
    })
  }

  for (const row of historyRows) {
    if (!isOperationalCareTicketId(row.careId) || !isAgentActionEvent(row.eventType)) continue
    events.push({
      id: `hist-${row.id}`,
      ticketId: row.ticketId,
      careId: row.careId,
      label: "Agent action submitted",
      occurredAt: row.occurredAt.toISOString(),
    })
  }

  return dedupeFeedEvents(events)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit)
}

/** @deprecated Use buildOperationalFeed(queue) */
export async function buildRecentOperationalActivity(limit = 8): Promise<AgentActivityRow[]> {
  const queue = await buildAgentOperationalQueue()
  return buildOperationalFeed(queue, limit)
}

export function buildIncompleteTickets(queue: AgentQueueRow[], limit = 8): AgentWorkSectionRow[] {
  return queue
    .filter((r) => r.qualityLevel === "INCOMPLETE" || r.qualityLevel === "POOR")
    .slice(0, limit)
    .map(toWorkRow)
}

export function buildStatusChartFromQueue(queue: AgentQueueRow[]): StatusChartRow[] {
  const buckets = new Map<string, number>()
  for (const row of queue) {
    const label = workflowStatusLabel(row.status)
    buckets.set(label, (buckets.get(label) ?? 0) + 1)
  }
  const order = ["Open", "In Progress", "Monitoring", "Waiting Store", "Suspended"]
  return order
    .map((label) => ({ label, count: buckets.get(label) ?? 0 }))
    .filter((r) => r.count > 0)
}

function workflowStatusLabel(status: string): string {
  switch (status) {
    case "OPEN":
      return "Open"
    case "IN_PROGRESS":
      return "In Progress"
    case "MONITORING":
      return "Monitoring"
    case "WAITING_STORE":
      return "Waiting Store"
    case "SUSPENDED":
      return "Suspended"
    default:
      return "Open"
  }
}

export function buildPriorityChart(queue: AgentQueueRow[]): PriorityChartRow[] {
  const counts = new Map<string, number>()
  for (const row of queue) {
    const p = row.predictedPriority ?? row.priority
    const key = p?.toUpperCase().startsWith("P") ? p.toUpperCase() : p
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return ["P1", "P2", "P3", "P4"].map((priority) => ({ priority, count: counts.get(priority) ?? 0 }))
}

function toWorkRow(r: AgentQueueRow): AgentWorkSectionRow {
  return {
    ticketId: r.ticketId,
    careId: r.careId,
    title: r.title,
    storeName: r.storeName,
    perimeterLabel: r.perimeterLabel,
    aiActionLabel: r.aiActionLabel,
    actionConfidencePct: r.actionConfidencePct,
    actionReason: r.actionReason,
    slaLabel: r.slaLabel,
    slaTone: r.slaTone,
  }
}

export function buildAgentWorkSections(queue: AgentQueueRow[]) {
  const priorityWork = queue.filter((r) => r.sortScore >= 50).slice(0, 8).map(toWorkRow)
  const kmOpportunities = queue
    .filter(
      (r) =>
        r.hasKmRecommendation &&
        !r.escalationRequired &&
        !r.transferRequired &&
        r.orchestratedDecision === "RESOLVE",
    )
    .slice(0, 6)
    .map(toWorkRow)
  const incompleteTickets = queue
    .filter((r) => r.qualityLevel === "INCOMPLETE" || r.qualityLevel === "POOR")
    .slice(0, 6)
    .map(toWorkRow)
  const escalationTransfer = queue
    .filter((r) => r.escalationRequired || r.transferRequired)
    .slice(0, 8)
    .map(toWorkRow)

  return { priorityWork, kmOpportunities, incompleteTickets, escalationTransfer }
}

export function buildPerimeterPressureChart(queue: AgentQueueRow[]): PerimeterPressureChartRow[] {
  const buckets = new Map<string, { active: number; slaRisk: number }>()
  for (const row of queue) {
    const key = row.perimeterLabel
    const cur = buckets.get(key) ?? { active: 0, slaRisk: 0 }
    cur.active += 1
    if (row.slaTone === "critical" || row.slaTone === "warning") cur.slaRisk += 1
    buckets.set(key, cur)
  }
  return [...buckets.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.active - a.active || a.label.localeCompare(b.label))
}

export function buildSlaExposureChartFromQueue(queue: AgentQueueRow[]): SlaExposureChartRow[] {
  const counts = { breached: 0, at_risk: 0, on_track: 0 }
  for (const row of queue) {
    if (row.slaLabel === "Breached") counts.breached += 1
    else if (row.slaLabel === "At risk") counts.at_risk += 1
    else if (row.slaLabel === "On track") counts.on_track += 1
  }
  const labels: Record<string, string> = {
    breached: "Dépassé",
    at_risk: "À risque",
    on_track: "Conforme",
  }
  return (["breached", "at_risk", "on_track"] as const).map((bucket) => ({
    bucket,
    label: labels[bucket]!,
    count: counts[bucket],
  }))
}


export function buildDecisionDistributionChart(queue: AgentQueueRow[]): ActionDistributionChartRow[] {
  const counts = new Map<OperationalDecision, number>()
  for (const row of queue) {
    const decision = row.orchestratedDecision
    counts.set(decision, (counts.get(decision) ?? 0) + 1)
  }

  const labels: Record<OperationalDecision, string> = {
    RESOLVE: "Résoudre",
    ESCALATE_N3: "Escalade N3",
    TRANSFER: "Transfert",
    SUSPEND: "Suspendre",
    REQUEST_INFORMATION: "Demander des informations",
  }

  return [...counts.entries()]
    .map(([action, count]) => ({ action, label: labels[action], count }))
    .sort((a, b) => b.count - a.count)
}

/** @deprecated Use buildDecisionDistributionChart */
export function buildActionDistributionChart(queue: AgentQueueRow[]): ActionDistributionChartRow[] {
  return buildDecisionDistributionChart(queue)
}

export async function buildSlaExposureChart(): Promise<SlaExposureChartRow[]> {
  const buckets = await cpAgentSlaRiskBuckets()
  const labels: Record<string, string> = {
    breached: "Dépassé",
    at_risk: "À risque",
    on_track: "Conforme",
  }
  const order = ["breached", "at_risk", "on_track"]
  const byBucket = new Map(buckets.map((b) => [b.bucket, b.count]))
  return order
    .map((bucket) => ({
      bucket,
      label: labels[bucket] ?? bucket,
      count: byBucket.get(bucket) ?? 0,
    }))
    .filter((r) => r.count > 0)
}

export async function buildTicketQualityChart(): Promise<TicketQualityChartRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      qualityLevel: cpAgentAiMissingInformationAnalysis.qualityLevel,
      c: count(),
    })
    .from(cpAgentAiMissingInformationAnalysis)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiMissingInformationAnalysis.ticketId))
    .where(OPEN_FILTER)
    .groupBy(cpAgentAiMissingInformationAnalysis.qualityLevel)

  const complete = rows.find((r) => r.qualityLevel === "COMPLETE")
  const partial = rows.find((r) => r.qualityLevel === "ADEQUATE")
  const incomplete = rows.filter((r) => r.qualityLevel === "INCOMPLETE" || r.qualityLevel === "POOR")

  return [
    { level: "complete", label: "Complete", count: Number(complete?.c ?? 0) },
    { level: "partial", label: "Partially incomplete", count: Number(partial?.c ?? 0) },
    {
      level: "incomplete",
      label: "Incomplete",
      count: incomplete.reduce((s, r) => s + Number(r.c), 0),
    },
  ]
}

export function buildStorePressureChart(queue: AgentQueueRow[], limit = 6): StorePressureRow[] {
  const stores = new Map<string, { open: number; slaRisk: number }>()
  for (const row of queue) {
    const name = row.storeName ?? "Unknown store"
    const cur = stores.get(name) ?? { open: 0, slaRisk: 0 }
    cur.open += 1
    if (row.slaTone === "critical" || row.slaTone === "warning") cur.slaRisk += 1
    stores.set(name, cur)
  }
  return [...stores.entries()]
    .map(([storeName, v]) => ({ storeName, ...v }))
    .sort((a, b) => b.open - a.open || b.slaRisk - a.slaRisk)
    .slice(0, limit)
}
