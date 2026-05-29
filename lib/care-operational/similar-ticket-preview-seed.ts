import {
  OPERATIONAL_TICKET_CATALOG,
  type OperationalTicketCategory,
} from "@/lib/care-operational/ticket-catalog"
import { OPERATIONAL_KM_SEED } from "@/lib/care-operational/seed-data"

/** Stable demo preview — not live semantic retrieval. */
export const SIMILAR_TICKET_PREVIEW_METHOD = "operational_preview"

export type SimilarTicketPreviewSeed = {
  queryCatalogIndex: number
  similarCatalogIndex: number
  rankPosition: number
  similarityScore: number
  linkedResolution: string
  linkedAction: string
  linkedKmId: string
  linkedKmTitle: string
}

const KM_BY_CATEGORY: Record<OperationalTicketCategory, { id: string; title: string }> = {
  CHECKOUT: { id: "KM-OP-001", title: "Procédure reprise caisse VLP" },
  SCO: { id: "KM-OP-001", title: "Procédure reprise caisse VLP" },
  PAYMENT: { id: "KM-OP-002", title: "Diagnostic terminal de paiement" },
  NETWORK: { id: "KM-OP-003", title: "Vérification chemin réseau magasin" },
  HARDWARE: { id: "KM-OP-004", title: "Remplacement périphérique matériel" },
  LOYALTY: { id: "KM-OP-005", title: "Synchronisation avantages fidélité" },
  BACK_OFFICE: { id: "KM-OP-005", title: "Synchronisation avantages fidélité" },
  STORE_INFRA: { id: "KM-OP-003", title: "Vérification chemin réseau magasin" },
}

export const KM_TITLE_BY_CODE = new Map<string, string>(
  OPERATIONAL_KM_SEED.map((km) => [km.kmCode, km.title]),
)

const HISTORICAL_BY_CATEGORY: Record<
  OperationalTicketCategory,
  { resolutions: string[]; actions: string[] }
> = {
  CHECKOUT: {
    resolutions: [
      "Restarted VLP services and validated basket flow on the lane",
      "Recycled POS session after clearing local cache; lane returned to service",
      "Applied fiscal printer reset sequence and confirmed end-of-day close",
    ],
    actions: ["Resolve", "Suspend", "Resolve"],
  },
  SCO: {
    resolutions: [
      "Recalibrated security scale and cleared attendant lock after sensor reset",
      "Restarted SCO payment reader session; contactless path validated",
      "Replaced receipt printer module and ran acceptance test",
    ],
    actions: ["Resolve", "Transfer", "Resolve"],
  },
  PAYMENT: {
    resolutions: [
      "Recycled acquirer link and replayed store-and-forward queue",
      "Replaced PIN pad module after encryption handshake failure",
      "Escalated to Monetique N2; host path restored after gateway failover",
    ],
    actions: ["Resolve", "Escalate N3", "Transfer"],
  },
  NETWORK: {
    resolutions: [
      "Restored VLAN routing on checkout zone switch after port recycle",
      "Renewed DHCP scope and confirmed DNS resolution at store gateway",
      "VPN tunnel rebuilt; store WAN latency returned to baseline",
    ],
    actions: ["Resolve", "Transfer", "Suspend"],
  },
  HARDWARE: {
    resolutions: [
      "Swapped lane hub and revalidated scanner plus receipt printer chain",
      "Replaced cash drawer sensor; supervisor override path confirmed",
      "UPS battery event cleared; peripherals powered through rack hub",
    ],
    actions: ["Resolve", "Resolve", "Transfer"],
  },
  LOYALTY: {
    resolutions: [
      "Re-ran entitlement sync batch; member balance matched source system",
      "Restarted coupon redemption service and replayed pending redemptions",
      "Profile lookup cache flushed; loyalty service response normalized",
    ],
    actions: ["Resolve", "Suspend", "Resolve"],
  },
  BACK_OFFICE: {
    resolutions: [
      "Forced price update replication and validated POS master data publish",
      "Replayed stalled promotion import; inventory delta reconciled",
      "Back-office sync window extended; replication lag cleared",
    ],
    actions: ["Resolve", "Suspend", "Escalate N3"],
  },
  STORE_INFRA: {
    resolutions: [
      "Restarted store controller service and confirmed hypervisor heartbeat",
      "Expanded disk threshold alert after maintenance cleanup on store DB",
      "SQL maintenance completed; POS application crash loop stopped",
    ],
    actions: ["Resolve", "Escalate N3", "Suspend"],
  },
}

function catalogIndexPeers(queryIndex: number): number[] {
  const entry = OPERATIONAL_TICKET_CATALOG[queryIndex]!
  const category = entry.category
  const peers = OPERATIONAL_TICKET_CATALOG.map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate, index }) => candidate.category === category && index !== queryIndex)
    .sort((a, b) => {
      const aResolved = a.candidate.status === "RESOLVED" ? 0 : 1
      const bResolved = b.candidate.status === "RESOLVED" ? 0 : 1
      if (aResolved !== bResolved) return aResolved - bResolved
      return (a.index % 11) - (b.index % 11)
    })
    .map(({ index }) => index)

  const count = 2 + (queryIndex % 2)
  return peers.slice(0, count)
}

function scoreForPair(queryIndex: number, similarIndex: number, rank: number): number {
  const base = 0.9 - rank * 0.05
  const jitter = ((queryIndex * 17 + similarIndex * 13) % 7) * 0.01
  return Math.round(Math.min(0.94, Math.max(0.68, base - jitter)) * 1000) / 1000
}

/** Deterministic 2–3 historical reference rows per synchronized catalog ticket. */
export function buildSimilarTicketPreviewSeeds(): SimilarTicketPreviewSeed[] {
  const rows: SimilarTicketPreviewSeed[] = []

  for (let queryIndex = 0; queryIndex < OPERATIONAL_TICKET_CATALOG.length; queryIndex++) {
    const category = OPERATIONAL_TICKET_CATALOG[queryIndex]!.category
    const historical = HISTORICAL_BY_CATEGORY[category]
    const km = KM_BY_CATEGORY[category]
    const linkedKmTitle = KM_TITLE_BY_CODE.get(km.id) ?? km.title

    catalogIndexPeers(queryIndex).forEach((similarIndex, rank) => {
      rows.push({
        queryCatalogIndex: queryIndex,
        similarCatalogIndex: similarIndex,
        rankPosition: rank + 1,
        similarityScore: scoreForPair(queryIndex, similarIndex, rank),
        linkedResolution: historical.resolutions[similarIndex % historical.resolutions.length]!,
        linkedAction: historical.actions[(queryIndex + rank) % historical.actions.length]!,
        linkedKmId: km.id,
        linkedKmTitle,
      })
    })
  }

  return rows
}

export function careIdForCatalogIndex(catalogIndex: number): string {
  return `CARE-OP-${String(catalogIndex + 1).padStart(5, "0")}`
}
