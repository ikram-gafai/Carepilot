/** Libellés d'affichage file tickets agent (vue liste). */

import { baseDecisionFromLabel } from "@/lib/ai/orchestration/orchestrated-ticket-decision"

export type QueueSlaDisplay = {
  label: "Conforme" | "Attention" | "Critique" | "—"
  tone: "critical" | "warning" | "success" | "neutral"
}

export function formatQueueSlaLabel(internalLabel: string): QueueSlaDisplay {
  if (internalLabel === "Breached") return { label: "Critique", tone: "critical" }
  if (internalLabel === "At risk") return { label: "Attention", tone: "warning" }
  if (internalLabel === "On track") return { label: "Conforme", tone: "success" }
  return { label: "—", tone: "neutral" }
}

export type TicketQueueQuickFilter =
  | "all"
  | "p1"
  | "attention"
  | "escalation"
  | "transfer"
  | "missing_context"

export const TICKET_QUEUE_QUICK_FILTERS: {
  id: TicketQueueQuickFilter
  label: string
}[] = [
  { id: "all", label: "Tous" },
  { id: "p1", label: "P1" },
  { id: "attention", label: "Attention" },
  { id: "escalation", label: "Escalade" },
  { id: "transfer", label: "Transfert" },
  { id: "missing_context", label: "Contexte manquant" },
]

export function matchesTicketQueueQuickFilter(
  item: {
    priority: string
    predictedPriority: string | null
    slaLabel: string
    suggestedActionLabel: string
    signals: string[]
  },
  quick: TicketQueueQuickFilter,
): boolean {
  const decisionBase = baseDecisionFromLabel(item.suggestedActionLabel)
  switch (quick) {
    case "all":
      return true
    case "p1":
      return (item.predictedPriority ?? item.priority) === "P1"
    case "attention":
      return (
        item.slaLabel === "At risk" ||
        item.slaLabel === "Breached" ||
        item.signals.includes("sla")
      )
    case "escalation":
      return decisionBase === "ESCALATE_N3" || item.signals.includes("n3")
    case "transfer":
      return decisionBase === "TRANSFER" || item.signals.includes("routing")
    case "missing_context":
      return item.signals.includes("missing_context")
    default:
      return true
  }
}
