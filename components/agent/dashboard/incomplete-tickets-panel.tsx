import Link from "next/link"

import { SectionHeader } from "@/components/agent/ui/section-header"
import { SlaIndicator } from "@/components/agent/ui/sla-indicator"
import { Card, CardContent } from "@/components/ui/card"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import type { AgentWorkSectionRow } from "@/lib/carepilot-api/agent-dashboard-data"

export function IncompleteTicketsPanel({ tickets }: { tickets: AgentWorkSectionRow[] }) {
  return (
    <Card className="border-border/90 shadow-sm">
      <CardContent className="p-0">
        <div className="border-b border-border/80 px-4 py-2.5">
          <SectionHeader
            title="Tickets incomplets"
            subtitle={AGENT_SECTION_SUBTITLES.incompleteTickets}
          />
        </div>
        {tickets.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted-foreground">Tous les tickets ouverts respectent les seuils de complétude.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {tickets.map((t) => (
              <li key={t.ticketId} className="px-4 py-2.5 transition-colors hover:bg-primary/[0.03]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/agent/tickets/${t.ticketId}`}
                      className="font-mono text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {t.careId}
                    </Link>
                    <p className="mt-0.5 truncate text-sm font-medium">{agentTicketDisplayTitle(t.title)}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.storeName ?? "—"} · {t.perimeterLabel}
                    </p>
                    {t.actionReason ? (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {t.actionReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {t.aiActionLabel ? (
                      <span className="text-[10px] font-medium text-foreground">{t.aiActionLabel}</span>
                    ) : null}
                    <SlaIndicator label={t.slaLabel} tone={t.slaTone} />
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
