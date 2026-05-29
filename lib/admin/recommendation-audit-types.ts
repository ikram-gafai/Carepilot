import type { OperationalDecision } from "@/lib/ai/operational-decision"

export type AdminAlignmentStatus = "aligned" | "overridden" | "pending"

export type AdminValidationSummary = {
  generated: number
  validated: number
  modified: number
  pending: number
}

export type AdminRecommendationAnalysis = {
  recommendation: string
  reason: string
  confidencePct: number | null
  signals: string[]
  agentFeedback: string
  comment: string | null
}

export type AdminRecommendationHistoryRow = {
  ticketId: number
  careId: string
  incident: string
  aiDecision: string
  aiKmCode: string | null
  orchestratedDecision: OperationalDecision
  confidencePct: number | null
  signalSummary: string
  agentActionLabel: string | null
  validationLabel: string
  alignmentStatus: AdminAlignmentStatus
  analysis: AdminRecommendationAnalysis
}

export type AdminRecommendationsData = {
  validationSummary: AdminValidationSummary
  rows: AdminRecommendationHistoryRow[]
}

export type AdminRecommendationDecisionFilter =
  | "all"
  | "resolve"
  | "escalate_n3"
  | "transfer"
  | "suspend"

export function recommendationValidationLabel(status: AdminAlignmentStatus): string {
  switch (status) {
    case "aligned":
      return "Confirmée"
    case "overridden":
      return "Modifiée"
    default:
      return "En attente"
  }
}

/** @deprecated Use recommendationValidationLabel */
export function recommendationResultLabel(status: AdminAlignmentStatus): string {
  return recommendationValidationLabel(status)
}

export function matchesRecommendationDecisionFilter(
  decision: OperationalDecision,
  filter: AdminRecommendationDecisionFilter,
): boolean {
  if (filter === "all") return true
  switch (filter) {
    case "resolve":
      return decision === "RESOLVE"
    case "escalate_n3":
      return decision === "ESCALATE_N3"
    case "transfer":
      return decision === "TRANSFER"
    case "suspend":
      return decision === "SUSPEND" || decision === "REQUEST_INFORMATION"
    default:
      return true
  }
}
