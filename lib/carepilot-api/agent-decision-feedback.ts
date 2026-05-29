/** Client-safe types and helpers for agent decision feedback (no DB imports). */

export type AgentDecisionFeedbackSummary = {
  /** Distinct tickets with an agent operational action recorded. */
  actionsCompleted: number
  /** Agent action matches the orchestrated AI suggestion. */
  followedAi: number
  /** Agent chose a different valid operational action than suggested. */
  adjustedDecisions: number
  /** Total AI feedback submissions (Actions page). */
  aiFeedbackSubmitted: number
  aiFeedbackHelpful: number
  aiFeedbackNotHelpful: number
}

/** @deprecated Use AgentDecisionFeedbackSummary */
export type AgentDecisionAlignmentSummary = AgentDecisionFeedbackSummary

export type AgentDecisionFeedbackRow = {
  key: "actionsCompleted" | "followedAi" | "adjustedDecisions" | "aiFeedbackSubmitted"
  label: string
  count: number
}

/** @deprecated Use AgentDecisionFeedbackRow */
export type AgentDecisionAlignmentRow = AgentDecisionFeedbackRow

export function buildDecisionFeedbackRows(
  summary: AgentDecisionFeedbackSummary,
): AgentDecisionFeedbackRow[] {
  return [
    { key: "actionsCompleted", label: "Actions réalisées", count: summary.actionsCompleted },
    { key: "followedAi", label: "Suggestions suivies", count: summary.followedAi },
    { key: "adjustedDecisions", label: "Décisions ajustées", count: summary.adjustedDecisions },
    { key: "aiFeedbackSubmitted", label: "Retours IA", count: summary.aiFeedbackSubmitted },
  ]
}

/** @deprecated Use buildDecisionFeedbackRows */
export function buildDecisionAlignmentRows(
  summary: AgentDecisionFeedbackSummary,
): AgentDecisionFeedbackRow[] {
  return buildDecisionFeedbackRows(summary)
}

/** @deprecated Use buildDecisionFeedbackRows */
export function buildAgentDecisionFeedbackRows(
  summary: AgentDecisionFeedbackSummary,
): AgentDecisionFeedbackRow[] {
  return buildDecisionFeedbackRows(summary)
}

export function hasRecordedAgentDecisions(summary: AgentDecisionFeedbackSummary): boolean {
  return summary.actionsCompleted > 0 || summary.aiFeedbackSubmitted > 0
}

export function decisionFeedbackChartSegments(summary: AgentDecisionFeedbackSummary): {
  key: string
  label: string
  count: number
  color: string
}[] {
  return [
    {
      key: "followedAi",
      label: "Suggestion suivie",
      count: summary.followedAi,
      color: "hsl(210 21% 53%)",
    },
    {
      key: "adjustedDecisions",
      label: "Décision ajustée",
      count: summary.adjustedDecisions,
      color: "hsl(210 22% 40%)",
    },
    {
      key: "aiFeedbackSubmitted",
      label: "Retour IA",
      count: summary.aiFeedbackSubmitted,
      color: "hsl(210 14% 68%)",
    },
  ].filter((s) => s.count > 0)
}

/** @deprecated Use decisionFeedbackChartSegments */
export function decisionAlignmentSegments(summary: AgentDecisionFeedbackSummary): {
  key: string
  label: string
  count: number
  color: string
}[] {
  return decisionFeedbackChartSegments(summary)
}
