/** Unified operational intelligence payload consumed by the ticket workflow UI. */

export type SignalSeverity = "low" | "medium" | "high" | "neutral"

export type TicketQualityPayload = {
  available: boolean
  completenessScore: number | null
  completenessPct: number | null
  qualityLevel: string | null
  qualityLabel: string | null
  missingFields: string[]
  warnings: string[]
  vagueDescription: boolean
  missingIdentifiers: boolean
  detectionMethod: string | null
  confidencePct: number | null
}

export type OperationalRiskSignal = {
  key: string
  label: string
  value: string
  confidencePct: number | null
  severity: SignalSeverity
}

export type OperationalRiskPayload = {
  available: boolean
  overallLevel: SignalSeverity
  headline: string
  signals: OperationalRiskSignal[]
}

export type RecommendedActionPayload = {
  available: boolean
  action: string | null
  actionLabel: string | null
  reason: string | null
  confidencePct: number | null
  modelVersion: string | null
  priority: number
}

export type KmRecommendationItem = {
  rank: number
  kmId: string
  title: string
  confidenceLevel: string
  similarityPct: number
  reason: string | null
  whyThisKm: string | null
}

export type KmRecommendationPayload = {
  available: boolean
  primary: KmRecommendationItem | null
  alternatives: KmRecommendationItem[]
  methodName: string | null
}

export type OperationalExplanationPayload = {
  available: boolean
  modelName: string | null
  operationalSummary: string | null
  recommendedActionExplanation: string | null
  reasoning: string | null
  missingInformationNote: string | null
  nextSteps: string | null
  latencyMs: number | null
  updatedAt: string | null
}

export type OperationalIntelligenceMeta = {
  ticketId: number
  careId: string | null
  generatedAt: string
  modulesAvailable: number
  modulesTotal: number
  primarySignal: "action" | "explanation" | "risk" | "quality" | "km" | null
}

export type OperationalIntelligencePayload = {
  meta: OperationalIntelligenceMeta
  orchestrated: OrchestratedDecisionPayload
  ticketQuality: TicketQualityPayload
  operationalRisk: OperationalRiskPayload
  recommendedAction: RecommendedActionPayload
  kmRecommendation: KmRecommendationPayload
  operationalExplanation: OperationalExplanationPayload
}

export type OrchestratedDecisionPayload = {
  finalSuggestedDecision: string
  decisionLabel: string
  decisionTarget: string | null
  decisionReasoning: string
  workflowStep: number
  workflowStepLabel: string
  kmType: "resolution" | "diagnostic" | "routing" | "validation"
  kmId: string | null
  kmTitle: string | null
  missingContextBlocking: boolean
  slaAttention: boolean
}
