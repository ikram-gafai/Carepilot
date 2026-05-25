import type {
  CareKmReference,
  CareTicket,
  CareTicketComment,
  CareTicketHistoryEvent,
} from "./types"
import {
  mapCareTicketToCpAgentPriority,
  mapCareTicketToCpAgentStatus,
  type CareTicketOperational,
} from "./cp-agent-status"

/** Map normalized CARE ticket into cp_agent upsert fields. */
export function ticketToSyncRow(t: CareTicket) {
  const op = t as CareTicketOperational
  return {
    externalId: t.id,
    careId: t.reference,
    reference: t.reference,
    title: t.title,
    description: t.description,
    status: mapCareTicketToCpAgentStatus(op),
    priority: mapCareTicketToCpAgentPriority(op),
    perimeter: t.perimeter,
    category: t.category ?? "GENERAL",
    subCategory: t.subCategory,
    storeId: t.careStoreId,
    storeCode: t.storeCode,
    storeName: t.storeName,
    storeCity: t.storeCity,
    storeRegion: t.storeRegion,
    storeType: t.storeType,
    assignedGroup: t.assignedGroup,
    assignedAgent: t.assignedAgent,
    slaDueAt: t.slaDeadline ? new Date(t.slaDeadline) : null,
    resolutionDate: t.resolutionDate ? new Date(t.resolutionDate) : null,
    externalCreatedAt: new Date(t.createdAt),
    externalUpdatedAt: new Date(t.updatedAt),
    source: "CARE" as const,
    aiRecommendedAction: null,
    aiConfidence: null,
    aiReason: null,
    aiStatus: null,
  }
}

export function historyToSyncRow(ticketDbId: number, e: CareTicketHistoryEvent) {
  return {
    ticketId: ticketDbId,
    externalId: e.id,
    eventType: e.eventType,
    previousValue: e.previousValue,
    newValue: e.newValue,
    description: e.description,
    performedBy: e.performedBy,
    performedAt: new Date(e.performedAt),
    summary: e.description,
    detail: e.newValue,
    actorLabel: e.performedBy,
    occurredAt: new Date(e.performedAt),
    externalCreatedAt: new Date(e.createdAt),
    externalUpdatedAt: new Date(e.updatedAt),
    source: "CARE" as const,
  }
}

export function commentToSyncRow(ticketDbId: number, c: CareTicketComment) {
  return {
    ticketId: ticketDbId,
    externalId: c.id,
    authorName: c.authorName,
    authorRole: c.authorRole,
    body: c.body,
    visibility: c.visibility,
    externalCreatedAt: new Date(c.createdAt),
    externalUpdatedAt: new Date(c.updatedAt),
    source: "CARE" as const,
  }
}

export function kmToSyncRow(k: CareKmReference) {
  return {
    externalId: k.id,
    code: k.code,
    title: k.title,
    perimeter: k.perimeter,
    category: k.category,
    keywords: k.keywords.join(", "),
    summary: k.summary,
    procedureSteps: JSON.stringify(k.procedureSteps),
    status: k.status,
    externalCreatedAt: new Date(k.createdAt),
    externalUpdatedAt: new Date(k.updatedAt),
    source: "CARE" as const,
  }
}
