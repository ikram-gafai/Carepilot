/**
 * Final suggested decision — delegates to FO workflow orchestration.
 */

import {
  formatOperationalDecision,
  type OperationalDecision,
} from "@/lib/ai/operational-decision"
import {
  resolveFoWorkflowDecision,
} from "@/lib/ai/orchestration/fo-workflow-decision"
import { plannedOperationalOutcomeForCareId } from "@/lib/care-operational/catalog-operational-outcome"
import { isWaitingWorkflowStatus } from "@/lib/ai/orchestration/missing-context-gate"

export type FinalSuggestedDecisionInput = {
  careId?: string | null
  ticketStatus: string
  category: string | null
  perimeter: string | null
  priority?: string | null
  hasKm: boolean
  hasResolvableKm?: boolean
  hasBlockingMissingContext?: boolean
  qualityLevel?: string | null
  completenessScore?: number | null
  missingFields?: string[]
  transferSignal?: boolean
  transferConfidence?: number | null
  transferTarget?: string | null
  escalationSignal?: boolean
  escalationConfidence?: number | null
}

function runWorkflow(input: FinalSuggestedDecisionInput) {
  const catalogPlan = plannedOperationalOutcomeForCareId(input.careId)
  return resolveFoWorkflowDecision({
    ticketStatus: input.ticketStatus,
    category: input.category,
    perimeter: input.perimeter,
    qualityLevel: input.qualityLevel,
    completenessScore: input.completenessScore,
    missingFields: input.missingFields,
    hasKm: input.hasKm,
    hasResolvableKm: input.hasResolvableKm ?? false,
    catalogPlan,
  })
}

export function resolveFinalSuggestedDecision(input: FinalSuggestedDecisionInput): OperationalDecision {
  return runWorkflow(input).decision
}

export function resolveFoWorkflowStep(input: FinalSuggestedDecisionInput) {
  return runWorkflow(input)
}

export function formatFinalSuggestedDecision(input: FinalSuggestedDecisionInput): string {
  return formatOperationalDecision(resolveFinalSuggestedDecision(input))
}

export function buildFinalDecisionInput(input: {
  careId?: string | null
  ticketStatus: string
  category: string | null
  perimeter: string | null
  priority?: string | null
  hasKm: boolean
  hasResolvableKm?: boolean
  qualityLevel?: string | null
  completenessScore?: number | null
  missingFields?: string[]
  transferSignal?: boolean
  transferConfidence?: number | null
  transferTarget?: string | null
  escalationSignal?: boolean
  escalationConfidence?: number | null
}): FinalSuggestedDecisionInput {
  return {
    ...input,
    hasBlockingMissingContext: isWaitingWorkflowStatus(input.ticketStatus),
  }
}
