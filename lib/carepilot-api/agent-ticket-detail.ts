import type { InferSelectModel } from "drizzle-orm"

import { englishLegacyCopy } from "@/lib/cp-agent-legacy-copy-en"
import {
  cpAgentKmSuggestions,
  cpAgentTicketComments,
  cpAgentTicketHistory,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"
import { listKmReferencesForTicketContext } from "@/lib/carepilot-api/km"
import {
  getSynchronizedTicket,
  getSynchronizedTicketComments,
  getSynchronizedTicketHistory,
} from "@/lib/carepilot-api/tickets"
import { cpAgentGetTicketAiEnrichment } from "@/lib/queries/cp-agent"
import { getDb } from "@/lib/db"
import { eq } from "drizzle-orm"

export class TicketNotFoundError extends Error {
  constructor() {
    super("Ticket not found")
    this.name = "TicketNotFoundError"
  }
}

type TicketRow = InferSelectModel<typeof cpAgentTickets>
type HistoryRow = InferSelectModel<typeof cpAgentTicketHistory>
type CommentRow = InferSelectModel<typeof cpAgentTicketComments>
type KmSuggestion = InferSelectModel<typeof cpAgentKmSuggestions>

type ApiKmRef = {
  id: number
  externalId: string
  code: string
  title: string
  perimeter: string
  category: string
  keywords: string
  summary: string
  procedureSteps: string
  status: string
  createdAt: string | Date
  updatedAt: string | Date
}

function parseDate(v: string | Date | null | undefined): Date | null {
  if (v == null) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function mapHistoryRow(h: HistoryRow): HistoryRow {
  return {
    ...h,
    occurredAt: parseDate(h.occurredAt) ?? new Date(),
    performedAt: parseDate(h.performedAt),
    externalCreatedAt: parseDate(h.externalCreatedAt),
    externalUpdatedAt: parseDate(h.externalUpdatedAt),
    lastSyncedAt: parseDate(h.lastSyncedAt),
    createdAt: parseDate(h.createdAt) ?? new Date(),
    summary: englishLegacyCopy(h.summary),
    detail: h.detail ? englishLegacyCopy(h.detail) : null,
  }
}

function mapCommentRow(c: CommentRow): CommentRow {
  return {
    ...c,
    createdAt: parseDate(c.createdAt) ?? new Date(),
    updatedAt: parseDate(c.updatedAt) ?? new Date(),
    externalCreatedAt: parseDate(c.externalCreatedAt) ?? new Date(),
    externalUpdatedAt: parseDate(c.externalUpdatedAt) ?? new Date(),
    lastSyncedAt: parseDate(c.lastSyncedAt) ?? new Date(),
    body: englishLegacyCopy(c.body),
  }
}

function procedureStepsToText(procedureSteps: string): string {
  try {
    const parsed = JSON.parse(procedureSteps) as unknown
    if (Array.isArray(parsed)) return parsed.map(String).join("\n")
  } catch {
    /* plain text */
  }
  return procedureSteps
}

function mapSyncKmToSuggestions(items: ApiKmRef[], ticket: TicketRow): KmSuggestion[] {
  return items.slice(0, 5).map((k, i) => ({
    id: -1000 - k.id,
    ticketId: ticket.id,
    kmCode: k.code,
    title: englishLegacyCopy(k.title),
    summary: englishLegacyCopy(k.summary),
    steps: englishLegacyCopy(procedureStepsToText(k.procedureSteps)),
    relevanceScore: 0.72,
    rank: i + 1,
    createdAt: parseDate(k.createdAt) ?? new Date(),
  }))
}

function mergeKmSuggestions(aiKm: KmSuggestion[], syncKm: KmSuggestion[]): KmSuggestion[] {
  if (!syncKm.length) return aiKm
  if (!aiKm.length) return syncKm
  const codes = new Set(aiKm.map((k) => k.kmCode))
  const extra = syncKm.filter((k) => !codes.has(k.kmCode))
  return [...aiKm, ...extra].slice(0, 6)
}

export type AgentTicketDetailPageData = {
  ticket: TicketRow
  assigneeName: string | null
  assigneeEmail: string | null
  analysis: Awaited<ReturnType<typeof cpAgentGetTicketAiEnrichment>>["analysis"]
  history: HistoryRow[]
  comments: CommentRow[]
  km: KmSuggestion[]
  relatedIncidents: Awaited<ReturnType<typeof cpAgentGetTicketAiEnrichment>>["relatedIncidents"]
  feedback: Awaited<ReturnType<typeof cpAgentGetTicketAiEnrichment>>["feedback"]
}

/** Lightweight title lookup for metadata (avoids full detail load). */
export async function getAgentTicketTitle(ticketId: number): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .select({ title: cpAgentTickets.title })
    .from(cpAgentTickets)
    .where(eq(cpAgentTickets.id, ticketId))
    .limit(1)
  return row?.title ?? null
}

export async function loadAgentTicketDetailPage(ticketId: number): Promise<AgentTicketDetailPageData> {
  const apiTicket = await getSynchronizedTicket(ticketId)
  if (!apiTicket) throw new TicketNotFoundError()

  const { assigneeName, assigneeEmail, ...ticketFields } = apiTicket
  const ticket: TicketRow = {
    ...ticketFields,
    slaDueAt: parseDate(ticketFields.slaDueAt),
    resolutionDate: parseDate(ticketFields.resolutionDate),
    externalCreatedAt: parseDate(ticketFields.externalCreatedAt),
    externalUpdatedAt: parseDate(ticketFields.externalUpdatedAt),
    lastSyncedAt: parseDate(ticketFields.lastSyncedAt),
    createdAt: parseDate(ticketFields.createdAt) ?? new Date(),
    updatedAt: parseDate(ticketFields.updatedAt) ?? new Date(),
  }

  const [historyRes, commentsRes, kmRes, ai] = await Promise.all([
    getSynchronizedTicketHistory(ticketId),
    getSynchronizedTicketComments(ticketId),
    listKmReferencesForTicketContext({
      perimeter: ticket.perimeter,
      category: ticket.category,
      limit: 12,
    }),
    cpAgentGetTicketAiEnrichment(ticketId, ticket.category),
  ])

  const history = historyRes.items.map(mapHistoryRow)
  const comments = commentsRes.items.map(mapCommentRow)
  const syncKm = mapSyncKmToSuggestions(kmRes.items as ApiKmRef[], ticket)
  const km = mergeKmSuggestions(ai.km, syncKm)

  return {
    ticket,
    assigneeName,
    assigneeEmail,
    analysis: ai.analysis,
    history,
    comments,
    km,
    relatedIncidents: ai.relatedIncidents,
    feedback: ai.feedback,
  }
}
