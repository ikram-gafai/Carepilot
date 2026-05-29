import { ticketStatusUiLabel } from "@/lib/care-operational-actions"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"

export function TicketMetadata({ ticket }: { ticket: CpAgentTicketRow }) {
  const statusLabel = ticketStatusUiLabel(ticket.status)
  const items: { label: string; value: string }[] = [
    {
      label: "Magasin",
      value: ticket.storeName
        ? `${ticket.storeName}${ticket.storeCity ? ` · ${ticket.storeCity}` : ""}`
        : (ticket.storeCode ?? "—"),
    },
    { label: "Catégorie", value: cpAgentCategoryLabel(ticket.category) },
    { label: "Statut", value: statusLabel },
    { label: "Priorité", value: ticket.priority },
  ]

  return (
    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/35 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{i.label}</div>
          <div className="mt-0.5 text-zinc-900 dark:text-zinc-100">{i.value}</div>
        </div>
      ))}
    </div>
  )
}
