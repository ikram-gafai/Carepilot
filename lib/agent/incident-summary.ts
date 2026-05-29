import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import type { OperationalIntelligencePayload } from "@/lib/ai/orchestration/types"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"

function firstSentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""
  const match = trimmed.match(/^[^.!?]+[.!?]?/)
  return (match?.[0] ?? trimmed).trim()
}

function deriveOperationalImpact(intelligence: OperationalIntelligencePayload, priority: string): string {
  const expl = intelligence.operationalExplanation
  if (expl.reasoning?.trim()) return firstSentence(expl.reasoning)
  if (intelligence.operationalRisk.headline?.trim()) return intelligence.operationalRisk.headline

  const sla = intelligence.operationalRisk.signals.find((s) => s.key === "sla")
  if (sla?.severity === "high") return "SLA pressure requires immediate perimeter handling."
  if (priority === "P1" || priority === "P2") return "High-priority incident affecting store operations."
  return "Operational handling required on current perimeter."
}

function deriveBusinessImpact(perimeter: string, category: string, relatedCount: number): string {
  const perimeterLabel = perimeter || cpAgentCategoryLabel(category)
  if (/sco|checkout|caisse|lane|pos/i.test(perimeterLabel + category)) {
    return relatedCount > 2
      ? "Store may continue degraded operation; recurring pattern increases customer wait risk."
      : "Store may continue degraded operation using remaining lanes while incident is handled."
  }
  if (/network|connectivity|réseau/i.test(perimeterLabel + category)) {
    return "Store connectivity degradation may impact checkout and back-office systems."
  }
  if (/payment|monétique|monetique/i.test(perimeterLabel + category)) {
    return "Payment acceptance risk — lane revenue impact until restoration."
  }
  return "Business continuity depends on timely perimeter resolution or controlled escalation."
}

export function buildIncidentSummary(input: {
  title: string
  description: string
  perimeter: string | null
  category: string
  priority: string
  relatedCount: number
  intelligence: OperationalIntelligencePayload
}): {
  summary: string
  operationalImpact: string
  businessImpact: string
} {
  const expl = input.intelligence.operationalExplanation
  const summary =
    expl.operationalSummary?.trim() ||
    firstSentence(input.description) ||
    agentTicketDisplayTitle(input.title)

  return {
    summary,
    operationalImpact: deriveOperationalImpact(input.intelligence, input.priority),
    businessImpact: deriveBusinessImpact(input.perimeter ?? "", input.category, input.relatedCount),
  }
}
