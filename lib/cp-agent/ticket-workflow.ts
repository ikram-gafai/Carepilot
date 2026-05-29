/**
 * CARE workflow status vs agent outcome status.
 * AI predictions never belong in ticket.status — only agent actions set outcomes.
 */

import {
  CLOSED_TICKET_STATUSES,
  isClosedTicketStatus,
  isN3TicketStatus,
  isTransferTicketStatus,
  N3_TICKET_STATUS,
  OPERATIONAL_ACTION_KINDS,
  ticketStatusUiLabel,
  TRANSFER_TICKET_STATUSES,
} from "@/lib/care-operational-actions"
import {
  buildOrchestratedTicketDecision,
  resolveTicketFinalDecision,
} from "@/lib/ai/orchestration/resolve-ticket-final-decision"

export function formatSuggestedActionWithTarget(
  _action: string | null | undefined,
  _transferTarget?: string | null,
  options?: {
    careId?: string | null
    title?: string | null
    description?: string | null
    ticketStatus?: string | null
    category?: string | null
    perimeter?: string | null
    priority?: string | null
    predictedPriority?: string | null
    qualityLevel?: string | null
    completenessScore?: number | null
    missingFields?: string[]
    escalationSignal?: boolean
    transferSignal?: boolean
    escalationConfidence?: number | null
    transferConfidence?: number | null
    transferTarget?: string | null
    hasKm?: boolean
    aiKmId?: string | null
    aiKmTitle?: string | null
    slaLabel?: string | null
    slaRiskLevel?: string | null
    slaPredictedBreach?: boolean
  },
): string {
  return resolveTicketFinalDecision({
    careId: options?.careId,
    title: options?.title,
    description: options?.description,
    ticketStatus: options?.ticketStatus ?? "OPEN",
    category: options?.category ?? null,
    perimeter: options?.perimeter ?? null,
    priority: options?.priority ?? null,
    predictedPriority: options?.predictedPriority ?? null,
    qualityLevel: options?.qualityLevel,
    completenessScore: options?.completenessScore,
    missingFields: options?.missingFields,
    escalationSignal: options?.escalationSignal ?? false,
    escalationConfidence: options?.escalationConfidence ?? null,
    transferSignal: options?.transferSignal ?? false,
    transferConfidence: options?.transferConfidence ?? null,
    transferTarget: options?.transferTarget ?? null,
    aiKmId: options?.aiKmId ?? null,
    aiKmTitle: options?.aiKmTitle ?? null,
    slaLabel: options?.slaLabel ?? null,
    slaRiskLevel: options?.slaRiskLevel ?? null,
    slaPredictedBreach: options?.slaPredictedBreach ?? false,
  }).label
}

export { resolveTicketFinalDecision, buildOrchestratedTicketDecision }
export const CARE_WORKFLOW_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "MONITORING",
  "WAITING_STORE",
  "SUSPENDED",
] as const

export type CareWorkflowStatus = (typeof CARE_WORKFLOW_STATUSES)[number]

/** Statuses set only when an agent performs an action in CarePilot. */
export const AGENT_OUTCOME_STATUSES = [
  N3_TICKET_STATUS,
  "RESOLVED",
  ...TRANSFER_TICKET_STATUSES,
] as const

const AGENT_OUTCOME_EVENT_TYPES = new Set<string>([
  ...OPERATIONAL_ACTION_KINDS,
])

export function isAgentOutcomeStatus(status: string): boolean {
  return (
    isN3TicketStatus(status) ||
    isTransferTicketStatus(status) ||
    status === "RESOLVED"
  )
}

export function isAgentOutcomeEventType(eventType: string): boolean {
  return AGENT_OUTCOME_EVENT_TYPES.has(eventType)
}

export function formatCareWorkflowStatus(status: string): string {
  return ticketStatusUiLabel(status)
}

/** Outcome statuses wrongly set without an agent action revert to OPEN. */
export function normalizeUntreatedTicketStatus(
  status: string,
  hasAgentOutcomeHistory: boolean,
): string {
  if (isAgentOutcomeStatus(status) && !hasAgentOutcomeHistory) {
    return "OPEN"
  }
  if (status === "ESCALATED") return "IN_PROGRESS"
  return status
}

export { isClosedTicketStatus, CLOSED_TICKET_STATUSES }

export type TicketSignalKey = "n3" | "routing" | "missing_context" | "sla" | "km"

export const TICKET_SIGNAL_LABELS: Record<TicketSignalKey, string> = {
  n3: "N3",
  routing: "Routing",
  missing_context: "Missing context",
  sla: "SLA",
  km: "KM",
}

export function buildTicketSignals(input: {
  escalationRequired?: boolean
  transferRequired?: boolean
  missingContext?: boolean
  slaAttention?: boolean
  kmOpportunity?: boolean
}): TicketSignalKey[] {
  const out: TicketSignalKey[] = []
  if (input.escalationRequired) out.push("n3")
  if (input.transferRequired) out.push("routing")
  if (input.missingContext) out.push("missing_context")
  if (input.slaAttention) out.push("sla")
  if (input.kmOpportunity) out.push("km")
  return out
}

export function isCareWorkflowStatus(status: string): boolean {
  return (CARE_WORKFLOW_STATUSES as readonly string[]).includes(status)
}

export function agentTicketListStatusLabel(status: string): string {
  return ticketStatusUiLabel(status)
}

/** Map CARE source status to agent workflow status. */
export function mapCareSourceToWorkflowStatus(sourceStatus: string): string {
  const s = sourceStatus.trim().toUpperCase()
  if (s === "ESCALATED") return "IN_PROGRESS"
  if (s === "CLOSED") return "RESOLVED"
  if ((CARE_WORKFLOW_STATUSES as readonly string[]).includes(s)) return s
  if (isAgentOutcomeStatus(s)) return s
  return "OPEN"
}

export const AGENT_TICKET_FILTER_STATUSES = [
  ...CARE_WORKFLOW_STATUSES,
  N3_TICKET_STATUS,
  "RESOLVED",
  ...TRANSFER_TICKET_STATUSES,
] as const
