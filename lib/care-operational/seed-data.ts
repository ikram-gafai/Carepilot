import { plannedOperationalOutcomeForCareId } from "@/lib/care-operational/catalog-operational-outcome"
import {
  buildStoreSlotCodes,
  CARREFOUR_OPERATIONAL_STORES,
} from "@/lib/data/carrefour-stores"
import { SUPPORT_AGENTS } from "@/lib/data/support-agents"

import {
  catalogEntryCount,
  OPERATIONAL_TICKET_CATALOG,
  perimeterCodeForCategory,
  type OperationalTicketCatalogEntry,
} from "@/lib/care-operational/ticket-catalog"

import {
  buildSlaTimingForBucket,
  resolveTtrTargetHours,
  slaExposureBucketForIndex,
} from "@/lib/care-operational/sla-exposure"

export { buildSlaTimingForBucket, slaExposureBucketForIndex, resolveTtrTargetHours }

export type OperationalTicketSeed = {
  careTicketId: string
  reference: string
  title: string
  description: string
  perimeter: string
  status: string
  priority: string
  category: string
  subCategory: string
  storeCode: string
  assignedGroup: string
  assignedAgent: string | null
  syncBatch: 1
  escalationRequired: boolean
  transferRequired: boolean
  targetPerimeter: string | null
  kmApplicable: string | null
  aiRecommendedAction: string | null
  aiConfidence: number | null
  aiReason: string | null
  /** @deprecated Use buildSlaTimingForBucket at seed time */
  slaHoursFromNow: number
}

export { CARREFOUR_OPERATIONAL_STORES }

/** 70 slots across France stores — top 5 dominate Top Magasins. */
const STORE_SLOT_CODES: string[] = buildStoreSlotCodes()

const STORE_BY_CODE = new Map(CARREFOUR_OPERATIONAL_STORES.map((s) => [s.storeCode, s]))

function mapCatalogPriorityToP(priority: OperationalTicketCatalogEntry["priority"]): string {
  switch (priority) {
    case "critical":
      return "P1"
    case "high":
      return "P2"
    case "medium":
      return "P3"
    case "low":
    default:
      return "P4"
  }
}

function slaHoursForPriority(priority: OperationalTicketCatalogEntry["priority"]): number {
  return resolveTtrTargetHours(mapCatalogPriorityToP(priority))
}

function enrichDescription(entry: OperationalTicketCatalogEntry, storeCode: string): string {
  const store = STORE_BY_CODE.get(storeCode)
  if (!store) return entry.description
  return `${entry.description} Magasin : ${store.storeName}, ${store.city}.`
}

export function buildOperationalTicketSeeds(): OperationalTicketSeed[] {
  const catalog = OPERATIONAL_TICKET_CATALOG
  if (catalog.length !== 70) {
    throw new Error(`Expected 70 catalog tickets, got ${catalog.length} (count=${catalogEntryCount()})`)
  }

  return catalog.map((entry, index) => {
    const i = index + 1
    const careTicketId = `CARE-OP-${String(i).padStart(5, "0")}`
    const storeCode = STORE_SLOT_CODES[index]!
    const plan = plannedOperationalOutcomeForCareId(careTicketId)
    return {
      careTicketId,
      reference: careTicketId,
      title: entry.title,
      description: enrichDescription(entry, storeCode),
      perimeter: perimeterCodeForCategory(entry.category),
      status: entry.status,
      priority: entry.priority,
      category: entry.category,
      subCategory: entry.subCategory,
      storeCode,
      assignedGroup: "Carrefour Support",
      assignedAgent: SUPPORT_AGENTS[index % SUPPORT_AGENTS.length]!.email,
      syncBatch: 1 as const,
      escalationRequired: plan?.outcome === "ESCALATE_N3",
      transferRequired: plan?.outcome === "TRANSFER",
      targetPerimeter: plan?.outcome === "TRANSFER" ? perimeterCodeForCategory(entry.category) : null,
      kmApplicable: plan?.kmCode ?? null,
      aiRecommendedAction: null,
      aiConfidence: null,
      aiReason: null,
      slaHoursFromNow: slaHoursForPriority(entry.priority),
    }
  })
}

export const OPERATIONAL_KM_SEED = [
  {
    kmCode: "KM-OP-001",
    title: "Procédure reprise caisse VLP",
    perimeter: "FO",
    category: "CHECKOUT",
    content: "Isoler la caisse, vérifier l'état de session, redémarrer les services VLP, valider le flux panier.",
    tags: "vlp,checkout,lane",
  },
  {
    kmCode: "KM-OP-002",
    title: "Diagnostic terminal de paiement",
    perimeter: "MONETIQUE",
    category: "PAYMENT",
    content: "Vérifier la liaison acquéreur, redémarrer le terminal, capturer la trace erreur, escalader si persistant.",
    tags: "payment,terminal",
  },
  {
    kmCode: "KM-OP-003",
    title: "Vérification chemin réseau magasin",
    perimeter: "RESEAU",
    category: "NETWORK",
    content: "Contrôler passerelle, VLAN, résolution DNS et lien physique sur le rack caisse.",
    tags: "network,vlan",
  },
  {
    kmCode: "KM-OP-004",
    title: "Remplacement périphérique matériel",
    perimeter: "MATERIEL",
    category: "HARDWARE",
    content: "Valider câble et hub, remplacer module scanner ou imprimante, exécuter test de recette.",
    tags: "hardware,peripheral",
  },
  {
    kmCode: "KM-OP-005",
    title: "Synchronisation avantages fidélité",
    perimeter: "FIDELITE",
    category: "LOYALTY",
    content: "Revoir la fenêtre batch fidélité, relancer la synchro avantages, confirmer le solde client.",
    tags: "loyalty,sync",
  },
] as const
