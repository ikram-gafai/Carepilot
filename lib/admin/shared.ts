import { sql } from "drizzle-orm"

import {
  CLOSED_TICKET_STATUSES,
  CLOSED_STATUS_SQL_LIST,
  N3_TICKET_STATUS,
} from "@/lib/care-operational-actions"
import {
  operationalCareTicketScope,
  operationalOpenCareTicketScope,
} from "@/lib/care-operational/operational-ticket-scope"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

/** CarePilot sign-in role for the support / agent workspace (not Admin or Supervisor). */
export const SUPPORT_AGENT_ROLE = "Agent" as const

export const CLOSED = CLOSED_TICKET_STATUSES
export const OPEN_FILTER = sql`${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_STATUS_SQL_LIST)})`

/** Agent-aligned scope: synchronized CARE tickets, excluding demo scenarios. */
export const OPERATIONAL_TICKET_SCOPE = operationalCareTicketScope()
export const OPERATIONAL_OPEN_SCOPE = operationalOpenCareTicketScope(CLOSED_STATUS_SQL_LIST)
/** N3 escalations only — not perimeter transfers. */
export const N3_ESCALATION_STATUSES = [N3_TICKET_STATUS] as const

export type AdminHealth = "stable" | "overloaded" | "degraded" | "healthy" | "delayed" | "partial_failure"

export function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600 * 1000)
}

export function formatAge(d: Date) {
  const h = Math.max(1, Math.round((Date.now() - d.getTime()) / 3_600_000))
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`
}

export function formatAuditAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function summarizeRecommendationOutcomes(rows: { outcome: string; count: number }[]) {
  const helpful = rows.find((r) => r.outcome === "helpful")?.count ?? 0
  const notHelpful = rows.find((r) => r.outcome === "not_helpful")?.count ?? 0
  const pending = rows.find((r) => r.outcome === "pending")?.count ?? 0
  const rated = helpful + notHelpful
  return {
    acceptancePct: rated ? Math.round((100 * helpful) / rated) : null,
    rejectionPct: rated ? Math.round((100 * notHelpful) / rated) : null,
    pending,
    avgConfidencePct: null as number | null,
  }
}

export function healthFromSyncStatus(status: string | undefined | null): AdminHealth {
  if (!status) return "degraded"
  const s = status.toLowerCase()
  if (s === "success") return "healthy"
  if (s === "partial" || s === "partial_success") return "partial_failure"
  if (s === "skipped") return "stable"
  if (s === "delayed" || s === "running") return "delayed"
  return "degraded"
}
