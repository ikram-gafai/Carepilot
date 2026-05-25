import { buildStoreSlotCodes, CARREFOUR_OPERATIONAL_STORES } from "@/lib/data/carrefour-stores"
import { SUPPORT_AGENTS } from "@/lib/data/support-agents"

import {
  catalogEntryCount,
  OPERATIONAL_TICKET_CATALOG,
  perimeterCodeForCategory,
  type OperationalTicketCatalogEntry,
} from "@/lib/care-operational/ticket-catalog"

/** Stable 70-ticket CARE source catalog for operational synchronization windows. */

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
  slaHoursFromNow: number
}

export { CARREFOUR_OPERATIONAL_STORES }

/** 70 slots across France stores — top 5 dominate Top Magasins. */
const STORE_SLOT_CODES: string[] = buildStoreSlotCodes()

const STORE_BY_CODE = new Map(CARREFOUR_OPERATIONAL_STORES.map((s) => [s.storeCode, s]))

function slaHoursForPriority(priority: OperationalTicketCatalogEntry["priority"]): number {
  switch (priority) {
    case "critical":
      return 2
    case "high":
      return 6
    case "medium":
      return 24
    case "low":
    default:
      return 48
  }
}

function enrichDescription(entry: OperationalTicketCatalogEntry, storeCode: string): string {
  const store = STORE_BY_CODE.get(storeCode)
  if (!store) return entry.description
  return `${entry.description} Store: ${store.storeName}, ${store.city}.`
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
      escalationRequired: false,
      transferRequired: false,
      targetPerimeter: null,
      kmApplicable: null,
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
    title: "VLP lane recovery procedure",
    perimeter: "FO_VLP",
    category: "CHECKOUT",
    content: "Isolate lane, verify session state, restart VLP services, validate basket flow.",
    tags: "vlp,checkout,lane",
  },
  {
    kmCode: "KM-OP-002",
    title: "Payment terminal diagnostic",
    perimeter: "MONETIQUE",
    category: "PAYMENT",
    content: "Verify acquirer link, reboot terminal, capture error trace, escalate if persistent.",
    tags: "payment,terminal",
  },
  {
    kmCode: "KM-OP-003",
    title: "Store network path verification",
    perimeter: "RESEAU",
    category: "NETWORK",
    content: "Check gateway, VLAN, DNS resolution, and physical link at lane rack.",
    tags: "network,vlan",
  },
  {
    kmCode: "KM-OP-004",
    title: "Peripheral hardware swap",
    perimeter: "MATERIEL",
    category: "HARDWARE",
    content: "Validate cable and hub, replace scanner or printer module, run acceptance test.",
    tags: "hardware,peripheral",
  },
  {
    kmCode: "KM-OP-005",
    title: "Loyalty entitlement sync",
    perimeter: "FIDELITE",
    category: "LOYALTY",
    content: "Review loyalty batch window, re-run entitlement sync, confirm customer balance.",
    tags: "loyalty,sync",
  },
] as const
