import {
  AGENT_KPI_HINTS,
  AGENT_SECTION_SUBTITLES,
  AGENT_WORKFLOW_SECTIONS,
} from "@/lib/operational-ui-copy"
import {
  formatOperationalDecision,
  formatRecommendedAsDecision,
  OPERATIONAL_DECISION_LABELS,
} from "@/lib/ai/operational-decision"

/**
 * Terminologie décisionnelle entreprise — interface agent en français.
 */
export const SUGGESTED_ACTION_LABELS: Record<string, string> = {
  RESOLVE_LOCALLY: OPERATIONAL_DECISION_LABELS.RESOLVE,
  APPLY_KM: OPERATIONAL_DECISION_LABELS.RESOLVE,
  ESCALATE_N3: OPERATIONAL_DECISION_LABELS.ESCALATE_N3,
  TRANSFER_PERIMETER: OPERATIONAL_DECISION_LABELS.TRANSFER,
  REQUEST_INFORMATION: OPERATIONAL_DECISION_LABELS.REQUEST_INFORMATION,
  MONITOR: OPERATIONAL_DECISION_LABELS.SUSPEND,
}

export function formatSuggestedAction(action: string | null | undefined): string {
  return formatRecommendedAsDecision(action)
}

export const OPERATIONAL_SECTIONS = AGENT_WORKFLOW_SECTIONS

export const SIGNAL_LABELS = {
  escalation: "Signal N3",
  transfer: "Signal routage",
  sla: "Attention SLA",
  priority: "Signal priorité",
  similar: "Incidents similaires",
} as const

export const DASHBOARD_KPIS = {
  openTickets: "Tickets ouverts",
  slaAttention: "Attention SLA",
  escalation: "Escalade",
  transfer: "Transfert",
  suspend: "Suspension",
} as const

export const DASHBOARD_KPI_HINTS: Record<keyof typeof DASHBOARD_KPIS, string> = {
  openTickets: AGENT_KPI_HINTS.openTickets,
  slaAttention: AGENT_KPI_HINTS.slaAttention,
  escalation: AGENT_KPI_HINTS.escalation,
  transfer: AGENT_KPI_HINTS.transfer,
  suspend: AGENT_KPI_HINTS.suspend,
}

export const QUEUE_SECTIONS = {
  next: "Prochains tickets à traiter",
  highAttention: "Tickets haute attention",
  recentActivity: "Fil opérationnel",
  recentActivityHint: AGENT_SECTION_SUBTITLES.recentActivity,
  decisionFeedback: "Suivi des décisions",
  decisionFeedbackHint: "Actions agent et retours IA",
} as const

export function formatN3SignalValue(required: boolean): string {
  return required ? "Attention" : "Aucun"
}

export function formatRoutingSignalValue(required: boolean, target?: string | null): string {
  if (!required) return "Aucun"
  return target ? `Attention · ${target}` : "Attention"
}

export function formatSlaAttentionValue(breached: boolean, riskLevel: string): string {
  if (breached) return "Dépassé"
  if (riskLevel === "HIGH") return "À risque"
  if (riskLevel === "MEDIUM") return "À surveiller"
  return "Conforme"
}

export const AGENT_EXECUTABLE_ACTIONS = [
  "Résoudre",
  "Suspendre",
  "Escalade N3",
  "Transfert Matériel",
  "Transfert Réseau",
  "Transfert Monétique",
] as const

export const KM_PROCEDURE_SECTIONS = {
  beforeApplying: "Avant application",
  procedure: "Procédure",
  ifSuccessful: "Si succès",
  ifFailed: "Si échec",
} as const

export { formatOperationalDecision, formatRecommendedAsDecision, OPERATIONAL_DECISION_LABELS }
