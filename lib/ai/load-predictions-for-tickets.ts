import { listActionRecommendations } from "@/lib/ai/run-action-recommendations"
import { listEscalationPredictions } from "@/lib/ai/run-escalation-predictions"
import { listKmRecommendations } from "@/lib/ai/run-km-recommendations"
import { listMissingInformationAnalyses } from "@/lib/ai/run-missing-information-analysis"
import { listPriorityPredictions } from "@/lib/ai/run-priority-predictions"
import { listSlaPredictions } from "@/lib/ai/run-sla-predictions"
import { listTransferPredictions } from "@/lib/ai/run-transfer-predictions"
import type { ActionRecommendationRow } from "@/lib/ai/run-action-recommendations"
import type { EscalationPredictionRow } from "@/lib/ai/run-escalation-predictions"
import type { KmRecommendationRow } from "@/lib/ai/run-km-recommendations"
import type { MissingInformationRow } from "@/lib/ai/run-missing-information-analysis"
import type { PriorityPredictionRow } from "@/lib/ai/run-priority-predictions"
import type { SlaPredictionRow } from "@/lib/ai/run-sla-predictions"
import type { TransferPredictionRow } from "@/lib/ai/run-transfer-predictions"

export type AiPredictionBatch = {
  actions: ActionRecommendationRow[]
  sla: SlaPredictionRow[]
  priority: PriorityPredictionRow[]
  escalation: EscalationPredictionRow[]
  transfer: TransferPredictionRow[]
  missing: MissingInformationRow[]
  km: KmRecommendationRow[]
}

const EMPTY_BATCH: AiPredictionBatch = {
  actions: [],
  sla: [],
  priority: [],
  escalation: [],
  transfer: [],
  missing: [],
  km: [],
}

/** Load stored AI predictions scoped to ticket IDs (avoids full-table scans). */
export async function loadAiPredictionsForTickets(ticketIds: number[]): Promise<AiPredictionBatch> {
  if (ticketIds.length === 0) return EMPTY_BATCH

  const [actions, sla, priority, escalation, transfer, missing, km] = await Promise.all([
    listActionRecommendations(ticketIds),
    listSlaPredictions(ticketIds),
    listPriorityPredictions(ticketIds),
    listEscalationPredictions(ticketIds),
    listTransferPredictions(ticketIds),
    listMissingInformationAnalyses(500, ticketIds),
    listKmRecommendations(500, ticketIds),
  ])

  return { actions, sla, priority, escalation, transfer, missing, km }
}

/** First KM recommendation per ticket (rank 1 preferred). */
export function primaryKmByTicketId(kmRows: KmRecommendationRow[]): Map<number, KmRecommendationRow> {
  const map = new Map<number, KmRecommendationRow>()
  for (const row of kmRows) {
    const existing = map.get(row.ticketId)
    if (!existing || row.rank < existing.rank) {
      map.set(row.ticketId, row)
    }
  }
  return map
}
