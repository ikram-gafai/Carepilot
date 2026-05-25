/**
 * English copy for the admin supervision workspace.
 * Normalizes legacy French seed rows and uses English chart labels.
 */

import { englishLegacyCopy } from "@/lib/cp-agent-legacy-copy-en"
import { normalizeSuggestedActionText } from "@/lib/care-operational-actions"

/** Short English labels for transfer monitoring charts (admin only). */
export const ADMIN_TRANSFER_CHART_DESTINATIONS = [
  { status: "TRANSFERRED_MON" as const, label: "Payment" },
  { status: "TRANSFERRED_MAT" as const, label: "Hardware" },
  { status: "TRANSFERRED_BO" as const, label: "Back office" },
  { status: "TRANSFERRED_RES" as const, label: "Network" },
  { status: "TRANSFERRED_BUR" as const, label: "Workstation" },
  { status: "TRANSFERRED_INF" as const, label: "Infrastructure" },
] as const

const PHRASE_REPLACEMENTS: [RegExp, string][] = [
  [/Transfer Monétique/gi, "Transfer Payment"],
  [/Transfer Matériel/gi, "Transfer Hardware"],
  [/Transfer Bureautique/gi, "Transfer Workstation"],
  [/Transfer Réseau/gi, "Transfer Network"],
  [/Transfert Monétique/gi, "Transfer Payment"],
  [/Transfert Matériel/gi, "Transfer Hardware"],
  [/Transfert Bureautique/gi, "Transfer Workstation"],
  [/Transfert Réseau/gi, "Transfer Network"],
  [/Transfert Infrastructure/gi, "Transfer Infrastructure"],
  [/Escalade N3/gi, "Escalate N3"],
  [/SLA critique/gi, "SLA critical"],
  [/SLA dépassé/gi, "SLA breached"],
  [/En attente validation/gi, "Awaiting validation"],
  [/Synchronisation file opérationnelle/gi, "Operational queue sync"],
  [/Synchronisation références KM/gi, "KM reference sync"],
  [/Ingestion retardée/gi, "Delayed ingestion"],
  [/parseur timeout/gi, "parser timeout"],
  [/instabilité réseau persistante/gi, "persistent network instability"],
  [/écran SCO noir/gi, "SCO black screen"],
  [/Validation rejetée/gi, "Validation rejected"],
  [/contexte pic d'activité manquant/gi, "missing peak-hour context"],
  [/Recommandation haute confiance rejetée/gi, "High-confidence recommendation rejected"],
  [/Contexte pic d'activité manquant/gi, "Missing peak-hour context"],
  [/Répétition type « réseau » incorrect/gi, "Incorrect network-type repeat"],
  [/Dérive catégorie/gi, "Category drift"],
  [/Dérive recommandation/gi, "Recommendation drift"],
  [/Taux de rejet .* au-dessus du seuil/gi, "Rejection rate above threshold"],
  [/Payload malformé/gi, "Malformed payload"],
  [/Champ store_code absent/gi, "Missing store_code field"],
  [/Timeout parseur/gi, "Parser timeout"],
  [/Doublon détecté et fusionné/gi, "Duplicate detected and merged"],
  [/Latence file d'attente ingestion/gi, "Ingestion queue latency"],
  [/Latence > 12 min sur dernier run partiel/gi, "Latency > 12 min on last partial run"],
  [/Dernier run partiel/gi, "Last partial run"],
  [/Escalade jugée non nécessaire/gi, "Escalation deemed unnecessary"],
  [/Écart KM/gi, "KM mismatch"],
  [/procédure réseau/gi, "network procedure"],
  [/Transfert Matériel validé/gi, "Transfer Hardware validated"],
  [/Recommandation alignée avec le diagnostic terrain/gi, "Recommendation aligned with field diagnosis"],
  [/Contexte opérationnel insuffisant/gi, "Insufficient operational context"],
  [/validation magasin non documentée/gi, "store validation not documented"],
  [/Redémarrage synchronisation/gi, "Sync restart"],
  [/alerte latence/gi, "latency alert"],
  [/Rôle Supervisor confirmé/gi, "Supervisor role confirmed"],
  [/Recurring réseau instability/gi, "Recurring network instability"],
  [/ignoré/gi, "ignored"],
  [/lot ingestion/gi, "ingestion batch"],
  [/sur lot/gi, "on batch"],
  [/quarantined\./gi, "quarantined."],
]

export function adminEnglishCopy(text: string | null | undefined): string {
  if (text == null) return ""
  let t = normalizeSuggestedActionText(englishLegacyCopy(text))
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    t = t.replace(pattern, replacement)
  }
  return t
}

export function adminTransferChartLabel(shortLabel: string): string {
  const hit = ADMIN_TRANSFER_CHART_DESTINATIONS.find((d) => d.label === shortLabel)
  if (hit) return hit.label
  const fromFrench: Record<string, string> = {
    Monétique: "Payment",
    Matériel: "Hardware",
    BO: "Back office",
    Réseau: "Network",
    Bureautique: "Workstation",
    Infrastructure: "Infrastructure",
  }
  return fromFrench[shortLabel] ?? shortLabel
}
