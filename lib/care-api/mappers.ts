import { normalizePerimeterForStorage } from "@/lib/care-operational/perimeter-codes"
import type {
  CareKmReference,
  CareTicket,
  CareTicketComment,
  CareTicketHistoryEvent,
} from "@/lib/integrations/care/types"
import type { kmProcedures, stores } from "@/lib/db/schema/care-source"
import type { careSourceTickets, ticketActions, ticketComments } from "@/lib/db/schema/care-source"

type SrcTicket = typeof careSourceTickets.$inferSelect
type SrcStore = typeof stores.$inferSelect
type SrcComment = typeof ticketComments.$inferSelect
type SrcAction = typeof ticketActions.$inferSelect
type SrcKm = typeof kmProcedures.$inferSelect

function toIso(d: Date | null | undefined): string | null {
  if (!d) return null
  return d.toISOString()
}

function normalizeStatus(status: string): CareTicket["status"] {
  const s = status.toLowerCase().replace(/\s+/g, "_")
  if (s === "in_progress" || s === "inprogress") return "in_progress"
  if (s === "open" || s === "new") return "open"
  if (s === "suspended" || s === "suspend") return "suspended"
  if (s === "resolved") return "resolved"
  if (s === "closed") return "closed"
  return "open"
}

function normalizePriority(priority: string): CareTicket["priority"] {
  const p = priority.toLowerCase()
  if (p === "critical" || p === "urgent") return "critical"
  if (p === "high") return "high"
  if (p === "low") return "low"
  return "medium"
}

export function mapCareSourceTicket(row: SrcTicket, store: SrcStore): CareTicket {
  return {
    id: row.careTicketId,
    reference: row.careTicketId,
    title: row.title,
    description: row.description,
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    perimeter: normalizePerimeterForStorage(row.perimeter) ?? row.perimeter,
    category: row.category,
    subCategory: row.incidentCategory,
    careStoreId: store.id,
    storeCode: store.storeCode,
    storeName: store.storeName,
    storeCity: store.city,
    storeRegion: store.region,
    storeType: store.storeType,
    assignedGroup: row.assignedGroup ?? "Carrefour Support",
    assignedAgent: row.assignedAgent,
    slaDeadline: toIso(row.slaDueAt),
    resolutionDate: toIso(row.closedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sourceStatus: row.status,
    sourcePriority: row.priority,
    escalationRequired: row.escalationRequired ?? false,
    transferRequired: row.transferRequired ?? false,
    targetPerimeter: row.targetPerimeter,
    aiRecommendedAction: row.aiRecommendedAction,
    aiConfidence: row.aiConfidence,
    aiReason: row.aiReason,
    aiStatus: row.aiStatus,
  }
}

export function mapCareSourceComment(
  ticketCareId: string,
  row: SrcComment,
  index: number,
): CareTicketComment {
  return {
    id: `CARE-CMT-${ticketCareId}-${row.id}`,
    ticketId: ticketCareId,
    authorName: row.authorRole,
    authorRole: row.authorRole,
    body: row.content,
    visibility: "internal",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
  }
}

export function mapCareSourceAction(
  ticketCareId: string,
  row: SrcAction,
): CareTicketHistoryEvent {
  return {
    id: `CARE-HIST-${ticketCareId}-${row.id}`,
    ticketId: ticketCareId,
    eventType: row.actionType,
    previousValue: null,
    newValue: row.result,
    description: row.description,
    performedBy: row.performedBy,
    performedAt: row.createdAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
  }
}

export function mapCareSourceKm(row: SrcKm): CareKmReference {
  const steps = row.steps
    ? row.steps.split("\n").map((s) => s.trim()).filter(Boolean)
    : []
  const keywords = row.tags
    ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : []

  return {
    id: row.kmCode,
    code: row.kmCode,
    title: row.title,
    perimeter: normalizePerimeterForStorage(row.perimeter) ?? row.perimeter,
    category: row.category,
    keywords,
    summary: row.content.slice(0, 500),
    procedureSteps: steps.length ? steps : [row.content],
    status: "active",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
