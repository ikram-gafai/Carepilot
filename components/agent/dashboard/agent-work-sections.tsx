import Link from "next/link"

import { SectionHeader } from "@/components/agent/ui/section-header"
import { SlaIndicator } from "@/components/agent/ui/sla-indicator"
import { Card, CardContent } from "@/components/ui/card"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import type { AgentWorkSectionRow } from "@/lib/carepilot-api/agent-dashboard-data"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"

function WorkSection({
  title,
  subtitle,
  tickets,
  emptyMessage,
}: {
  title: string
  subtitle: string
  tickets: AgentWorkSectionRow[]
  emptyMessage: string
}) {
  return (
    <Card className="border-border/90 shadow-sm">
      <CardContent className="p-0">
        <div className="border-b border-border/80 px-4 py-2.5">
          <SectionHeader title={title} subtitle={subtitle} />
        </div>
        {tickets.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted-foreground">{emptyMessage}</p>
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
                    {t.actionConfidencePct != null ? (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {t.actionConfidencePct}%
                      </span>
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

export function AgentWorkSections({
  priorityWork,
  kmOpportunities,
  incompleteTickets,
  escalationTransfer,
}: {
  priorityWork: AgentWorkSectionRow[]
  kmOpportunities: AgentWorkSectionRow[]
  incompleteTickets: AgentWorkSectionRow[]
  escalationTransfer: AgentWorkSectionRow[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <WorkSection
        title="File prioritaire"
        subtitle={AGENT_SECTION_SUBTITLES.priorityWork}
        tickets={priorityWork}
        emptyMessage="Aucun ticket haute priorité pour le moment."
      />
      <WorkSection
        title="Candidats N3"
        subtitle={AGENT_SECTION_SUBTITLES.escalationCandidates}
        tickets={escalationTransfer}
        emptyMessage="Aucun candidat N3 ou transfert."
      />
      <WorkSection
        title="Opportunités KM"
        subtitle={AGENT_SECTION_SUBTITLES.kmOpportunities}
        tickets={kmOpportunities}
        emptyMessage="Aucune opportunité KM en file."
      />
      <WorkSection
        title="Contexte manquant"
        subtitle={AGENT_SECTION_SUBTITLES.incompleteContext}
        tickets={incompleteTickets}
        emptyMessage="Tous les tickets ouverts respectent les seuils de complétude."
      />
    </div>
  )
}
