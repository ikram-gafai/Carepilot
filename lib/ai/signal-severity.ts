/**
 * Normalized operational signal severity — derived directly from signal score (0–100).
 *
 * 0–39%   → Low
 * 40–69%  → Medium
 * 70–100% → High
 */

import type { SignalSeverity } from "@/lib/ai/orchestration/types"

export type SignalLevel = "Faible" | "Moyen" | "Élevé"

/** Map 0–100 signal score to severity tier. */
export function signalScoreToSeverity(scorePct: number | null | undefined): SignalSeverity {
  if (scorePct == null || Number.isNaN(scorePct)) return "neutral"
  const n = Math.max(0, Math.min(100, Math.round(scorePct)))
  if (n >= 70) return "high"
  if (n >= 40) return "medium"
  return "low"
}

export function signalLevelLabel(severity: SignalSeverity): SignalLevel | "Neutre" {
  switch (severity) {
    case "high":
      return "Élevé"
    case "medium":
      return "Moyen"
    case "low":
      return "Faible"
    default:
      return "Neutre"
  }
}

/** Convert model confidence (0–1) or percentage (0–100) to 0–100 score. */
export function toSignalScorePct(score: number | null | undefined): number | null {
  if (score == null || Number.isNaN(score)) return null
  if (score <= 1) return Math.round(score * 100)
  return Math.round(Math.max(0, Math.min(100, score)))
}

export function normalizeOperationalSignal(input: {
  confidencePct?: number | null
  confidenceScore?: number | null
}): { signalScore: number | null; severity: SignalSeverity } {
  const signalScore = input.confidencePct ?? toSignalScorePct(input.confidenceScore)
  return { signalScore, severity: signalScoreToSeverity(signalScore) }
}

export function slaAttentionScorePct(input: {
  confidenceScore?: number | null
  predictedBreach?: boolean
  riskLevel?: string | null
}): number | null {
  const fromModel = toSignalScorePct(input.confidenceScore)
  if (fromModel != null) return fromModel
  if (input.predictedBreach) return 92
  const level = (input.riskLevel ?? "").toUpperCase()
  if (level === "HIGH") return 82
  if (level === "MEDIUM") return 55
  return 22
}

export function priorityAttentionScorePct(input: {
  confidenceScore?: number | null
  predictedPriority?: string | null
}): number | null {
  const fromModel = toSignalScorePct(input.confidenceScore)
  if (fromModel != null) return fromModel
  const p = (input.predictedPriority ?? "").toUpperCase()
  if (p === "P1" || p === "CRITICAL") return 88
  if (p === "P2" || p === "HIGH") return 72
  if (p === "P3" || p === "MEDIUM") return 52
  return 28
}

export function missingContextScorePct(input: {
  confidenceScore?: number | null
  completenessScore?: number | null
  qualityLevel?: string | null
  missingFieldCount?: number
}): number | null {
  const fromModel = toSignalScorePct(input.confidenceScore)
  if (fromModel != null) return fromModel
  if (input.completenessScore != null && !Number.isNaN(input.completenessScore)) {
    const gap = input.completenessScore <= 1
      ? (1 - input.completenessScore) * 100
      : 100 - input.completenessScore
    return Math.round(Math.max(0, Math.min(100, gap)))
  }
  const level = (input.qualityLevel ?? "").toUpperCase()
  if (level === "POOR") return 78
  if (level === "INCOMPLETE") return 52
  if ((input.missingFieldCount ?? 0) > 0) return 45
  return 18
}

export function buildNormalizedSignal(input: {
  key: string
  label: string
  value: string
  signalScore: number | null
}): {
  key: string
  label: string
  value: string
  confidencePct: number | null
  severity: SignalSeverity
} {
  return {
    key: input.key,
    label: input.label,
    value: input.value,
    confidencePct: input.signalScore,
    severity: signalScoreToSeverity(input.signalScore),
  }
}
