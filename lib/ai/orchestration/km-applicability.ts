/**
 * KM applicability for orchestration — AI retrieval OR catalog/perimeter match.
 */

import { OPERATIONAL_KM_SEED } from "@/lib/care-operational/seed-data"
import type { OperationalTicketCategory } from "@/lib/care-operational/ticket-catalog"

export type ApplicableKm = {
  hasKm: boolean
  kmId: string | null
  kmTitle: string | null
  source: "ai" | "catalog" | "none"
  similarityScore: number | null
}

const CATEGORY_KM: Partial<Record<OperationalTicketCategory | string, string>> = {
  CHECKOUT: "KM-OP-001",
  SCO: "KM-OP-001",
  PAYMENT: "KM-OP-002",
  NETWORK: "KM-OP-003",
  HARDWARE: "KM-OP-004",
  LOYALTY: "KM-OP-005",
}

const KM_BY_CODE = new Map(OPERATIONAL_KM_SEED.map((k) => [k.kmCode, k]))

/** FO/VLP lane scope handled by N1/N2 with KM procedures. */
export function isFoVlpAgentScope(category: string | null, perimeter: string | null): boolean {
  const cat = (category ?? "").toUpperCase()
  if (cat === "CHECKOUT" || cat === "SCO") return true
  const p = (perimeter ?? "").toUpperCase()
  return p === "FO" || p === "SCO" || p.includes("VLP")
}

/** Ownership outside N1/N2 FO/VLP lane scope. */
export function isOutsideFoVlpOwnership(category: string | null): boolean {
  const cat = (category ?? "").toUpperCase()
  return (
    cat === "NETWORK" ||
    cat === "HARDWARE" ||
    cat === "LOYALTY" ||
    cat === "BACK_OFFICE" ||
    cat === "STORE_INFRA"
  )
}

/** Lane-level payment issues N1/N2 may treat with KM before routing. */
export function isLanePaymentScope(category: string | null): boolean {
  return (category ?? "").toUpperCase() === "PAYMENT"
}

/** Categories where N1/N2 may close with KM (not route-only reference). */
export function isResolvableKmScope(category: string | null, perimeter: string | null): boolean {
  if (isFoVlpAgentScope(category, perimeter)) return true
  if (isLanePaymentScope(category)) return true
  if ((category ?? "").toUpperCase() === "LOYALTY") return true
  return false
}

export function resolveApplicableKm(input: {
  category: string | null
  perimeter: string | null
  aiKmId?: string | null
  aiKmTitle?: string | null
  aiSimilarity?: number | null
}): ApplicableKm {
  if (input.aiKmId) {
    return {
      hasKm: true,
      kmId: input.aiKmId,
      kmTitle: input.aiKmTitle ?? null,
      source: "ai",
      similarityScore: input.aiSimilarity ?? null,
    }
  }

  const code =
    CATEGORY_KM[input.category as OperationalTicketCategory] ??
    CATEGORY_KM[(input.category ?? "").toUpperCase()]
  if (code) {
    const seed = KM_BY_CODE.get(code)
    if (seed) {
      return {
        hasKm: true,
        kmId: seed.kmCode,
        kmTitle: seed.title,
        source: "catalog",
        similarityScore: null,
      }
    }
  }

  return { hasKm: false, kmId: null, kmTitle: null, source: "none", similarityScore: null }
}
