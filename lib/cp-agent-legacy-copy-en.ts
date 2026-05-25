/**
 * Maps deprecated French seed / CARE copy to English for the agent workspace.
 * Prefer `bun run db:seed:cp-agent` for a full English dataset; this keeps older DB rows readable.
 */

import { normalizeSuggestedActionText } from "@/lib/care-operational-actions"

function normalizeKey(s: string): string {
  return s.replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/\s+/g, " ").trim()
}

const LEGACY_ENTRIES: [string, string][] = [
  ["Caisse offline — poste 3", "Checkout offline — lane 3"],
  ["Caisse offline - poste 3", "Checkout offline — lane 3"],
  [
    "Symptômes cohérents avec dégradation liaison ou session applicative bloquée.",
    "Symptoms consistent with link degradation or a blocked application session.",
  ],
  [
    "Isoler le poste, collecter logs applicatifs et tracer la session avant toute escalade.",
    "Isolate the lane, collect application logs, and trace the session before any escalation.",
  ],
  [
    "Caisse VLP ne répond plus au réseau magasin. Écran figé sur l'écran d'accueil. Redémarrage local tenté sans effet.",
    "VLP checkout no longer responds on the store network. Screen frozen on the welcome screen. Local restart attempted without effect.",
  ],
  ["Analyse opérationnelle générée", "Operational analysis generated"],
  ["Synthèse et pistes de résolution proposées.", "Summary and proposed resolution paths."],
  ["Assignation agent", "Agent assignment"],
  [
    "Correlations avec incidents similaires sur le même périmètre fonctionnel et la catégorie du ticket.",
    "Correlations with similar incidents on the same functional perimeter and ticket category.",
  ],
  [
    "Corrélations avec incidents similaires sur le même périmètre fonctionnel et la catégorie du ticket.",
    "Correlations with similar incidents on the same functional perimeter and ticket category.",
  ],
]

const LEGACY = new Map<string, string>()
for (const [fr, en] of LEGACY_ENTRIES) {
  LEGACY.set(normalizeKey(fr), en)
}

/** Replace known legacy French strings; otherwise return original. */
export function englishLegacyCopy(text: string | null | undefined): string {
  if (text == null) return ""
  const raw = String(text)
  const hit = LEGACY.get(normalizeKey(raw))
  return normalizeSuggestedActionText(hit ?? raw)
}

const CATEGORY_LABELS: Record<string, string> = {
  CAISSE: "Checkout",
  CHECKOUT: "Checkout",
  RESEAU: "Network",
  NETWORK: "Network",
  PERIPH: "Peripheral",
  PERIPHERAL: "Peripheral",
  PÉRIPH: "Peripheral",
  SCO: "SCO",
  PAYMENT: "Payment",
  TPE: "Payment terminal",
  DATA: "Data",
  SYNC: "Synchronization",
  IAM: "Identity / access",
  INV: "Inventory",
  PRINT: "Print",
  LOGISTICS: "Logistics",
  PROJECT: "Project",
  HARDWARE: "Hardware",
  LOYALTY: "Loyalty",
  BACK_OFFICE: "Back office",
  STORE_INFRA: "Store infrastructure",
  IT_DESK: "IT desk",
  BUREAUTIQUE: "IT desk",
}

/** English label for ticket category codes (legacy French or English codes). */
export function cpAgentCategoryLabel(category: string | null | undefined): string {
  if (category == null || category === "") return "—"
  const k = category.trim().toUpperCase().replace(/\s+/g, "_")
  return CATEGORY_LABELS[k] ?? category.replaceAll("_", " ")
}
