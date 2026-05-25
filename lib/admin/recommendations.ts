import { AI_PHASE_DISABLED } from "@/lib/ai-phase"

export type RejectionReasonRow = {
  reason: string
  count: number
}

/** AI recommendation supervision — disabled until training phase. */
export async function adminRecommendations() {
  if (AI_PHASE_DISABLED) {
    return { pendingAiTraining: true as const }
  }

  return { pendingAiTraining: true as const }
}
