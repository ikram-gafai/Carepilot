/**
 * Modèle opérationnel CARE / CarePilot — libellés UI en français.
 *
 * Escalade N3 = niveau de support supérieur (même périmètre).
 * Transfert = autre périmètre opérationnel / équipe (jamais N3).
 */

export const N3_TICKET_STATUS = "ESCALATED_N3" as const

/** Statuts ticket pour transferts de périmètre (fermés depuis la file agent). */
export const TRANSFER_TICKET_STATUSES = [
  "TRANSFERRED_MON",
  "TRANSFERRED_MAT",
  "TRANSFERRED_BO",
  "TRANSFERRED_RES",
  "TRANSFERRED_BUR",
  "TRANSFERRED_INF",
] as const

export type TransferTicketStatus = (typeof TRANSFER_TICKET_STATUSES)[number]

export const CLOSED_TICKET_STATUSES = ["RESOLVED", ...TRANSFER_TICKET_STATUSES] as const

export type OperationalActionKind =
  | "resolve"
  | "suspend"
  | "request_information"
  | "escalate_n3"
  | "transfer_monetique"
  | "transfer_materiel"
  | "transfer_bo"
  | "transfer_reseau"
  | "transfer_bureautique"
  | "transfer_infrastructure"

/** Libellés UI canoniques (français). */
export const OPERATIONAL_ACTION_LABELS: Record<OperationalActionKind, string> = {
  resolve: "Résoudre",
  suspend: "Suspendre",
  request_information: "Demander des informations",
  escalate_n3: "Escalade N3",
  transfer_monetique: "Transfert Monétique",
  transfer_materiel: "Transfert Matériel",
  transfer_bo: "Transfert Back Office",
  transfer_reseau: "Transfert Réseau",
  transfer_bureautique: "Transfert Bureautique",
  transfer_infrastructure: "Transfert Infrastructure",
}

export const AGENT_RESOLUTION_ACTIONS = ["resolve", "request_information", "suspend"] as const satisfies readonly OperationalActionKind[]

export const AGENT_ESCALATION_ACTIONS = ["escalate_n3"] as const satisfies readonly OperationalActionKind[]

export const AGENT_QUEUE_TRANSFER_ACTIONS = [
  "transfer_materiel",
  "transfer_monetique",
  "transfer_bo",
  "transfer_reseau",
] as const satisfies readonly OperationalActionKind[]

export const AGENT_TRANSFER_ACTIONS = [
  ...AGENT_QUEUE_TRANSFER_ACTIONS,
  "transfer_bureautique",
  "transfer_infrastructure",
] as const satisfies readonly OperationalActionKind[]

const STATUS_BY_ACTION: Record<OperationalActionKind, string> = {
  resolve: "RESOLVED",
  suspend: "SUSPENDED",
  request_information: "WAITING_STORE",
  escalate_n3: N3_TICKET_STATUS,
  transfer_monetique: "TRANSFERRED_MON",
  transfer_materiel: "TRANSFERRED_MAT",
  transfer_bo: "TRANSFERRED_BO",
  transfer_reseau: "TRANSFERRED_RES",
  transfer_bureautique: "TRANSFERRED_BUR",
  transfer_infrastructure: "TRANSFERRED_INF",
}

const HISTORY_SUMMARY_BY_ACTION: Record<OperationalActionKind, string> = {
  resolve: "Résolution",
  suspend: "Suspension",
  request_information: "Demande d'informations",
  escalate_n3: "Escalade N3",
  transfer_monetique: "Transfert Monétique",
  transfer_materiel: "Transfert Matériel",
  transfer_bo: "Transfert Back Office",
  transfer_reseau: "Transfert Réseau",
  transfer_bureautique: "Transfert Bureautique",
  transfer_infrastructure: "Transfert Infrastructure",
}

export const TRANSFER_DESTINATIONS = [
  { status: "TRANSFERRED_MON" as const, label: "Monétique" },
  { status: "TRANSFERRED_MAT" as const, label: "Matériel" },
  { status: "TRANSFERRED_BO" as const, label: "Back Office" },
  { status: "TRANSFERRED_RES" as const, label: "Réseau" },
  { status: "TRANSFERRED_BUR" as const, label: "Bureautique" },
  { status: "TRANSFERRED_INF" as const, label: "Infrastructure" },
] as const

const STATUS_UI_LABELS: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  ESCALATED: "Escaladé",
  MONITORING: "Surveillance",
  WAITING_STORE: "En attente magasin",
  SUSPENDED: "Suspendu",
  RESOLVED: "Résolu",
  ESCALATED_N3: "Escaladé N3",
  TRANSFERRED_MON: "Transfert Monétique",
  TRANSFERRED_MAT: "Transfert Matériel",
  TRANSFERRED_BO: "Transfert Back Office",
  TRANSFERRED_RES: "Transfert Réseau",
  TRANSFERRED_BUR: "Transfert Bureautique",
  TRANSFERRED_INF: "Transfert Infrastructure",
}

export const OPERATIONAL_ACTION_KINDS = Object.keys(OPERATIONAL_ACTION_LABELS) as OperationalActionKind[]

export function ticketStatusForAction(kind: OperationalActionKind): string {
  return STATUS_BY_ACTION[kind]
}

export function historySummaryForAction(kind: OperationalActionKind): string {
  return HISTORY_SUMMARY_BY_ACTION[kind]
}

export function isTransferTicketStatus(status: string): boolean {
  return (TRANSFER_TICKET_STATUSES as readonly string[]).includes(status)
}

export function isN3TicketStatus(status: string): boolean {
  return status === N3_TICKET_STATUS
}

export function isClosedTicketStatus(status: string): boolean {
  return (CLOSED_TICKET_STATUSES as readonly string[]).includes(status)
}

export function ticketStatusUiLabel(status: string): string {
  return STATUS_UI_LABELS[status] ?? status.replaceAll("_", " ")
}

export function transferLabelForStatus(status: string): string | null {
  const hit = TRANSFER_DESTINATIONS.find((d) => d.status === status)
  return hit?.label ?? null
}

export const CLOSED_STATUS_SQL_LIST = CLOSED_TICKET_STATUSES.map((s) => `'${s}'`).join(",")

export function normalizeSuggestedActionText(text: string): string {
  let t = text.trim()
  if (!t) return t
  t = t.replace(/\bEscalate\s*→\s*N3\b/gi, "Escalade N3")
  t = t.replace(/\bEscalate N3\b/gi, "Escalade N3")
  t = t.replace(/\bResolve\b/gi, "Résoudre")
  t = t.replace(/\bSuspend\b/gi, "Suspendre")
  t = t.replace(/\bRequest information\b/gi, "Demander des informations")
  t = t.replace(/\bTransfer\s*→\s*Matériel\b/gi, "Transfert → Matériel")
  t = t.replace(/\bTransfer\s*→\s*Monétique\b/gi, "Transfert → Monétique")
  t = t.replace(/\bTransfer\s*→\s*Bureautique\b/gi, "Transfert → Bureautique")
  t = t.replace(/\bTransfer\s*→\s*Back Office\b/gi, "Transfert → Back Office")
  t = t.replace(/\bTransfer\s*→\s*Réseau\b/gi, "Transfert → Réseau")
  t = t.replace(/\bTransfer\s*→\s*Infrastructure\b/gi, "Transfert → Infrastructure")
  t = t.replace(/\bTransfer\s*→\s*Fidélité\b/gi, "Transfert → Fidélité")
  t = t.replace(/\bTransfer Hardware\b/gi, "Transfert Matériel")
  t = t.replace(/\bTransfer Payment\b/gi, "Transfert Monétique")
  t = t.replace(/\bTransfer Network\b/gi, "Transfert Réseau")
  t = t.replace(/\bTransfer Workstation\b/gi, "Transfert Bureautique")
  t = t.replace(/\bTransfer Back office\b/gi, "Transfert Back Office")
  t = t.replace(/\bTransfer Infrastructure\b/gi, "Transfert Infrastructure")
  t = t.replace(/\bTransfer\s+Monétique\b/gi, "Transfert Monétique")
  t = t.replace(/\bTransfer\s+Matériel\b/gi, "Transfert Matériel")
  t = t.replace(/\bTransfer\s+Bureautique\b/gi, "Transfert Bureautique")
  t = t.replace(/\bTransfer\s+Réseau\b/gi, "Transfert Réseau")
  t = t.replace(/\bTransfer\s+N3\b/gi, "Escalade N3")
  t = t.replace(/\bTransfert\s+Monétique\b/gi, "Transfert Monétique")
  t = t.replace(/\bTransfert\s+Matériel\b/gi, "Transfert Matériel")
  t = t.replace(/\bTransfert\s+Bureautique\b/gi, "Transfert Bureautique")
  t = t.replace(/\bTransfert\s+Réseau\b/gi, "Transfert Réseau")
  return t
}
