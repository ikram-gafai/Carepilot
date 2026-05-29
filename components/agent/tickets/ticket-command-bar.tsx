import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { StatusBadge } from "@/components/agent/ui/status-badge"
import { SlaIndicator } from "@/components/agent/ui/sla-indicator"
import { cpAgentSlaLabel, type CpAgentTicketRow } from "@/lib/queries/cp-agent"

function formatDt(d: Date | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

function ticketAgeLabel(createdAt: Date) {
  const ms = Date.now() - createdAt.getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 48) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

type Sla = ReturnType<typeof cpAgentSlaLabel>

export function TicketCommandBar({
  ticket,
  assigneeName,
  sla,
  predictedPriority,
}: {
  ticket: CpAgentTicketRow
  assigneeName: string | null
  sla: Sla
  predictedPriority?: string | null
}) {
  return (
    <div className="border-b border-border/70 pb-3">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
        <span className="font-mono text-[11px] font-semibold text-foreground">{ticket.careId}</span>
        <span className="text-muted-foreground/50" aria-hidden>
          ·
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={predictedPriority ?? ticket.priority} />
          <SlaIndicator label={sla.label} tone={sla.tone} />
        </div>
        <span className="hidden text-muted-foreground/50 sm:inline" aria-hidden>
          ·
        </span>
        <span className="text-muted-foreground">
          Magasin <span className="font-medium text-foreground">{ticket.storeName ?? ticket.storeCode ?? "—"}</span>
        </span>
        <span className="hidden text-muted-foreground/50 md:inline" aria-hidden>
          ·
        </span>
        <span className="hidden text-muted-foreground md:inline">
          Assigné <span className="font-medium text-foreground">{assigneeName ?? "—"}</span>
        </span>
        <span className="hidden text-muted-foreground/50 lg:inline" aria-hidden>
          ·
        </span>
        <span className="hidden text-muted-foreground lg:inline">
          Ancienneté <span className="font-medium tabular-nums text-foreground">{ticketAgeLabel(ticket.createdAt)}</span>
        </span>
        <span className="ml-auto hidden text-[11px] text-muted-foreground xl:inline">
          Mis à jour <span className="tabular-nums text-foreground">{formatDt(ticket.updatedAt)}</span>
        </span>
      </div>
    </div>
  )
}
