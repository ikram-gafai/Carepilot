/**
 * Single source of truth for agent operational decisions.
 * All agent surfaces (dashboard, tickets, detail, actions) must consume this object.
 */

import {
  formatN3SignalValue,
  formatRoutingSignalValue,
  formatSlaAttentionValue,
  SIGNAL_LABELS,
} from "@/lib/ai/decision-support-terminology"
import {
  buildFinalDecisionInput,
  resolveFoWorkflowStep,
} from "@/lib/ai/orchestration/final-suggested-decision"
import {
  isResolvableKmScope,
  resolveApplicableKm,
} from "@/lib/ai/orchestration/km-applicability"
import {
  hasSuspendInformationGaps,
  isWaitingWorkflowStatus,
  missingContextSeverity,
} from "@/lib/ai/orchestration/missing-context-gate"
import { plannedOperationalOutcomeForCareId } from "@/lib/care-operational/catalog-operational-outcome"
import { deriveTransferReason, deriveTransferTargetPerimeter } from "@/lib/ai/transfer-reason"
import {
  buildNormalizedSignal,
  priorityAttentionScorePct,
  slaAttentionScorePct,
} from "@/lib/ai/signal-severity"
import { decisionConfidencePctFromOrchestration } from "@/lib/ai/recommendation-confidence"
import type { OperationalDecision } from "@/lib/ai/operational-decision"
import type { OperationalRiskSignal } from "@/lib/ai/orchestration/types"

export type KmReferenceType = "resolution" | "diagnostic" | "routing" | "validation"

export type KmReference = {
  available: boolean
  kmType: KmReferenceType
  kmId: string | null
  kmTitle: string | null
  source: "ai" | "catalog" | "none"
  similarityScore: number | null
}

export type MissingContextState = {
  blocking: boolean
  waitingStatus: boolean
  qualityLevel: string | null
  completenessScore: number | null
  missingFields: string[]
  severity: "none" | "partial" | "blocking"
  informationGaps: boolean
}

export type SlaState = {
  label: string
  riskLevel: string | null
  predictedBreach: boolean
  attention: boolean
}

export type OrchestratedTicketDecision = {
  finalSuggestedDecision: OperationalDecision
  decisionLabel: string
  decisionTarget: string | null
  decisionReasoning: string
  decisionConfidencePct: number
  workflowStep: number
  workflowStepLabel: string
  decisionSignals: OperationalRiskSignal[]
  kmReference: KmReference
  missingContext: MissingContextState
  slaState: SlaState
}

export type OrchestratedTicketContext = {
  careId?: string | null
  title?: string | null
  description?: string | null
  ticketStatus: string
  category: string | null
  perimeter: string | null
  priority?: string | null
  predictedPriority?: string | null
  qualityLevel?: string | null
  completenessScore?: number | null
  missingFields?: string[]
  escalationSignal?: boolean
  escalationConfidence?: number | null
  transferSignal?: boolean
  transferConfidence?: number | null
  transferTarget?: string | null
  aiKmId?: string | null
  aiKmTitle?: string | null
  aiSimilarity?: number | null
  slaLabel?: string | null
  slaRiskLevel?: string | null
  slaPredictedBreach?: boolean
  slaConfidence?: number | null
  priorityConfidence?: number | null
  missingContextConfidence?: number | null
}

const TRANSFER_TARGET_DISPLAY: Record<string, string> = {
  Network: "Réseau",
  Hardware: "Matériel",
  Payment: "Monétique",
  "Back office": "Back Office",
  Loyalty: "Fidélité",
  "Store infrastructure": "Infrastructure",
  SCO: "SCO",
  FO: "FO",
}

const CATEGORY_TRANSFER_TARGET: Record<string, string> = {
  NETWORK: "Réseau",
  HARDWARE: "Matériel",
  PAYMENT: "Monétique",
  BACK_OFFICE: "Back Office",
  STORE_INFRA: "Infrastructure",
  LOYALTY: "Fidélité",
  IT_DESK: "Back Office",
}

function displayTransferTarget(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  return TRANSFER_TARGET_DISPLAY[raw.trim()] ?? raw.trim()
}

export function resolveTransferTargetPerimeter(ctx: OrchestratedTicketContext): string | null {
  const fromCategory = CATEGORY_TRANSFER_TARGET[(ctx.category ?? "").toUpperCase()]
  if (fromCategory) return fromCategory

  if (ctx.transferTarget?.trim()) {
    const displayed = displayTransferTarget(ctx.transferTarget)
    if (displayed) return displayed
  }

  const derived = deriveTransferTargetPerimeter({
    title: ctx.title ?? "",
    description: ctx.description ?? "",
    perimeter: ctx.perimeter,
    category: ctx.category,
  })
  return displayTransferTarget(derived)
}

export function formatOrchestratedDecisionLabel(
  decision: OperationalDecision,
  target: string | null,
): string {
  switch (decision) {
    case "REQUEST_INFORMATION":
      return "Demander des informations"
    case "RESOLVE":
      return "Résoudre"
    case "ESCALATE_N3":
      return "Escalade N3"
    case "SUSPEND":
      return "Suspendre"
    case "TRANSFER":
      return target ? `Transfert → ${target}` : "Transfert"
    default:
      return "—"
  }
}

function kmTypeForDecision(decision: OperationalDecision): KmReferenceType {
  switch (decision) {
    case "RESOLVE":
      return "resolution"
    case "ESCALATE_N3":
      return "diagnostic"
    case "TRANSFER":
      return "routing"
    case "SUSPEND":
    case "REQUEST_INFORMATION":
      return "validation"
    default:
      return "diagnostic"
  }
}

function resolveKmReference(
  decision: OperationalDecision,
  ctx: OrchestratedTicketContext,
  catalogKmCode: string | null,
): KmReference {
  const kmType = kmTypeForDecision(decision)

  if (decision === "SUSPEND" || decision === "REQUEST_INFORMATION") {
    return {
      available: false,
      kmType,
      kmId: null,
      kmTitle: null,
      source: "none",
      similarityScore: null,
    }
  }

  const useCatalogForRouting = decision === "TRANSFER" || decision === "ESCALATE_N3"
  const aiKmId =
    decision === "RESOLVE"
      ? ctx.aiKmId ?? catalogKmCode ?? null
      : useCatalogForRouting
        ? catalogKmCode ?? ctx.aiKmId ?? null
        : ctx.aiKmId ?? catalogKmCode ?? null

  const km = resolveApplicableKm({
    category: ctx.category,
    perimeter: ctx.perimeter,
    aiKmId,
    aiKmTitle: ctx.aiKmTitle,
    aiSimilarity: ctx.aiSimilarity,
  })

  if (decision === "RESOLVE" && !isResolvableKmScope(ctx.category, ctx.perimeter)) {
    return { available: false, kmType, kmId: null, kmTitle: null, source: "none", similarityScore: null }
  }

  if (decision === "TRANSFER") {
    return {
      available: Boolean(km.kmId),
      kmType,
      kmId: km.kmId,
      kmTitle: km.kmTitle,
      source: km.source,
      similarityScore: km.similarityScore,
    }
  }

  return {
    available: km.hasKm,
    kmType,
    kmId: km.kmId,
    kmTitle: km.kmTitle,
    source: km.source,
    similarityScore: km.similarityScore,
  }
}

const SIGNAL_SCORE = { LOW: 18, MEDIUM: 52, HIGH: 85 } as const

/** Signals derived from final decision — never contradict the recommendation. */
export function buildAlignedDecisionSignals(input: {
  decision: OperationalDecision
  transferTarget: string | null
  slaRiskLevel?: string | null
  slaPredictedBreach?: boolean
  slaConfidence?: number | null
  predictedPriority?: string | null
  priorityConfidence?: number | null
}): OperationalRiskSignal[] {
  let escScore: number = SIGNAL_SCORE.LOW
  let trfScore: number = SIGNAL_SCORE.LOW
  let missingScore: number = SIGNAL_SCORE.LOW

  switch (input.decision) {
    case "RESOLVE":
      escScore = SIGNAL_SCORE.LOW
      trfScore = SIGNAL_SCORE.LOW
      missingScore = SIGNAL_SCORE.LOW
      break
    case "ESCALATE_N3":
      escScore = SIGNAL_SCORE.HIGH
      trfScore = SIGNAL_SCORE.LOW
      missingScore = SIGNAL_SCORE.LOW
      break
    case "TRANSFER":
      escScore = SIGNAL_SCORE.LOW
      trfScore = SIGNAL_SCORE.HIGH
      missingScore = SIGNAL_SCORE.LOW
      break
    case "SUSPEND":
    case "REQUEST_INFORMATION":
      escScore = SIGNAL_SCORE.LOW
      trfScore = SIGNAL_SCORE.LOW
      missingScore = SIGNAL_SCORE.HIGH
      break
  }

  const signals: OperationalRiskSignal[] = [
    buildNormalizedSignal({
      key: "escalation",
      label: SIGNAL_LABELS.escalation,
      value: formatN3SignalValue(escScore >= 70),
      signalScore: escScore,
    }),
    buildNormalizedSignal({
      key: "transfer",
      label: SIGNAL_LABELS.transfer,
      value: formatRoutingSignalValue(trfScore >= 70, input.transferTarget),
      signalScore: trfScore,
    }),
    buildNormalizedSignal({
      key: "sla",
      label: SIGNAL_LABELS.sla,
      value: formatSlaAttentionValue(input.slaPredictedBreach ?? false, input.slaRiskLevel ?? "LOW"),
      signalScore: slaAttentionScorePct({
        confidenceScore: input.slaConfidence,
        predictedBreach: input.slaPredictedBreach,
        riskLevel: input.slaRiskLevel,
      }),
    }),
  ]

  if (input.predictedPriority) {
    signals.push(
      buildNormalizedSignal({
        key: "priority",
        label: SIGNAL_LABELS.priority,
        value: input.predictedPriority,
        signalScore: priorityAttentionScorePct({
          confidenceScore: input.priorityConfidence,
          predictedPriority: input.predictedPriority,
        }),
      }),
    )
  }

  if (input.decision === "SUSPEND" || input.decision === "REQUEST_INFORMATION") {
    signals.push(
      buildNormalizedSignal({
        key: "missing_context",
        label: "Contexte manquant",
        value: input.decision === "REQUEST_INFORMATION" ? "Incomplet" : "Bloquant",
        signalScore: missingScore,
      }),
    )
  }

  return signals
}

function buildDecisionReasoning(input: {
  decision: OperationalDecision
  target: string | null
  km: KmReference
  ctx: OrchestratedTicketContext
  catalogSuspendReason: string | null
}): string {
  const { decision, target, km, ctx, catalogSuspendReason } = input
  const category = ctx.category ?? "operational"

  switch (decision) {
    case "REQUEST_INFORMATION":
      return "Contexte ticket incomplet — demander identifiant terminal, erreur et étapes de reproduction au magasin."
    case "RESOLVE":
      return km.kmId
        ? `${km.kmId} (${km.kmTitle ?? "procédure"}) — appliquer sur périmètre FO et valider avant clôture.`
        : "Incident traitable sur périmètre FO actuel — résoudre après validation."
    case "ESCALATE_N3":
      return km.kmId
        ? `${km.kmId} insuffisante ou en échec — spécialiste N3 requis pour ${category} sur périmètre FO.`
        : `Aucune KM de remédiation sur périmètre FO — escalader N3 pour traitement spécialiste ${category}.`
    case "TRANSFER":
      return target
        ? `${deriveTransferReason({
            title: ctx.title ?? "",
            description: ctx.description ?? "",
            perimeter: ctx.perimeter,
            category: ctx.category,
            targetPerimeter: target,
          })} Router vers ${target}.`
        : "Propriété d'un autre périmètre opérationnel — router avec le contexte incident."
    case "SUSPEND":
      return (
        catalogSuspendReason ??
        (isWaitingWorkflowStatus(ctx.ticketStatus)
          ? "Traitement bloqué en attente de confirmation magasin ou dépendance externe."
          : "Informations ou validation obligatoires en attente avant traitement périmètre.")
      )
    default:
      return "Décision opérationnelle dérivée de la posture signal et de la propriété périmètre."
  }
}

/** Build the unified orchestrated decision for any agent surface. */
export function buildOrchestratedTicketDecision(
  ctx: OrchestratedTicketContext,
): OrchestratedTicketDecision {
  const catalogPlan = plannedOperationalOutcomeForCareId(ctx.careId)
  const transferTarget = resolveTransferTargetPerimeter(ctx)

  const kmPreview = resolveApplicableKm({
    category: ctx.category,
    perimeter: ctx.perimeter,
    aiKmId: ctx.aiKmId ?? catalogPlan?.kmCode ?? null,
    aiKmTitle: ctx.aiKmTitle,
    aiSimilarity: ctx.aiSimilarity,
  })

  const decisionInput = buildFinalDecisionInput({
    careId: ctx.careId,
    ticketStatus: ctx.ticketStatus,
    category: ctx.category,
    perimeter: ctx.perimeter,
    priority: ctx.predictedPriority ?? ctx.priority ?? null,
    hasKm: kmPreview.hasKm,
    hasResolvableKm: kmPreview.hasKm && isResolvableKmScope(ctx.category, ctx.perimeter),
    qualityLevel: ctx.qualityLevel,
    completenessScore: ctx.completenessScore,
    missingFields: ctx.missingFields,
    transferSignal: ctx.transferSignal ?? false,
    transferConfidence: ctx.transferConfidence ?? null,
    transferTarget: transferTarget,
    escalationSignal: ctx.escalationSignal ?? false,
    escalationConfidence: ctx.escalationConfidence ?? null,
  })

  const workflow = resolveFoWorkflowStep(decisionInput)
  const decision = workflow.decision
  const target = decision === "TRANSFER" ? transferTarget : null
  const label = formatOrchestratedDecisionLabel(decision, target)

  const kmReference = resolveKmReference(decision, ctx, catalogPlan?.kmCode ?? null)

  const missingContext: MissingContextState = {
    blocking: isWaitingWorkflowStatus(ctx.ticketStatus),
    waitingStatus: isWaitingWorkflowStatus(ctx.ticketStatus),
    qualityLevel: ctx.qualityLevel ?? null,
    completenessScore: ctx.completenessScore ?? null,
    missingFields: ctx.missingFields ?? [],
    severity: missingContextSeverity({
      qualityLevel: ctx.qualityLevel,
      missingFields: ctx.missingFields,
    }),
    informationGaps: hasSuspendInformationGaps(ctx.missingFields),
  }

  const slaState: SlaState = {
    label: ctx.slaLabel ?? "—",
    riskLevel: ctx.slaRiskLevel ?? null,
    predictedBreach: ctx.slaPredictedBreach ?? false,
    attention:
      ctx.slaPredictedBreach === true ||
      ctx.slaRiskLevel === "HIGH" ||
      ctx.slaRiskLevel === "MEDIUM" ||
      ctx.slaLabel === "Breached" ||
      ctx.slaLabel === "At risk",
  }

  const decisionSignals = buildAlignedDecisionSignals({
    decision,
    transferTarget: target,
    slaRiskLevel: ctx.slaRiskLevel,
    slaPredictedBreach: ctx.slaPredictedBreach,
    slaConfidence: ctx.slaConfidence,
    predictedPriority: ctx.predictedPriority ?? ctx.priority ?? null,
    priorityConfidence: ctx.priorityConfidence,
  })

  const decisionReasoning = buildDecisionReasoning({
    decision,
    target,
    km: kmReference,
    ctx,
    catalogSuspendReason: catalogPlan?.suspendReason ?? null,
  })

  return {
    finalSuggestedDecision: decision,
    decisionLabel: label,
    decisionTarget: target,
    decisionReasoning,
    decisionConfidencePct: decisionConfidencePctFromOrchestration(ctx, decision, kmReference, target),
    workflowStep: workflow.workflowStep,
    workflowStepLabel: workflow.stepLabel,
    decisionSignals,
    kmReference,
    missingContext,
    slaState,
  }
}

/** Normalize decision label for badge styling (base decision without target). */
export function baseDecisionFromLabel(label: string): OperationalDecision | null {
  if (label.startsWith("Demander")) return "REQUEST_INFORMATION"
  if (label.startsWith("Request information")) return "REQUEST_INFORMATION"
  if (label.startsWith("Apply KM")) return "RESOLVE"
  if (label.startsWith("Résoudre") || label.startsWith("Resolve")) return "RESOLVE"
  if (label.startsWith("Escalade") || label.startsWith("Escalate")) return "ESCALATE_N3"
  if (label.startsWith("Transfert") || label.startsWith("Transfer")) return "TRANSFER"
  if (label.startsWith("Suspendre") || label.startsWith("Suspend")) return "SUSPEND"
  return null
}
