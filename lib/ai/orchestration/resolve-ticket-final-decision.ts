/**
 * Build final suggested decision input from ticket + AI signal rows.
 * Delegates to unified orchestrated-ticket-decision.
 */

import {
  buildAlignedDecisionSignals,
  buildOrchestratedTicketDecision,
  type OrchestratedTicketContext,
} from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { decisionConfidencePctFromOrchestration } from "@/lib/ai/recommendation-confidence"
import type { OperationalDecision } from "@/lib/ai/operational-decision"

export type TicketDecisionContext = OrchestratedTicketContext

export type TicketFinalDecision = {
  decision: OperationalDecision
  label: string
  target: string | null
  reasoning: string
  hasKm: boolean
  kmId: string | null
  kmTitle: string | null
  kmSource: "ai" | "catalog" | "none"
  kmType: "resolution" | "diagnostic" | "routing" | "validation"
}

export function resolveTicketFinalDecision(ctx: TicketDecisionContext): TicketFinalDecision {
  let orchestrated = buildOrchestratedTicketDecision(ctx)

  if (
    orchestrated.finalSuggestedDecision === "RESOLVE" &&
    !orchestrated.kmReference.available
  ) {
    orchestrated = buildOrchestratedTicketDecision({ ...ctx, aiKmId: null })
    if (orchestrated.finalSuggestedDecision === "RESOLVE") {
      orchestrated = {
        ...orchestrated,
        finalSuggestedDecision: "ESCALATE_N3",
        decisionLabel: "Escalade N3",
        decisionTarget: null,
        decisionReasoning:
          "Aucune procédure KM validée — escalader N3 pour traitement spécialiste.",
        decisionConfidencePct: decisionConfidencePctFromOrchestration(
          ctx,
          "ESCALATE_N3",
          { ...orchestrated.kmReference, available: false },
          null,
        ),
        workflowStep: 9,
        workflowStepLabel: "Sans KM — escalade FO",
        decisionSignals: buildAlignedDecisionSignals({
          decision: "ESCALATE_N3",
          transferTarget: null,
          slaRiskLevel: ctx.slaRiskLevel,
          slaPredictedBreach: ctx.slaPredictedBreach,
          slaConfidence: ctx.slaConfidence,
          predictedPriority: ctx.predictedPriority ?? ctx.priority ?? null,
          priorityConfidence: ctx.priorityConfidence,
        }),
      }
    }
  }

  return {
    decision: orchestrated.finalSuggestedDecision,
    label: orchestrated.decisionLabel,
    target: orchestrated.decisionTarget,
    reasoning: orchestrated.decisionReasoning,
    hasKm: orchestrated.kmReference.available,
    kmId: orchestrated.kmReference.kmId,
    kmTitle: orchestrated.kmReference.kmTitle,
    kmSource: orchestrated.kmReference.source,
    kmType: orchestrated.kmReference.kmType,
  }
}

export { buildOrchestratedTicketDecision, type OrchestratedTicketDecision } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
