"use client"

import { DecisionFeedbackSummaryBody } from "@/components/decision-feedback/decision-feedback-summary-body"
import { ChartCard } from "@/components/agent/ui/chart-card"
import { QUEUE_SECTIONS } from "@/lib/ai/decision-support-terminology"
import type { AgentDecisionFeedbackSummary } from "@/lib/carepilot-api/agent-decision-feedback"

export function DecisionFeedbackPanel({
  summary,
}: {
  summary: AgentDecisionFeedbackSummary
}) {
  return (
    <ChartCard title={QUEUE_SECTIONS.decisionFeedback} description={QUEUE_SECTIONS.decisionFeedbackHint}>
      <DecisionFeedbackSummaryBody summary={summary} />
    </ChartCard>
  )
}

/** @deprecated Use DecisionFeedbackPanel */
export const DecisionAlignmentPanel = DecisionFeedbackPanel

/** @deprecated Use DecisionFeedbackPanel */
export const AiDecisionFeedbackPanel = DecisionFeedbackPanel
