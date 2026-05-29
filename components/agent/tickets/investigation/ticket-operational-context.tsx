import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"

import { InvestigationSection } from "./investigation-section"

function ContextCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-foreground">{value}</p>
    </div>
  )
}

export function TicketOperationalContext({
  ticket,
  relatedCount,
}: {
  ticket: CpAgentTicketRow
  relatedCount: number
}) {
  const equipment = ticket.subCategory ?? cpAgentCategoryLabel(ticket.category)
  const firstSeen = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ticket.externalCreatedAt ?? ticket.createdAt)
  const pattern = relatedCount >= 3 ? "Récurrent" : relatedCount >= 1 ? "Historique lié" : "Isolé"

  return (
    <InvestigationSection title="Contexte opérationnel">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <ContextCell label="Magasin" value={ticket.storeName ?? ticket.storeCode ?? "—"} />
        <ContextCell label="Équipement" value={equipment} />
        <ContextCell label="Catégorie" value={cpAgentCategoryLabel(ticket.category)} />
        <ContextCell label="Type incident" value={ticket.subCategory ?? cpAgentCategoryLabel(ticket.category)} />
        <ContextCell label="Périmètre" value={ticket.perimeter ?? cpAgentCategoryLabel(ticket.category)} />
        <ContextCell label="Première occurrence" value={firstSeen} />
        <ContextCell label="Incidents similaires" value={String(relatedCount)} />
        <ContextCell label="Schéma" value={pattern} />
      </div>
    </InvestigationSection>
  )
}
