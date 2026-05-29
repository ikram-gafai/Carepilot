import {
  buildEscalationFeatures,
  type CpAgentTicketForPrediction,
  type EscalationPredictionResult,
} from "@/lib/ai/escalation-prediction"

function isHighPriority(priority: string | null | undefined): boolean {
  const p = (priority ?? "").toUpperCase()
  return p === "P1" || p === "P2" || p === "CRITICAL" || p === "HIGH"
}

/**
 * Post-model calibration for synchronized CARE tickets.
 * Preserves XGBoost decision; adds N3 status and P1+SLA-breach operational signals only.
 */
export function calibrateEscalationPrediction(
  ticket: CpAgentTicketForPrediction,
  raw: EscalationPredictionResult,
): EscalationPredictionResult {
  const features = buildEscalationFeatures(ticket)
  const priority = (ticket.priority ?? "").toUpperCase()
  const highPri = isHighPriority(ticket.priority)
  const prob = raw.probabilityScore

  const required =
    raw.predictedEscalationRequired ||
    (priority === "P1" && features.sla_breached === 1)

  const confidence = required
    ? Math.max(raw.confidenceScore, prob, highPri ? 0.72 : 0.65)
    : raw.confidenceScore

  return {
    ...raw,
    predictedEscalationRequired: required,
    confidenceScore: Math.min(0.99, Number(confidence.toFixed(6))),
    predictionLabel: required ? "Escalate to N3" : "No N3 escalation required",
    modelVersion: `${raw.modelVersion}+cal_v1`,
  }
}

export function escalationSeverity(
  required: boolean,
  confidenceScore: number,
  priority: string | null | undefined,
): "high" | "medium" | "low" | "none" {
  if (!required) return "none"
  if (isHighPriority(priority) || confidenceScore >= 0.8) return "high"
  if (confidenceScore >= 0.55) return "medium"
  return "low"
}
