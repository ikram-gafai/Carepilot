/**
 * CARE / CarePilot operational wording and status model.
 *
 * Escalate N3 = higher support level (same perimeter).
 * Transfer = another operational perimeter / team (never N3).
 */

export const N3_TICKET_STATUS = "ESCALATED_N3" as const

/** Ticket statuses for perimeter transfers (closed from agent queue). */
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
  | "escalate_n3"
  | "transfer_monetique"
  | "transfer_materiel"
  | "transfer_bo"
  | "transfer_reseau"
  | "transfer_bureautique"
  | "transfer_infrastructure"

/** Canonical UI labels (English) — no arrows. */
export const OPERATIONAL_ACTION_LABELS: Record<OperationalActionKind, string> = {
  resolve: "Resolve",
  suspend: "Suspend",
  escalate_n3: "Escalate N3",
  transfer_monetique: "Transfer Payment",
  transfer_materiel: "Transfer Hardware",
  transfer_bo: "Transfer Back office",
  transfer_reseau: "Transfer Network",
  transfer_bureautique: "Transfer Workstation",
  transfer_infrastructure: "Transfer Infrastructure",
}

export const AGENT_RESOLUTION_ACTIONS = ["resolve", "suspend"] as const satisfies readonly OperationalActionKind[]

export const AGENT_ESCALATION_ACTIONS = ["escalate_n3"] as const satisfies readonly OperationalActionKind[]

/** Transfers exposed on the agent ticket action panel. */
export const AGENT_QUEUE_TRANSFER_ACTIONS = [
  "transfer_materiel",
  "transfer_monetique",
  "transfer_bo",
  "transfer_reseau",
] as const satisfies readonly OperationalActionKind[]

/** All perimeter transfers (agent queue + admin monitoring). */
export const AGENT_TRANSFER_ACTIONS = [
  ...AGENT_QUEUE_TRANSFER_ACTIONS,
  "transfer_bureautique",
  "transfer_infrastructure",
] as const satisfies readonly OperationalActionKind[]

const STATUS_BY_ACTION: Record<OperationalActionKind, string> = {
  resolve: "RESOLVED",
  suspend: "SUSPENDED",
  escalate_n3: N3_TICKET_STATUS,
  transfer_monetique: "TRANSFERRED_MON",
  transfer_materiel: "TRANSFERRED_MAT",
  transfer_bo: "TRANSFERRED_BO",
  transfer_reseau: "TRANSFERRED_RES",
  transfer_bureautique: "TRANSFERRED_BUR",
  transfer_infrastructure: "TRANSFERRED_INF",
}

const HISTORY_SUMMARY_BY_ACTION: Record<OperationalActionKind, string> = {
  resolve: "Resolution",
  suspend: "Suspension",
  escalate_n3: "Escalate N3",
  transfer_monetique: "Transfer Payment",
  transfer_materiel: "Transfer Hardware",
  transfer_bo: "Transfer Back office",
  transfer_reseau: "Transfer Network",
  transfer_bureautique: "Transfer Workstation",
  transfer_infrastructure: "Transfer Infrastructure",
}

/** Transfer destinations for monitoring charts (order preserved). */
export const TRANSFER_DESTINATIONS = [
  { status: "TRANSFERRED_MON" as const, label: "Payment" },
  { status: "TRANSFERRED_MAT" as const, label: "Hardware" },
  { status: "TRANSFERRED_BO" as const, label: "Back office" },
  { status: "TRANSFERRED_RES" as const, label: "Network" },
  { status: "TRANSFERRED_BUR" as const, label: "Workstation" },
  { status: "TRANSFERRED_INF" as const, label: "Infrastructure" },
] as const

const STATUS_UI_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  ESCALATED: "Escalated",
  MONITORING: "Monitoring",
  WAITING_STORE: "Waiting store",
  SUSPENDED: "Suspended",
  RESOLVED: "Resolved",
  ESCALATED_N3: "Escalated N3",
  TRANSFERRED_MON: "Transfer Payment",
  TRANSFERRED_MAT: "Transfer Hardware",
  TRANSFERRED_BO: "Transfer Back office",
  TRANSFERRED_RES: "Transfer Network",
  TRANSFERRED_BUR: "Transfer Workstation",
  TRANSFERRED_INF: "Transfer Infrastructure",
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

/** SQL fragment values for NOT IN open-ticket filters (legacy raw SQL). */
export const CLOSED_STATUS_SQL_LIST = CLOSED_TICKET_STATUSES.map((s) => `'${s}'`).join(",")

export function normalizeSuggestedActionText(text: string): string {
  let t = text.trim()
  if (!t) return t
  t = t.replace(/\bEscalate\s*→\s*N3\b/gi, "Escalate N3")
  t = t.replace(/\bTransfer\s*→\s*Matériel\b/gi, "Transfer Hardware")
  t = t.replace(/\bTransfer\s*→\s*Monétique\b/gi, "Transfer Payment")
  t = t.replace(/\bTransfer\s*→\s*Bureautique\b/gi, "Transfer Workstation")
  t = t.replace(/\bTransfer\s*→\s*BO\b/gi, "Transfer Back office")
  t = t.replace(/\bTransfer\s*→\s*Réseau\b/gi, "Transfer Network")
  t = t.replace(/\bTransfer\s*→\s*Infrastructure\b/gi, "Transfer Infrastructure")
  t = t.replace(/\bTransfer\s+Monétique\b/gi, "Transfer Payment")
  t = t.replace(/\bTransfer\s+Matériel\b/gi, "Transfer Hardware")
  t = t.replace(/\bTransfer\s+Bureautique\b/gi, "Transfer Workstation")
  t = t.replace(/\bTransfer\s+Réseau\b/gi, "Transfer Network")
  t = t.replace(/\bTransfer\s+N3\b/gi, "Escalate N3")
  t = t.replace(/\bEscalate\s+Matériel\b/gi, "Transfer Hardware")
  t = t.replace(/\bTransfert\s+Monétique\b/gi, "Transfer Payment")
  t = t.replace(/\bTransfert\s+Matériel\b/gi, "Transfer Hardware")
  t = t.replace(/\bTransfert\s+Bureautique\b/gi, "Transfer Workstation")
  t = t.replace(/\bTransfert\s+Réseau\b/gi, "Transfer Network")
  return t
}
