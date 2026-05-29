import { applyKmResolveGuard } from "@/lib/ai/orchestration/apply-km-resolve-guard"
import {
  buildOrchestratedTicketDecision,
  buildAlignedDecisionSignals,
} from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { analyzeMissingInformation } from "@/lib/ai/missing-information"
import { plannedOperationalOutcomeForCareId } from "@/lib/care-operational/catalog-operational-outcome"
import {
  formatCompletenessScore,
  formatMissingFieldWarnings,
  formatQualityLevel,
} from "@/lib/ai/missing-display"
import { formatKmMethodLabel } from "@/lib/ai/km-display"
import { LLM_EXPLANATION_ENABLED } from "@/lib/ai-phase"
import { decisionConfidencePctFromOrchestration } from "@/lib/ai/recommendation-confidence"
import { aggregateAiSignals, type AggregatedAiSignals } from "@/lib/ai/orchestration/ai-signal-aggregator"
import type {
  KmRecommendationItem,
  OperationalIntelligencePayload,
  TicketQualityPayload,
} from "@/lib/ai/orchestration/types"
import { isOperationalCareTicketId } from "@/lib/care-operational/operational-ticket-scope"
import { getDb } from "@/lib/db"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { eq } from "drizzle-orm"

const VAGUE_LABELS = new Set(["VAGUE_DESCRIPTION", "GENERIC_TITLE"])
const IDENTIFIER_LABELS = new Set([
  "MISSING_STORE_IDENTIFIER",
  "MISSING_LANE_NUMBER",
  "MISSING_TERMINAL_ID",
])

const KM_TYPE_LABELS = {
  resolution: "KM de résolution",
  diagnostic: "KM diagnostic",
  routing: "KM de routage",
  validation: "KM de validation",
} as const

type TicketQualityInput = {
  id: number
  title?: string | null
  description?: string | null
  category?: string | null
}

function resolveMissingInformation(
  signals: AggregatedAiSignals,
  ticket?: TicketQualityInput,
) {
  if (signals.missingInformation) return signals.missingInformation
  if (!ticket?.title && !ticket?.description) return null
  return analyzeMissingInformation({
    id: ticket.id,
    title: ticket.title ?? "",
    description: ticket.description ?? "",
    category: ticket.category ?? null,
  })
}

function buildTicketQuality(
  signals: AggregatedAiSignals,
  ticket?: TicketQualityInput,
): TicketQualityPayload {
  const row = resolveMissingInformation(signals, ticket)
  if (!row) {
    return {
      available: false,
      completenessScore: null,
      completenessPct: null,
      qualityLevel: null,
      qualityLabel: null,
      missingFields: [],
      warnings: [],
      vagueDescription: false,
      missingIdentifiers: false,
      detectionMethod: null,
      confidencePct: null,
    }
  }

  const warnings = formatMissingFieldWarnings(row.missingFields)
  const missingFields = row.missingFields.map(String)
  return {
    available: true,
    completenessScore: row.completenessScore,
    completenessPct: Math.round(row.completenessScore * 100),
    qualityLevel: row.qualityLevel,
    qualityLabel: formatQualityLevel(row.qualityLevel),
    missingFields,
    warnings,
    vagueDescription: missingFields.some((f) => VAGUE_LABELS.has(f)),
    missingIdentifiers: missingFields.some((f) => IDENTIFIER_LABELS.has(f)),
    detectionMethod: row.detectionMethod,
    confidencePct: Math.round(row.confidenceScore * 100),
  }
}

function mapKmItem(rec: AggregatedAiSignals["km"][number]): KmRecommendationItem {
  return {
    rank: rec.rank,
    kmId: rec.kmId,
    title: rec.kmTitle,
    confidenceLevel: rec.confidenceLevel,
    similarityPct: Math.round(rec.similarityScore * 100),
    reason: rec.reason,
    whyThisKm: rec.reason ?? `Top semantic match for ticket perimeter and incident wording.`,
  }
}

function countModules(payload: Omit<OperationalIntelligencePayload, "meta">): { available: number; total: number } {
  const flags = [
    payload.ticketQuality.available,
    payload.operationalRisk.available,
    payload.recommendedAction.available,
    payload.kmRecommendation.available,
    payload.operationalExplanation.available,
  ]
  return { available: flags.filter(Boolean).length, total: flags.length }
}

type TicketContext = {
  careId: string | null
  ticketStatus: string
  ticketPriority: string | null | undefined
  category: string | null
  perimeter: string | null
  title?: string | null
  description?: string | null
}

function buildPayload(
  ticketId: number,
  ticket: TicketContext,
  signals: AggregatedAiSignals,
): OperationalIntelligencePayload {
  const ticketQuality = buildTicketQuality(signals, {
    id: ticketId,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
  })
  const actionRow = signals.action
  const missingRow = resolveMissingInformation(signals, {
    id: ticketId,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
  })
  const effectivePriority = signals.priority?.predictedPriority ?? ticket.ticketPriority ?? null

  const kmRows = signals.km
  const aiPrimary = kmRows[0] ? mapKmItem(kmRows[0]) : null
  const catalogPlan = plannedOperationalOutcomeForCareId(ticket.careId)

  const orchestrationCtx = {
    careId: ticket.careId,
    title: ticket.title,
    description: ticket.description,
    ticketStatus: ticket.ticketStatus,
    category: ticket.category,
    perimeter: ticket.perimeter,
    priority: ticket.ticketPriority,
    predictedPriority: effectivePriority,
    qualityLevel: missingRow?.qualityLevel ?? null,
    completenessScore: missingRow?.completenessScore ?? null,
    missingFields: missingRow?.missingFields.map(String) ?? [],
    escalationSignal: signals.escalation?.predictedEscalationRequired ?? false,
    escalationConfidence: signals.escalation?.confidenceScore ?? null,
    transferSignal: signals.transfer?.predictedTransferRequired ?? false,
    transferConfidence: signals.transfer?.confidenceScore ?? null,
    transferTarget: signals.transfer?.targetPerimeter ?? null,
    aiKmId: aiPrimary?.kmId ?? catalogPlan?.kmCode ?? null,
    aiKmTitle: aiPrimary?.title ?? null,
    aiSimilarity: aiPrimary ? aiPrimary.similarityPct / 100 : null,
    slaRiskLevel: signals.sla?.riskLevel ?? null,
    slaPredictedBreach: signals.sla?.predictedSlaBreach ?? false,
    slaConfidence: signals.sla?.confidenceScore ?? null,
    priorityConfidence: signals.priority?.confidenceScore ?? null,
    missingContextConfidence: missingRow?.confidenceScore ?? null,
  }

  let orchestrated = buildOrchestratedTicketDecision(orchestrationCtx)

  if (
    orchestrated.finalSuggestedDecision === "RESOLVE" &&
    !orchestrated.kmReference.available
  ) {
    orchestrated = buildOrchestratedTicketDecision({ ...orchestrationCtx, aiKmId: null })
    if (orchestrated.finalSuggestedDecision === "RESOLVE") {
      orchestrated = {
        ...orchestrated,
        finalSuggestedDecision: "ESCALATE_N3",
        decisionLabel: "Escalade N3",
        decisionTarget: null,
        decisionReasoning:
          "Aucune procédure KM validée — escalader N3 pour traitement spécialiste.",
        decisionConfidencePct: decisionConfidencePctFromOrchestration(
          orchestrationCtx,
          "ESCALATE_N3",
          { ...orchestrated.kmReference, available: false },
          null,
        ),
        workflowStep: 9,
        workflowStepLabel: "Sans KM — escalade FO",
        decisionSignals: buildAlignedDecisionSignals({
          decision: "ESCALATE_N3",
          transferTarget: null,
          slaRiskLevel: orchestrationCtx.slaRiskLevel,
          slaPredictedBreach: orchestrationCtx.slaPredictedBreach,
          slaConfidence: orchestrationCtx.slaConfidence,
          predictedPriority: orchestrationCtx.predictedPriority ?? orchestrationCtx.priority ?? null,
          priorityConfidence: orchestrationCtx.priorityConfidence,
        }),
      }
    }
  }

  const kmRef = orchestrated.kmReference
  const primaryKm: KmRecommendationItem | null = kmRef.available && kmRef.kmId
    ? {
        rank: 1,
        kmId: kmRef.kmId,
        title: kmRef.kmTitle ?? kmRef.kmId,
        confidenceLevel: kmRef.source === "catalog" ? "MEDIUM" : "HIGH",
        similarityPct: kmRef.similarityScore != null ? Math.round(kmRef.similarityScore * 100) : 72,
        reason: `${KM_TYPE_LABELS[kmRef.kmType]} pour ${orchestrated.decisionLabel}.`,
        whyThisKm: orchestrated.decisionReasoning,
      }
    : null

  const kmRecommendation = {
    available: Boolean(primaryKm),
    primary: primaryKm,
    alternatives: kmRows.slice(1, 3).map(mapKmItem),
    methodName: kmRows[0]
      ? formatKmMethodLabel(kmRows[0].methodName)
      : kmRef.source === "catalog"
        ? KM_TYPE_LABELS[kmRef.kmType]
        : null,
  }

  const recommendedAction = applyKmResolveGuard(
    {
      available: Boolean(orchestrated.decisionLabel),
      action: actionRow?.recommendedAction ?? orchestrated.finalSuggestedDecision,
      actionLabel: orchestrated.decisionLabel,
      reason: orchestrated.decisionReasoning,
      confidencePct: orchestrated.decisionConfidencePct,
      modelVersion: actionRow?.modelVersion ?? "orchestration-fo",
      priority: 1,
    },
    kmRecommendation,
    orchestrationCtx,
  )

  const operationalRisk = {
    available: orchestrated.decisionSignals.length > 0,
    overallLevel:
      orchestrated.decisionSignals.some((s) => s.severity === "high")
        ? ("high" as const)
        : orchestrated.decisionSignals.some((s) => s.severity === "medium")
          ? ("medium" as const)
          : ("low" as const),
    headline: orchestrated.decisionReasoning,
    signals: orchestrated.decisionSignals,
  }

  const expl = signals.explanation
  const operationalExplanation = {
    available: Boolean(expl && LLM_EXPLANATION_ENABLED),
    modelName: expl?.modelName ?? null,
    operationalSummary: expl?.operationalSummary ?? null,
    recommendedActionExplanation: expl?.recommendedActionExplanation ?? null,
    reasoning: expl?.reasoning ?? null,
    missingInformationNote: expl?.missingInformationNote ?? null,
    nextSteps: expl?.nextSteps ?? null,
    latencyMs: expl?.latencyMs ?? null,
    updatedAt: expl?.updatedAt?.toISOString() ?? null,
  }

  const orchestratedPayload = {
    finalSuggestedDecision: orchestrated.finalSuggestedDecision,
    decisionLabel: orchestrated.decisionLabel,
    decisionTarget: orchestrated.decisionTarget,
    decisionReasoning: orchestrated.decisionReasoning,
    workflowStep: orchestrated.workflowStep,
    workflowStepLabel: orchestrated.workflowStepLabel,
    kmType: orchestrated.kmReference.kmType,
    kmId: orchestrated.kmReference.kmId,
    kmTitle: orchestrated.kmReference.kmTitle,
    missingContextBlocking: orchestrated.missingContext.blocking,
    slaAttention: orchestrated.slaState.attention,
  }

  const core = {
    orchestrated: orchestratedPayload,
    ticketQuality,
    operationalRisk,
    recommendedAction,
    kmRecommendation,
    operationalExplanation,
  }
  const counts = countModules(core)

  let primarySignal: OperationalIntelligencePayload["meta"]["primarySignal"] = null
  if (recommendedAction.available) primarySignal = "action"
  else if (operationalExplanation.available) primarySignal = "explanation"
  else if (operationalRisk.available) primarySignal = "risk"
  else if (ticketQuality.available) primarySignal = "quality"
  else if (kmRecommendation.available) primarySignal = "km"

  return {
    meta: {
      ticketId,
      careId: ticket.careId,
      generatedAt: new Date().toISOString(),
      modulesAvailable: counts.available,
      modulesTotal: counts.total,
      primarySignal,
    },
    ...core,
  }
}

/** Orchestrate all AI modules into one ticket intelligence payload. */
export async function getOperationalIntelligenceForTicket(
  ticketId: number,
): Promise<OperationalIntelligencePayload | null> {
  const db = getDb()
  const [ticket] = await db
    .select({
      id: cpAgentTickets.id,
      careId: cpAgentTickets.careId,
      status: cpAgentTickets.status,
      priority: cpAgentTickets.priority,
      category: cpAgentTickets.category,
      perimeter: cpAgentTickets.perimeter,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
    })
    .from(cpAgentTickets)
    .where(eq(cpAgentTickets.id, ticketId))
    .limit(1)

  if (!ticket || !isOperationalCareTicketId(ticket.careId)) return null

  const signals = await aggregateAiSignals(ticketId)
  return buildPayload(ticketId, {
    careId: ticket.careId,
    ticketStatus: ticket.status,
    ticketPriority: ticket.priority,
    category: ticket.category,
    perimeter: ticket.perimeter,
    title: ticket.title,
    description: ticket.description,
  }, signals)
}

/** Build payload from pre-loaded signals (SSR ticket page). */
export function orchestrateOperationalIntelligence(
  ticketId: number,
  careId: string | null,
  ticketStatus: string,
  signals: AggregatedAiSignals,
  ticketPriority?: string | null,
  ticketCategory?: string | null,
  ticketPerimeter?: string | null,
  ticketTitle?: string | null,
  ticketDescription?: string | null,
): OperationalIntelligencePayload {
  return buildPayload(
    ticketId,
    {
      careId,
      ticketStatus,
      ticketPriority,
      category: ticketCategory ?? null,
      perimeter: ticketPerimeter ?? null,
      title: ticketTitle,
      description: ticketDescription,
    },
    signals,
  )
}

export { aggregateAiSignals }
