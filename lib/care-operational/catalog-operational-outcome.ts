/**
 * Planned operational outcomes for the 70 CARE-OP catalog tickets.
 * Drives demo-realistic N1/N2 decision mix while business guards enforce KM / signal rules.
 */

import type { OperationalDecision } from "@/lib/ai/operational-decision"
import {
  OPERATIONAL_TICKET_CATALOG,
  type OperationalTicketCatalogEntry,
} from "@/lib/care-operational/ticket-catalog"

export type CatalogOperationalPlan = {
  outcome: OperationalDecision
  kmCode: string | null
  suspendReason: string | null
}

const CATEGORY_KM: Partial<Record<OperationalTicketCatalogEntry["category"], string>> = {
  CHECKOUT: "KM-OP-001",
  SCO: "KM-OP-001",
  PAYMENT: "KM-OP-002",
  LOYALTY: "KM-OP-005",
}

/** Per-category slot outcomes — index is position within category block in the catalog. */
const CATEGORY_OUTCOME_SLOTS: Record<
  OperationalTicketCatalogEntry["category"],
  OperationalDecision[]
> = {
  CHECKOUT: [
    "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE",
    "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE",
    "ESCALATE_N3", "ESCALATE_N3", "SUSPEND",
  ],
  SCO: [
    "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE",
    "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE",
    "ESCALATE_N3", "SUSPEND",
  ],
  PAYMENT: [
    "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE", "RESOLVE",
    "ESCALATE_N3", "TRANSFER", "SUSPEND",
  ],
  NETWORK: [
    "TRANSFER", "TRANSFER", "TRANSFER", "TRANSFER",
    "ESCALATE_N3", "ESCALATE_N3", "ESCALATE_N3",
    "SUSPEND", "SUSPEND",
  ],
  HARDWARE: [
    "TRANSFER", "TRANSFER",
    "ESCALATE_N3", "ESCALATE_N3", "ESCALATE_N3", "ESCALATE_N3",
    "SUSPEND", "SUSPEND",
  ],
  LOYALTY: ["RESOLVE", "ESCALATE_N3", "TRANSFER", "TRANSFER"],
  BACK_OFFICE: [
    "TRANSFER", "TRANSFER", "TRANSFER", "TRANSFER",
    "ESCALATE_N3", "ESCALATE_N3", "SUSPEND", "SUSPEND",
  ],
  STORE_INFRA: ["TRANSFER", "TRANSFER", "ESCALATE_N3", "SUSPEND", "SUSPEND"],
}

const SUSPEND_REASONS = [
  "En attente de confirmation magasin",
  "Identifiant terminal manquant côté magasin",
  "Logs de diagnostic manquants côté magasin",
  "Fenêtre de maintenance planifiée",
  "En attente d'une dépendance externe",
] as const

function categoryIndex(catalogIndex: number): { entry: OperationalTicketCatalogEntry; slot: number } {
  const entry = OPERATIONAL_TICKET_CATALOG[catalogIndex]
  if (!entry) throw new Error(`Invalid catalog index ${catalogIndex}`)
  let slot = 0
  for (let i = 0; i < catalogIndex; i++) {
    if (OPERATIONAL_TICKET_CATALOG[i]!.category === entry.category) slot++
  }
  return { entry, slot }
}

export function parseOperationalCatalogIndex(careId: string | null | undefined): number | null {
  if (!careId?.trim()) return null
  const m = /^CARE-OP-(\d+)$/i.exec(careId.trim())
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n < 1 || n > OPERATIONAL_TICKET_CATALOG.length) return null
  return n - 1
}

export function plannedOperationalOutcome(catalogIndex: number): CatalogOperationalPlan {
  const { entry, slot } = categoryIndex(catalogIndex)
  const slots = CATEGORY_OUTCOME_SLOTS[entry.category]
  const outcome = slots[slot] ?? slots[slots.length - 1] ?? "ESCALATE_N3"
  const kmCode = outcome === "RESOLVE" ? (CATEGORY_KM[entry.category] ?? null) : null
  const suspendReason =
    outcome === "SUSPEND" ? SUSPEND_REASONS[slot % SUSPEND_REASONS.length]! : null
  return { outcome, kmCode, suspendReason }
}

export function plannedOperationalOutcomeForCareId(
  careId: string | null | undefined,
): CatalogOperationalPlan | null {
  const idx = parseOperationalCatalogIndex(careId)
  if (idx == null) return null
  return plannedOperationalOutcome(idx)
}

export function summarizePlannedDistribution(): Record<OperationalDecision, number> {
  const counts: Record<OperationalDecision, number> = {
    RESOLVE: 0,
    ESCALATE_N3: 0,
    TRANSFER: 0,
    SUSPEND: 0,
  }
  for (let i = 0; i < OPERATIONAL_TICKET_CATALOG.length; i++) {
    counts[plannedOperationalOutcome(i).outcome]++
  }
  return counts
}
