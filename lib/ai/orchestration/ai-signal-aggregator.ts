import { getActionRecommendationForTicket } from "@/lib/ai/run-action-recommendations"
import { getEscalationPredictionForTicket } from "@/lib/ai/run-escalation-predictions"
import { getKmRecommendationsForTicket } from "@/lib/ai/run-km-recommendations"
import { getOperationalExplanationForTicket } from "@/lib/ai/run-llm-explanations"
import { getMissingInformationForTicket } from "@/lib/ai/run-missing-information-analysis"
import { getPriorityPredictionForTicket } from "@/lib/ai/run-priority-predictions"
import { getSlaPredictionForTicket } from "@/lib/ai/run-sla-predictions"
import { getTransferPredictionForTicket } from "@/lib/ai/run-transfer-predictions"
import type { ActionRecommendationRow } from "@/lib/ai/run-action-recommendations"
import type { EscalationPredictionRow } from "@/lib/ai/run-escalation-predictions"
import type { KmRecommendationRow } from "@/lib/ai/run-km-recommendations"
import type { OperationalExplanationRow } from "@/lib/ai/run-llm-explanations"
import type { MissingInformationRow } from "@/lib/ai/run-missing-information-analysis"
import type { PriorityPredictionRow } from "@/lib/ai/run-priority-predictions"
import type { SlaPredictionRow } from "@/lib/ai/run-sla-predictions"
import type { TransferPredictionRow } from "@/lib/ai/run-transfer-predictions"

export type AggregatedAiSignals = {
  missingInformation: MissingInformationRow | null
  escalation: EscalationPredictionRow | null
  transfer: TransferPredictionRow | null
  sla: SlaPredictionRow | null
  priority: PriorityPredictionRow | null
  action: ActionRecommendationRow | null
  km: KmRecommendationRow[]
  explanation: OperationalExplanationRow | null
}

/** Load all Task 1–9 AI outputs for a ticket in parallel. */
export async function aggregateAiSignals(ticketId: number): Promise<AggregatedAiSignals> {
  const [
    missingInformation,
    escalation,
    transfer,
    sla,
    priority,
    action,
    km,
    explanation,
  ] = await Promise.all([
    getMissingInformationForTicket(ticketId),
    getEscalationPredictionForTicket(ticketId),
    getTransferPredictionForTicket(ticketId),
    getSlaPredictionForTicket(ticketId),
    getPriorityPredictionForTicket(ticketId),
    getActionRecommendationForTicket(ticketId),
    getKmRecommendationsForTicket(ticketId),
    getOperationalExplanationForTicket(ticketId),
  ])

  return {
    missingInformation,
    escalation,
    transfer,
    sla,
    priority,
    action,
    km,
    explanation,
  }
}
