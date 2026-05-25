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
}: {
  ticket: CpAgentTicketRow
  assigneeName: string | null
  sla: Sla
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm ring-1 ring-border/40">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="font-mono text-[11px] font-semibold text-foreground">{ticket.careId}</span>
        <span className="hidden h-3 w-px bg-border sm:inline" aria-hidden />
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <SlaIndicator label={sla.label} tone={sla.tone} />
        </div>
        <span className="hidden h-3 w-px bg-border lg:inline" aria-hidden />
        <span className="text-muted-foreground">
          Store{" "}
          <span className="font-medium text-foreground">
            {ticket.storeName ?? ticket.storeCode ?? "—"}
          </span>
        </span>
        <span className="hidden h-3 w-px bg-border lg:inline" aria-hidden />
        <span className="text-muted-foreground">
          Assigned{" "}
          <span className="font-medium text-foreground">{assigneeName ?? "—"}</span>
        </span>
        <span className="hidden h-3 w-px bg-border xl:inline" aria-hidden />
        <span className="text-muted-foreground">
          Age <span className="tabular-nums font-medium text-foreground">{ticketAgeLabel(ticket.createdAt)}</span>
        </span>
        <span className="hidden h-3 w-px bg-border xl:inline" aria-hidden />
        <span className="text-muted-foreground">
          Updated{" "}
          <span className="tabular-nums font-medium text-foreground">{formatDt(ticket.updatedAt)}</span>
        </span>
        {ticket.lastSyncedAt ? (
          <>
            <span className="hidden h-3 w-px bg-border xl:inline" aria-hidden />
            <span className="text-muted-foreground">
              Synced{" "}
              <span className="tabular-nums font-medium text-foreground">{formatDt(ticket.lastSyncedAt)}</span>
            </span>
          </>
        ) : null}
        {ticket.ttrTargetHours != null ? (
          <>
            <span className="hidden h-3 w-px bg-border xl:inline" aria-hidden />
            <span className="text-muted-foreground">
              TTR target{" "}
              <span className="tabular-nums font-medium text-foreground">{ticket.ttrTargetHours}h</span>
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
