import { z } from "zod"

/** Accept ISO-8601 from PostgreSQL / JS Date (Z or numeric offset). */
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" })

export const careTicketSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(["open", "in_progress", "suspended", "resolved", "closed"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  perimeter: z.string().min(1),
  category: z.string().nullable(),
  subCategory: z.string().nullable(),
  careStoreId: z.number().int().positive(),
  storeCode: z.string().min(1),
  storeName: z.string().min(1),
  storeCity: z.string().min(1),
  storeRegion: z.string().min(1),
  storeType: z.string().min(1),
  assignedGroup: z.string().nullable(),
  assignedAgent: z.string().nullable(),
  slaDeadline: isoDate.nullable(),
  resolutionDate: isoDate.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
  sourceStatus: z.string().nullable().optional(),
  sourcePriority: z.string().nullable().optional(),
  escalationRequired: z.boolean().optional(),
  transferRequired: z.boolean().optional(),
  targetPerimeter: z.string().nullable().optional(),
  aiRecommendedAction: z.string().nullable().optional(),
  aiConfidence: z.number().nullable().optional(),
  aiReason: z.string().nullable().optional(),
  aiStatus: z.string().nullable().optional(),
})

export const careTicketListSchema = z.object({
  items: z.array(careTicketSchema),
  total: z.number().int().nonnegative(),
})

export const careHistoryEventSchema = z.object({
  id: z.string().min(1),
  ticketId: z.string().min(1),
  eventType: z.string().min(1),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  description: z.string(),
  performedBy: z.string().min(1),
  performedAt: isoDate,
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const careHistoryListSchema = z.object({
  items: z.array(careHistoryEventSchema),
  total: z.number().int().nonnegative(),
})

export const careCommentSchema = z.object({
  id: z.string().min(1),
  ticketId: z.string().min(1),
  authorName: z.string().min(1),
  authorRole: z.string().min(1),
  body: z.string(),
  visibility: z.enum(["internal", "external"]),
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const careCommentListSchema = z.object({
  items: z.array(careCommentSchema),
  total: z.number().int().nonnegative(),
})

export const careKmSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  perimeter: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string()),
  summary: z.string(),
  procedureSteps: z.array(z.string()),
  status: z.enum(["active", "archived"]),
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const careKmListSchema = z.object({
  items: z.array(careKmSchema),
  total: z.number().int().nonnegative(),
})
