"use client"

import type { SupervisionSignalTone } from "@/components/admin/dashboard/admin-supervision-signal-card"
import { DecisionFeedbackSummaryBody } from "@/components/decision-feedback/decision-feedback-summary-body"
import { adminSurfaces } from "@/lib/admin-surface"
import type { AgentDecisionFeedbackSummary } from "@/lib/carepilot-api/agent-decision-feedback"
import { cn } from "@/lib/utils"

const TONE_DOT: Record<SupervisionSignalTone, string> = {
  critical: "bg-destructive shadow-[0_0_0_2px] shadow-destructive/20",
  primary: "bg-primary shadow-[0_0_0_2px] shadow-primary/25",
  success: "bg-emerald-500 shadow-[0_0_0_2px] shadow-emerald-500/20",
  neutral: "bg-zinc-300",
}

export function AdminDecisionFeedbackPanel({
  summary,
  tone = "primary",
}: {
  summary: AgentDecisionFeedbackSummary
  tone?: SupervisionSignalTone
}) {
  return (
    <article
      className={cn(
        adminSurfaces.card,
        "flex flex-col overflow-hidden border-primary/15 bg-gradient-to-b from-primary/[0.04] to-card",
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b border-primary/10 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Suivi des décisions</h3>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">Actions agent et retours IA</p>
        </div>
        <span className={cn("mt-1 size-2 shrink-0 rounded-full", TONE_DOT[tone])} aria-hidden />
      </header>
      <div className="px-4 py-3">
        <DecisionFeedbackSummaryBody summary={summary} />
      </div>
    </article>
  )
}
