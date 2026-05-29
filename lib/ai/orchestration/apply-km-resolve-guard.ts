/**
 * Resolve suggestions require a matched KM procedure.
 * Delegates to unified orchestration.
 */

import { buildOrchestratedTicketDecision } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import type { KmRecommendationPayload, RecommendedActionPayload } from "@/lib/ai/orchestration/types"
import type { OrchestratedTicketContext } from "@/lib/ai/orchestration/orchestrated-ticket-decision"

export function applyKmResolveGuard(
  recommended: RecommendedActionPayload,
  km: KmRecommendationPayload,
  ctx: OrchestratedTicketContext,
): RecommendedActionPayload {
  const primary = km.primary
  const orchestrated = buildOrchestratedTicketDecision({
    ...ctx,
    aiKmId: primary?.kmId ?? ctx.aiKmId ?? null,
    aiKmTitle: primary?.title ?? ctx.aiKmTitle ?? null,
    aiSimilarity: primary ? primary.similarityPct / 100 : ctx.aiSimilarity ?? null,
  })

  return {
    ...recommended,
    available: recommended.available || Boolean(orchestrated.decisionLabel),
    action: recommended.action ?? orchestrated.finalSuggestedDecision,
    actionLabel: orchestrated.decisionLabel,
    reason: orchestrated.decisionReasoning,
    confidencePct: orchestrated.decisionConfidencePct,
  }
}
