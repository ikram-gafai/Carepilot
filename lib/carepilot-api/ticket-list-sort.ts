import type { SlaExposureBucket } from "@/lib/care-operational/sla-exposure"
import type { AgentTicketListItem } from "@/lib/carepilot-api/tickets"

function priorityRank(p: string | null | undefined): number {
  switch (p?.toUpperCase()) {
    case "P1":
    case "CRITICAL":
      return 40
    case "P2":
    case "HIGH":
      return 30
    case "P3":
    case "MEDIUM":
      return 15
    default:
      return 5
  }
}

function slaPressureRank(label: string): number {
  if (label === "Breached") return 3
  if (label === "At risk") return 2
  return 1
}

function signalSortScore(signals: AgentTicketListItem["signals"]): number {
  let score = 0
  if (signals.includes("n3")) score += 30
  if (signals.includes("routing")) score += 20
  if (signals.includes("sla")) score += 15
  if (signals.includes("missing_context")) score += 10
  return score
}

/** Next-handle order: P1/P2 → SLA pressure → signals → updated date. */
export function compareAgentTicketListItems(a: AgentTicketListItem, b: AgentTicketListItem): number {
  const prA = priorityRank(a.predictedPriority ?? a.priority)
  const prB = priorityRank(b.predictedPriority ?? b.priority)
  if (prB !== prA) return prB - prA

  const slaA = slaPressureRank(a.slaLabel)
  const slaB = slaPressureRank(b.slaLabel)
  if (slaB !== slaA) return slaB - slaA

  const sigA = signalSortScore(a.signals)
  const sigB = signalSortScore(b.signals)
  if (sigB !== sigA) return sigB - sigA

  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

export function slaBucketMatchesFilter(
  bucket: SlaExposureBucket,
  filter: "breached" | "at_risk" | "ok",
): boolean {
  if (filter === "breached") return bucket === "breached"
  if (filter === "at_risk") return bucket === "at_risk"
  return bucket === "on_track"
}
