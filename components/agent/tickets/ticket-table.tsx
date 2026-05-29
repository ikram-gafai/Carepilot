"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { QueueSlaBadge } from "@/components/agent/ui/queue-sla-badge"
import { StatusBadge } from "@/components/agent/ui/status-badge"
import { SuggestedDecisionBadge } from "@/components/agent/ui/suggested-decision-badge"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import type { AgentTicketListItem } from "@/lib/carepilot-api/tickets"

export function TicketTable({ rows }: { rows: AgentTicketListItem[] }) {
  const router = useRouter()

  if (!rows.length) {
    return <EmptyState title="Aucun ticket en file" />
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-muted/40 backdrop-blur">
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="h-9 w-[120px] text-xs font-medium text-muted-foreground">
              CARE ID
            </TableHead>
            <TableHead className="h-9 min-w-[240px] text-xs font-medium text-muted-foreground">
              Titre
            </TableHead>
            <TableHead className="h-9 w-[72px] text-xs font-medium text-muted-foreground">
              Priorité
            </TableHead>
            <TableHead className="h-9 w-[96px] text-xs font-medium text-muted-foreground">
              SLA
            </TableHead>
            <TableHead className="h-9 w-[108px] text-xs font-medium text-muted-foreground">
              Action
            </TableHead>
            <TableHead className="h-9 w-[96px] text-xs font-medium text-muted-foreground">
              Statut
            </TableHead>
            <TableHead className="h-9 w-[104px] text-right text-xs font-medium text-muted-foreground">
              Ouvrir
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow
              key={t.id}
              className="cursor-pointer border-border/60 transition-colors hover:bg-primary/[0.04] dark:hover:bg-primary/[0.06]"
              onClick={() => router.push(`/agent/tickets/${t.id}`)}
            >
              <TableCell className="py-2 font-mono text-xs text-foreground">{t.careId}</TableCell>
              <TableCell className="max-w-[min(420px,40vw)] py-2">
                <span className="line-clamp-1 text-sm font-medium text-foreground">
                  {agentTicketDisplayTitle(t.title)}
                </span>
              </TableCell>
              <TableCell className="py-2">
                <PriorityBadge priority={t.predictedPriority ?? t.priority} />
              </TableCell>
              <TableCell className="py-2">
                <QueueSlaBadge slaLabel={t.slaLabel} />
              </TableCell>
              <TableCell className="py-2">
                <SuggestedDecisionBadge label={t.suggestedActionLabel} />
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge status={t.status} />
              </TableCell>
              <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" asChild>
                  <Link href={`/agent/tickets/${t.id}`}>Investiguer</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
