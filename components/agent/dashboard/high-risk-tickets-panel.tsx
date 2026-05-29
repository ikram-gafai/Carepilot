import Link from "next/link"

import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { SectionHeader } from "@/components/agent/ui/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { QUEUE_SECTIONS } from "@/lib/ai/decision-support-terminology"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import type { AgentHighAttentionRow } from "@/lib/carepilot-api/agent-dashboard-data"

export function HighAttentionTicketsPanel({ tickets }: { tickets: AgentHighAttentionRow[] }) {
  return (
    <Card className="border-border/90 shadow-sm">
      <CardContent className="p-0">
        <div className="border-b border-border/80 px-4 py-2.5">
          <SectionHeader
            title={QUEUE_SECTIONS.highAttention}
            subtitle={AGENT_SECTION_SUBTITLES.highAttention}
          />
        </div>
        {tickets.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted-foreground">Aucun ticket haute attention dans la file actuelle.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {tickets.map((t) => (
              <li key={t.ticketId} className="px-4 py-2.5 transition-colors hover:bg-primary/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/agent/tickets/${t.ticketId}`}
                        className="font-mono text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {t.careId}
                      </Link>
                      <PriorityBadge priority={t.predictedPriority ?? t.priority} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{agentTicketDisplayTitle(t.title)}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {t.actionReason ?? t.recommendedNextStep}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {t.aiActionLabel ? (
                      <p className="text-[10px] font-medium">{t.aiActionLabel}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/** @deprecated Use HighAttentionTicketsPanel */
export const HighRiskTicketsPanel = HighAttentionTicketsPanel
