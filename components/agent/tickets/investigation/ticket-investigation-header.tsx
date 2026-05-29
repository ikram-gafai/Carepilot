import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { QueueSlaBadge } from "@/components/agent/ui/queue-sla-badge"
import { StatusBadge } from "@/components/agent/ui/status-badge"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className="text-muted-foreground/60">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  )
}

export function TicketInvestigationHeader({
  ticket,
  assigneeName,
  slaLabel,
  predictedPriority,
}: {
  ticket: CpAgentTicketRow
  assigneeName: string | null
  slaLabel: string
  predictedPriority?: string | null
}) {
  const store = ticket.storeName ?? ticket.storeCode ?? "—"
  const perimeter = ticket.perimeter ?? cpAgentCategoryLabel(ticket.category)
  const ttr = ticket.ttrTargetHours != null ? `${ticket.ttrTargetHours}h` : "—"
  const lastUpdate = formatWhen(ticket.updatedAt ?? ticket.createdAt)

  return (
    <header className="space-y-2 pb-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11px] font-semibold text-foreground">{ticket.careId}</span>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={predictedPriority ?? ticket.priority} />
        <QueueSlaBadge slaLabel={slaLabel} />
      </div>
      <h1 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
        {agentTicketDisplayTitle(ticket.title)}
      </h1>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <MetaPill label="Magasin" value={store} />
        <MetaPill label="Périmètre" value={perimeter} />
        <MetaPill label="Assigné" value={assigneeName ?? "Non assigné"} />
        <MetaPill label="TTR" value={ttr} />
        <MetaPill label="Mis à jour" value={lastUpdate} />
      </div>
    </header>
  )
}
