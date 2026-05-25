/** CARE source system — operational API payloads (JSON). */

export type CareTicketStatus =
  | "open"
  | "in_progress"
  | "suspended"
  | "resolved"
  | "closed"

export type CareTicketPriority = "low" | "medium" | "high" | "critical"

export type CareTicket = {
  id: string
  reference: string
  title: string
  description: string
  status: CareTicketStatus
  priority: CareTicketPriority
  perimeter: string
  category: string | null
  subCategory: string | null
  /** care_source.stores.id */
  careStoreId: number
  storeCode: string
  storeName: string
  storeCity: string
  storeRegion: string
  storeType: string
  assignedGroup: string | null
  assignedAgent: string | null
  slaDeadline: string | null
  resolutionDate: string | null
  createdAt: string
  updatedAt: string
  /** Raw status from CARE DB (e.g. OPEN, ESCALATED_N3). */
  sourceStatus?: string | null
  sourcePriority?: string | null
  escalationRequired?: boolean
  transferRequired?: boolean
  targetPerimeter?: string | null
  aiRecommendedAction?: string | null
  aiConfidence?: number | null
  aiReason?: string | null
  aiStatus?: string | null
}

export type CareTicketHistoryEvent = {
  id: string
  ticketId: string
  eventType: string
  previousValue: string | null
  newValue: string | null
  description: string
  performedBy: string
  performedAt: string
  createdAt: string
  updatedAt: string
}

export type CareTicketComment = {
  id: string
  ticketId: string
  authorName: string
  authorRole: string
  body: string
  visibility: "internal" | "external"
  createdAt: string
  updatedAt: string
}

export type CareKmReference = {
  id: string
  code: string
  title: string
  perimeter: string
  category: string
  keywords: string[]
  summary: string
  procedureSteps: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export type CareListResponse<T> = {
  items: T[]
  total: number
}
