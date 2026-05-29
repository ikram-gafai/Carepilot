import {
  ESCALATION_MODEL_DISPLAY,
  ESCALATION_MODEL_VERSION,
} from "@/lib/ai-phase"

export function formatEscalationModelLabel(modelVersion: string): string {
  if (modelVersion === ESCALATION_MODEL_VERSION) return ESCALATION_MODEL_DISPLAY
  return modelVersion
}

export function formatConfidencePct(score: number): string {
  return `${Math.round(score * 100)}%`
}
