/**
 * Affichage français pour l'espace agent — conserve le texte FR des seeds CARE
 * et reconvertit les libellés anglais connus vers le français.
 */

import { normalizeSuggestedActionText } from "@/lib/care-operational-actions"
import { formatPerimeterLabel } from "@/lib/care-operational/perimeter-codes"

function normalizeKey(s: string): string {
  return s.replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/\s+/g, " ").trim()
}

/** Paires FR (source) → EN (seed anglais) — inversées à l'affichage. */
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

const EN_TO_FR = new Map<string, string>()
for (const [fr, en] of LEGACY_ENTRIES) {
  EN_TO_FR.set(normalizeKey(en), fr)
}

/** Texte affiché en français (alias historique `englishLegacyCopy`). */
export function englishLegacyCopy(text: string | null | undefined): string {
  if (text == null) return ""
  const raw = String(text)
  const hit = EN_TO_FR.get(normalizeKey(raw))
  return normalizeSuggestedActionText(hit ?? raw)
}

export const displayCopy = englishLegacyCopy

const CATEGORY_LABELS: Record<string, string> = {
  CAISSE: "Caisse",
  CHECKOUT: "Caisse",
  RESEAU: "Réseau",
  NETWORK: "Réseau",
  PERIPH: "Périphérique",
  PERIPHERAL: "Périphérique",
  PÉRIPH: "Périphérique",
  SCO: "SCO",
  PAYMENT: "Monétique",
  TPE: "TPE",
  DATA: "Données",
  SYNC: "Synchronisation",
  IAM: "Identité / accès",
  INV: "Inventaire",
  PRINT: "Impression",
  LOGISTICS: "Logistique",
  PROJECT: "Projet",
  HARDWARE: "Matériel",
  LOYALTY: "Fidélité",
  BACK_OFFICE: "Back Office",
  STORE_INFRA: "Infrastructure magasin",
  IT_DESK: "Bureautique",
  BUREAUTIQUE: "Bureautique",
}

/** Libellé français pour les codes catégorie ticket. */
export function cpAgentCategoryLabel(category: string | null | undefined): string {
  if (category == null || category === "") return "—"
  const k = category.trim().toUpperCase().replace(/\s+/g, "_")
  return CATEGORY_LABELS[k] ?? category.replaceAll("_", " ")
}

/** Libellé d'affichage pour les codes périmètre. */
export function cpAgentPerimeterLabel(perimeter: string | null | undefined): string {
  return formatPerimeterLabel(perimeter)
}
