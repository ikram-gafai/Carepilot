import { AI_PHASE_DISABLED } from "@/lib/ai-phase"

export type EscalationTrendPoint = { label: string; value: number }

/** Escalation governance — disabled until AI training phase. */
export async function adminEscalations() {
  if (AI_PHASE_DISABLED) {
    return { pendingAiTraining: true as const }
  }
  return { pendingAiTraining: true as const }
}
