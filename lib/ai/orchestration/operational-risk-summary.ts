import {
  formatN3SignalValue,
  formatRoutingSignalValue,
  formatSlaAttentionValue,
  SIGNAL_LABELS,
} from "@/lib/ai/decision-support-terminology"
import {
  buildNormalizedSignal,
  missingContextScorePct,
  priorityAttentionScorePct,
  slaAttentionScorePct,
  toSignalScorePct,
} from "@/lib/ai/signal-severity"
import { formatPredictedPriority } from "@/lib/ai/priority-display"
import type { AggregatedAiSignals } from "@/lib/ai/orchestration/ai-signal-aggregator"
import type { OperationalRiskPayload, OperationalRiskSignal, SignalSeverity } from "@/lib/ai/orchestration/types"

function maxSeverity(levels: SignalSeverity[]): SignalSeverity {
  if (levels.includes("high")) return "high"
  if (levels.includes("medium")) return "medium"
  if (levels.includes("low")) return "low"
  return "neutral"
}

/** Build prioritized operational risk signals from prediction rows. */
export function buildOperationalRiskSummary(signals: AggregatedAiSignals): OperationalRiskPayload {
  const items: OperationalRiskSignal[] = []

  if (signals.escalation) {
    const required = signals.escalation.predictedEscalationRequired
    items.push(
      buildNormalizedSignal({
        key: "escalation",
        label: SIGNAL_LABELS.escalation,
        value: formatN3SignalValue(required),
        signalScore: toSignalScorePct(signals.escalation.confidenceScore),
      }),
    )
  }

  if (signals.transfer) {
    const required = signals.transfer.predictedTransferRequired
    items.push(
      buildNormalizedSignal({
        key: "transfer",
        label: SIGNAL_LABELS.transfer,
        value: formatRoutingSignalValue(required, signals.transfer.targetPerimeter),
        signalScore: toSignalScorePct(signals.transfer.confidenceScore),
      }),
    )
  }

  if (signals.sla) {
    const breached = signals.sla.predictedSlaBreach
    const level = signals.sla.riskLevel
    items.push(
      buildNormalizedSignal({
        key: "sla",
        label: SIGNAL_LABELS.sla,
        value: formatSlaAttentionValue(breached, level),
        signalScore: slaAttentionScorePct({
          confidenceScore: signals.sla.confidenceScore,
          predictedBreach: breached,
          riskLevel: level,
        }),
      }),
    )
  }

  if (signals.priority) {
    const p = signals.priority.predictedPriority
    items.push(
      buildNormalizedSignal({
        key: "priority",
        label: SIGNAL_LABELS.priority,
        value: formatPredictedPriority(p),
        signalScore: priorityAttentionScorePct({
          confidenceScore: signals.priority.confidenceScore,
          predictedPriority: p,
        }),
      }),
    )
  }

  if (signals.missingInformation) {
    const row = signals.missingInformation
    items.push(
      buildNormalizedSignal({
        key: "missing_context",
        label: "Contexte manquant",
        value: row.qualityLevel === "POOR" ? "Bloquant" : "Partiel",
        signalScore: missingContextScorePct({
          confidenceScore: row.confidenceScore,
          completenessScore: row.completenessScore,
          qualityLevel: row.qualityLevel,
          missingFieldCount: row.missingFields.length,
        }),
      }),
    )
  }

  const available = items.length > 0
  const overallLevel = available ? maxSeverity(items.map((i) => i.severity)) : "neutral"

  let headline = "Signaux opérationnels non encore calculés pour ce ticket."
  if (available) {
    const urgent = items.filter((i) => i.severity === "high").map((i) => i.label)
    if (urgent.length > 0) {
      headline = `Attention opérationnelle : ${urgent.join(", ")}.`
    } else if (items.some((i) => i.severity === "medium")) {
      headline = "Vérifier les signaux SLA et routage avant d'agir."
    } else {
      headline = "Aucun signal élevé — investigation standard."
    }
  }

  return { available, overallLevel, headline, signals: items }
}
