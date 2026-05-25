import {
  N3_TICKET_STATUS,
  TRANSFER_DESTINATIONS,
  type TransferTicketStatus,
} from "@/lib/care-operational-actions"

import type { CareTicket } from "./types"

export type CareTicketOperational = CareTicket & {
  sourceStatus?: string | null
  sourcePriority?: string | null
  escalationRequired?: boolean
  transferRequired?: boolean
  targetPerimeter?: string | null
}

const PERIMETER_TO_TRANSFER: Record<string, TransferTicketStatus> = {
  MONETIQUE: "TRANSFERRED_MON",
  PAYMENT: "TRANSFERRED_MON",
  MATERIEL: "TRANSFERRED_MAT",
  HARDWARE: "TRANSFERRED_MAT",
  BO: "TRANSFERRED_BO",
  BACK_OFFICE: "TRANSFERRED_BO",
  RESEAU: "TRANSFERRED_RES",
  NETWORK: "TRANSFERRED_RES",
  BUREAUTIQUE: "TRANSFERRED_BUR",
  WORKSTATION: "TRANSFERRED_BUR",
  INFRASTRUCTURE: "TRANSFERRED_INF",
  INF: "TRANSFERRED_INF",
}

function mapTargetPerimeterToTransfer(target: string | null | undefined): TransferTicketStatus {
  if (!target?.trim()) return "TRANSFERRED_MAT"
  const key = target.trim().toUpperCase().replace(/\s+/g, "_")
  return PERIMETER_TO_TRANSFER[key] ?? "TRANSFERRED_MAT"
}

/** Map CARE source / API ticket into cp_agent operational status codes. */
export function mapCareTicketToCpAgentStatus(t: CareTicketOperational): string {
  if (t.escalationRequired) return N3_TICKET_STATUS
  if (t.transferRequired) {
    return mapTargetPerimeterToTransfer(t.targetPerimeter)
  }

  const raw = (t.sourceStatus ?? t.status).toUpperCase().replace(/\s+/g, "_")

  if (raw === N3_TICKET_STATUS || raw === "ESCALATED_N3" || /\bN3\b/.test(raw)) {
    return N3_TICKET_STATUS
  }

  if (raw === "TRANSFERRED" || t.transferRequired) {
    return mapTargetPerimeterToTransfer(t.targetPerimeter)
  }

  for (const dest of TRANSFER_DESTINATIONS) {
    if (raw === dest.status) return dest.status
  }

  if (raw === "OPEN" || raw === "NEW") return "OPEN"
  if (raw === "IN_PROGRESS" || raw === "INPROGRESS") return "IN_PROGRESS"
  if (raw === "ESCALATED") return "ESCALATED"
  if (raw === "MONITORING") return "MONITORING"
  if (raw === "WAITING_STORE") return "WAITING_STORE"
  if (raw === "SUSPENDED" || raw === "SUSPEND") return "SUSPENDED"
  if (raw === "RESOLVED" || raw === "CLOSED") return "RESOLVED"

  switch (t.status) {
    case "open":
      return "OPEN"
    case "in_progress":
      return "IN_PROGRESS"
    case "suspended":
      return "SUSPENDED"
    case "resolved":
    case "closed":
      return "RESOLVED"
    default:
      return "OPEN"
  }
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
