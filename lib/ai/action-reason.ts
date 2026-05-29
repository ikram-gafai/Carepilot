import { deriveOperationalDecisionReason } from "@/lib/ai/operational-decision"

export type ActionReasonInput = {
  title: string
  description: string
  perimeter: string | null
  category: string | null
  priority: string
  recommendedAction: string
  escalationRequired?: boolean
  transferRequired?: boolean
}

export function deriveActionReason(input: ActionReasonInput): string {
  return deriveOperationalDecisionReason(input)
}
