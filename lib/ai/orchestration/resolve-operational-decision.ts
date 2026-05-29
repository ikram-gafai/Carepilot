/**
 * Final orchestrated operational decision per ticket.
 * Synthesizes Task 1 (escalation), Task 2 (transfer), and Task 3 (action) — not any single table alone.
 */

import {
  formatOperationalDecision,
  mapRecommendedActionToDecision,
  type OperationalDecision,
} from "@/lib/ai/operational-decision"

const WAITING_STATUSES = new Set(["MONITORING", "WAITING_STORE", "SUSPENDED"])

/** Minimum confidence from routing models (Tasks 1 & 2) to own the final decision. */
const ESCALATION_ROUTING_MIN = 0.66
const TRANSFER_ROUTING_MIN = 0.85

export type OrchestrationDecisionInput = {
  recommendedAction: string | null
  probabilityDistribution?: Record<string, number> | null
  actionConfidence?: number | null
  ticketStatus: string
  priority?: string | null
  escalationSignal?: boolean
  transferSignal?: boolean
  escalationConfidence?: number | null
  transferConfidence?: number | null
}

function topMlClass(input: OrchestrationDecisionInput): { mlClass: string | null; prob: number } {
  const dist = input.probabilityDistribution
  if (dist && Object.keys(dist).length > 0) {
    const ranked = Object.entries(dist).sort((a, b) => b[1] - a[1])
    const [mlClass, prob] = ranked[0] ?? [null, 0]
    return { mlClass, prob }
  }
  return {
    mlClass: input.recommendedAction,
    prob: input.actionConfidence ?? 0,
  }
}

function isHighPriority(priority: string | null | undefined): boolean {
  const p = (priority ?? "").toUpperCase()
  return p === "P1" || p === "P2" || p === "CRITICAL" || p === "HIGH"
}

function routingDecision(input: OrchestrationDecisionInput): OperationalDecision | null {
  const escConf = input.escalationConfidence ?? 0
  const trfConf = input.transferConfidence ?? 0
  const escOn = Boolean(input.escalationSignal) && escConf >= ESCALATION_ROUTING_MIN
  const trfOn = Boolean(input.transferSignal) && trfConf >= TRANSFER_ROUTING_MIN

  if (escOn && trfOn) {
    if (isHighPriority(input.priority) || escConf >= 0.7) return "ESCALATE_N3"
    return "TRANSFER"
  }
  if (escOn) return "ESCALATE_N3"
  if (trfOn) return "TRANSFER"
  return null
}

function actionModelDecision(input: OrchestrationDecisionInput): OperationalDecision {
  const { mlClass, prob } = topMlClass(input)

  if (mlClass === "ESCALATE_N3" && prob >= 0.12) return "ESCALATE_N3"
  if (mlClass === "TRANSFER_PERIMETER" && prob >= 0.12) return "TRANSFER"
  if (mlClass === "MONITOR" || mlClass === "REQUEST_INFORMATION") return "RESOLVE"

  return mapRecommendedActionToDecision(mlClass) ?? "RESOLVE"
}

/**
 * One mutually-exclusive decision per ticket.
 * Priority: routing models (Tasks 1 & 2) → waiting suspend → action model (Task 3).
 */
export function resolveOrchestratedOperationalDecision(
  input: OrchestrationDecisionInput,
): OperationalDecision {
  const routed = routingDecision(input)
  if (routed) return routed

  if (WAITING_STATUSES.has(input.ticketStatus)) return "SUSPEND"

  return actionModelDecision(input)
}

export function formatOrchestratedDecision(input: OrchestrationDecisionInput): string {
  return formatOperationalDecision(resolveOrchestratedOperationalDecision(input))
}

/** SLA attention — due-date pressure confirmed by SLA model risk level. */
export function isOrchestratedSlaAttention(
  slaLabel: string,
  slaRiskLevel?: string | null,
): boolean {
  const dueDateAttention = slaLabel === "Breached" || slaLabel === "At risk"
  if (!dueDateAttention) return false
  return slaRiskLevel === "HIGH" || slaRiskLevel === "MEDIUM"
}

/** Keep latest row per ticket when lists are ordered newest-first. */
export function latestRowByTicketId<T extends { ticketId: number }>(rows: T[]): Map<number, T> {
  const map = new Map<number, T>()
  for (const row of rows) {
    if (!map.has(row.ticketId)) map.set(row.ticketId, row)
  }
  return map
}
