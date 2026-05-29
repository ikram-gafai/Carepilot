import Link from "next/link"

import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { SlaIndicator } from "@/components/agent/ui/sla-indicator"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { QUEUE_SECTIONS } from "@/lib/ai/decision-support-terminology"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import type { AgentQueueRow } from "@/lib/carepilot-api/agent-dashboard-data"

export function NextTicketsQueue({ tickets }: { tickets: AgentQueueRow[] }) {
  return (
    <section className="rounded-md border border-border/60 bg-card">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-foreground">{QUEUE_SECTIONS.next}</h2>
          <p className="text-[10px] text-muted-foreground">{AGENT_SECTION_SUBTITLES.priorityQueue}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" asChild>
          <Link href="/agent/tickets">Voir tout</Link>
        </Button>
      </div>
      <div className="overflow-x-auto border-t border-border/40">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="h-8 w-[108px] text-xs font-medium text-muted-foreground">
                CARE ID
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-muted-foreground">
                Titre
              </TableHead>
              <TableHead className="h-8 w-[72px] text-xs font-medium text-muted-foreground">
                Priorité
              </TableHead>
              <TableHead className="h-8 w-[88px] text-xs font-medium text-muted-foreground">
                SLA
              </TableHead>
              <TableHead className="h-8 w-[120px] text-xs font-medium text-muted-foreground">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                  Aucun ticket ouvert en file.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((t) => (
                <TableRow
                  key={t.ticketId}
                  className="border-border/50 hover:bg-muted/30"
                >
                  <TableCell className="py-2 font-mono text-[11px]">
                    <Link
                      href={`/agent/tickets/${t.ticketId}`}
                      className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      {t.careId}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[min(320px,36vw)] truncate py-2 text-xs text-foreground">
                    {agentTicketDisplayTitle(t.title)}
                  </TableCell>
                  <TableCell className="py-2">
                    <PriorityBadge priority={t.predictedPriority ?? t.priority} />
                  </TableCell>
                  <TableCell className="py-2">
                    <SlaIndicator label={t.slaLabel} tone={t.slaTone} />
                  </TableCell>
                  <TableCell className="py-2 text-[11px] font-medium text-foreground">
                    {t.aiActionLabel ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
