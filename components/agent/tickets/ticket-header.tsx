import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { StatusBadge } from "@/components/agent/ui/status-badge"
import { SlaIndicator } from "@/components/agent/ui/sla-indicator"
import { cpAgentSlaLabel } from "@/lib/queries/cp-agent"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"

function formatDt(d: Date | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

export function TicketHeader({
  ticket,
  assigneeName,
}: {
  ticket: CpAgentTicketRow
  assigneeName: string | null
}) {
  const sla = cpAgentSlaLabel(ticket.slaDueAt, ticket.status, {
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    externalCreatedAt: ticket.externalCreatedAt,
    ttrTargetHours: ticket.ttrTargetHours,
  })
  return (
    <div className="space-y-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{ticket.careId}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <SlaIndicator label={sla.label} tone={sla.tone} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{agentTicketDisplayTitle(ticket.title)}</h1>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span>
          <span className="text-zinc-400">Assigné · </span>
          {assigneeName ?? "—"}
        </span>
        <span>
          <span className="text-zinc-400">Créé · </span>
          {formatDt(ticket.createdAt)}
        </span>
        <span>
          <span className="text-zinc-400">Mis à jour · </span>
          {formatDt(ticket.updatedAt)}
        </span>
        {ticket.ttrTargetHours != null ? (
          <span>
            <span className="text-zinc-400">Objectif TTR · </span>
            {ticket.ttrTargetHours}h
          </span>
        ) : null}
      </div>
    </div>
  )
}
