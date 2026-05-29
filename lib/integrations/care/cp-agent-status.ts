import { mapCareSourceToWorkflowStatus } from "@/lib/cp-agent/ticket-workflow"

import type { CareTicket } from "./types"

export type CareTicketOperational = CareTicket & {
  sourceStatus?: string | null
  sourcePriority?: string | null
  escalationRequired?: boolean
  transferRequired?: boolean
  targetPerimeter?: string | null
}

/** Map CARE source ticket into cp_agent workflow status (never AI predictions). */
export function mapCareTicketToCpAgentStatus(t: CareTicketOperational): string {
  const raw = (t.sourceStatus ?? t.status).toUpperCase().replace(/\s+/g, "_")

  // Closed in CARE source with resolution timestamp stays resolved.
  if ((raw === "RESOLVED" || raw === "CLOSED" || t.status === "resolved" || t.status === "closed") && t.resolutionDate) {
    return "RESOLVED"
  }

  if (t.status === "suspended" || raw === "SUSPENDED") return "SUSPENDED"
  if (t.status === "in_progress" || raw === "IN_PROGRESS") return "IN_PROGRESS"
  if (t.status === "open" || raw === "OPEN" || raw === "NEW") return "OPEN"

  return mapCareSourceToWorkflowStatus(t.sourceStatus ?? t.status)
}

export function mapCareTicketToCpAgentPriority(t: CareTicketOperational): string {
  const raw = (t.sourcePriority ?? t.priority).toUpperCase()
  if (raw === "P1" || raw === "CRITICAL") return "P1"
  if (raw === "P2" || raw === "HIGH") return "P2"
  if (raw === "P3" || raw === "MEDIUM") return "P3"
  if (raw === "P4" || raw === "LOW") return "P4"
  switch (t.priority) {
    case "critical":
      return "P1"
    case "high":
      return "P2"
    case "medium":
      return "P3"
    case "low":
    default:
      return "P4"
  }
}
