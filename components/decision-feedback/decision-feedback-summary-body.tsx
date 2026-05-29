"use client"

import {
  buildDecisionFeedbackRows,
  decisionFeedbackChartSegments,
  hasRecordedAgentDecisions,
  type AgentDecisionFeedbackSummary,
} from "@/lib/carepilot-api/agent-decision-feedback"

function SegmentedFeedbackBar({
  segments,
}: {
  segments: ReturnType<typeof decisionFeedbackChartSegments>
}) {
  const total = segments.reduce((sum, seg) => sum + seg.count, 0)
  if (total <= 0) return null

  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-sm bg-muted/40"
      role="img"
      aria-label={segments.map((s) => `${s.label} ${s.count}`).join(", ")}
    >
      {segments.map((seg, index) => {
        const widthPct = (seg.count / total) * 100
        if (widthPct <= 0) return null
        return (
          <div
            key={seg.key}
            title={`${seg.label}: ${seg.count}`}
            className="h-full transition-opacity hover:opacity-90"
            style={{
              width: `${widthPct}%`,
              backgroundColor: seg.color,
              borderRadius:
                index === 0
                  ? "2px 0 0 2px"
                  : index === segments.length - 1
                    ? "0 2px 2px 0"
                    : "0",
            }}
          />
        )
      })}
    </div>
  )
}

export function DecisionFeedbackSummaryBody({
  summary,
}: {
  summary: AgentDecisionFeedbackSummary
}) {
  const rows = buildDecisionFeedbackRows(summary)
  const hasActivity = hasRecordedAgentDecisions(summary)
  const chartSegments = decisionFeedbackChartSegments(summary)

  if (!hasActivity) {
    return <p className="text-xs text-muted-foreground">Aucune action ou retour enregistré.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedFeedbackBar segments={chartSegments} />
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3 text-xs">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-semibold tabular-nums text-foreground">{row.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
