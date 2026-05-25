import { AI_PHASE_DISABLED } from "@/lib/ai-phase"

/** AI feedback supervision — disabled until training phase. */
export async function adminFeedbackSupervision() {
  if (AI_PHASE_DISABLED) {
    return { pendingAiTraining: true as const }
  }
  return { pendingAiTraining: true as const }
}
