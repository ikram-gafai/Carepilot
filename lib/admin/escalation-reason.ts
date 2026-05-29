import type { AgentQueueRow } from "@/lib/carepilot-api/agent-dashboard-data"
import { resolvePerimeterCategory, perimeterLabel } from "@/lib/admin/operational-perimeters"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"

/** Transfer routing perimeters — not FO N3 escalation supervision. */
const TRANSFER_PERIMETER_CATEGORIES = new Set([
  "PAYMENT",
  "NETWORK",
  "HARDWARE",
  "IT_DESK",
  "LOGISTICS",
  "SYNC",
])

export type EscalationReasonCategory = "km_failure" | "recurring" | "complexity" | "no_km"

export const ESCALATION_REASON_LABELS: Record<EscalationReasonCategory, string> = {
  km_failure: "Échec procédure KM",
  recurring: "Incident récurrent",
  complexity: "Complexité opérationnelle",
  no_km: "Aucun KM disponible",
}

const RECURRING_PATTERN =
  /récurrent|recurrent|répété|repeated|plusieurs fois|encore une fois|revient|revient souvent/i

export function isFoN3Escalation(row: AgentQueueRow, category: string | null): boolean {
  if (row.orchestratedDecision !== "ESCALATE_N3") return false
  if (row.transferRequired) return false

  const resolved = resolvePerimeterCategory(category)
  if (resolved && TRANSFER_PERIMETER_CATEGORIES.has(resolved)) return false

  const label = row.perimeterLabel.trim().toLowerCase()
  if (
    /monétique|monetique|payment|réseau|network|matériel|materiel|hardware|back.?office|logistique|bureautique|infra/.test(
      label,
    )
  ) {
    return false
  }

  return true
}

export function isFoOperationalTicket(row: AgentQueueRow, category: string | null): boolean {
  if (row.transferRequired || row.orchestratedDecision === "TRANSFER") return false
  const resolved = resolvePerimeterCategory(category)
  if (resolved && TRANSFER_PERIMETER_CATEGORIES.has(resolved)) return false
  const label = row.perimeterLabel.trim().toLowerCase()
  if (
    /monétique|monetique|payment|réseau|network|matériel|materiel|hardware|back.?office|logistique|bureautique|infra/.test(
      label,
    )
  ) {
    return false
  }
  return true
}

export function classifyEscalationReason(
  row: AgentQueueRow,
  description: string,
): EscalationReasonCategory {
  const text = `${row.title} ${description}`

  if (!row.hasKmRecommendation && !row.kmCode) {
    return "no_km"
  }

  if (RECURRING_PATTERN.test(text)) {
    return "recurring"
  }

  if (row.hasKmRecommendation || row.kmCode) {
    return "km_failure"
  }

  return "complexity"
}

export function escalationReasonLabel(category: EscalationReasonCategory): string {
  return ESCALATION_REASON_LABELS[category]
}

export function escalationReasonDetail(category: EscalationReasonCategory): string {
  switch (category) {
    case "km_failure":
      return "Procédure KM appliquée sans résolution"
    case "no_km":
      return "Aucune procédure adaptée au périmètre FO"
    case "recurring":
      return "Motif récurrent sur le périmètre magasin"
    case "complexity":
      return "Complexité hors résolution standard FO"
  }
}

export function escalationContext(category: EscalationReasonCategory): string {
  switch (category) {
    case "recurring":
      return "Incident similaire détecté plusieurs fois"
    case "no_km":
      return "Couverture KM insuffisante sur ce type d'incident"
    case "km_failure":
      return "Procédure exécutée sans clôture en L1"
    case "complexity":
      return "Signaux multiples — arbitrage N3 requis"
  }
}

export const ESCALATION_REQUIRED_ACTION = "Analyse N3 FO"

export function escalationCategoryLabel(
  category: string | null,
  perimeterLabelRaw: string,
): string {
  const resolved = resolvePerimeterCategory(category)
  if (resolved) return perimeterLabel(resolved)
  const fromCode = cpAgentCategoryLabel(category)
  if (fromCode !== "—") return fromCode
  return perimeterLabelRaw.trim() || "FO"
}
