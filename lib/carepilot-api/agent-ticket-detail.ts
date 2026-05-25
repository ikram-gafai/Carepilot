import type { InferSelectModel } from "drizzle-orm"

import { englishLegacyCopy } from "@/lib/cp-agent-legacy-copy-en"
import {
  cpAgentKmSuggestions,
  cpAgentTicketComments,
  cpAgentTicketHistory,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"
import { carepilotFetchSafe } from "@/lib/carepilot-api/server-fetch"
import { cpAgentGetTicketAiEnrichment } from "@/lib/queries/cp-agent"

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

type ApiTicket = TicketRow & {
  assigneeName: string | null
  assigneeEmail: string | null
}

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
  createdAt: string
  updatedAt: string
}

function parseDate(v: string | Date | null | undefined): Date | null {
  if (v == null) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function mapTicketFromApi(raw: ApiTicket): {
  ticket: TicketRow
  assigneeName: string | null
  assigneeEmail: string | null
} {
  const { assigneeName, assigneeEmail, ...rest } = raw
  const ticket: TicketRow = {
    ...rest,
    slaDueAt: parseDate(rest.slaDueAt),
    resolutionDate: parseDate(rest.resolutionDate),
    externalCreatedAt: parseDate(rest.externalCreatedAt),
    externalUpdatedAt: parseDate(rest.externalUpdatedAt),
    lastSyncedAt: parseDate(rest.lastSyncedAt),
    createdAt: parseDate(rest.createdAt) ?? new Date(),
    updatedAt: parseDate(rest.updatedAt) ?? new Date(),
    title: englishLegacyCopy(rest.title),
    description: englishLegacyCopy(rest.description),
  }
  return { ticket, assigneeName, assigneeEmail }
}

function mapHistoryFromApi(items: HistoryRow[]): HistoryRow[] {
  return items.map((h) => ({
    ...h,
    occurredAt: parseDate(h.occurredAt) ?? new Date(),
    performedAt: parseDate(h.performedAt),
    externalCreatedAt: parseDate(h.externalCreatedAt),
    externalUpdatedAt: parseDate(h.externalUpdatedAt),
    lastSyncedAt: parseDate(h.lastSyncedAt),
    createdAt: parseDate(h.createdAt) ?? new Date(),
    summary: englishLegacyCopy(h.summary),
    detail: h.detail ? englishLegacyCopy(h.detail) : null,
  }))
}

function mapCommentsFromApi(items: CommentRow[]): CommentRow[] {
  return items.map((c) => ({
    ...c,
    createdAt: parseDate(c.createdAt) ?? new Date(),
    updatedAt: parseDate(c.updatedAt) ?? new Date(),
    externalCreatedAt: parseDate(c.externalCreatedAt) ?? new Date(),
    externalUpdatedAt: parseDate(c.externalUpdatedAt) ?? new Date(),
    lastSyncedAt: parseDate(c.lastSyncedAt) ?? new Date(),
    body: englishLegacyCopy(c.body),
  }))
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

function mapSyncKmToSuggestions(
  items: ApiKmRef[],
  ticket: TicketRow,
): KmSuggestion[] {
  const perimeter = ticket.perimeter?.toUpperCase() ?? ""
  const category = ticket.category?.toUpperCase() ?? ""

  const matched = items.filter((k) => {
    const p = k.perimeter.toUpperCase()
    const c = k.category.toUpperCase()
    if (perimeter && p === perimeter) return true
    if (category && c === category) return true
    return false
  })

  const pool = matched.length > 0 ? matched : items

  return pool.slice(0, 5).map((k, i) => ({
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
}

export async function loadAgentTicketDetailPage(ticketId: number): Promise<AgentTicketDetailPageData> {
  const [ticketRes, historyRes, commentsRes, kmRes] = await Promise.all([
    carepilotFetchSafe<ApiTicket>(`/api/tickets/${ticketId}`),
    carepilotFetchSafe<{ items: HistoryRow[]; total: number }>(`/api/tickets/${ticketId}/history`),
    carepilotFetchSafe<{ items: CommentRow[]; total: number }>(`/api/tickets/${ticketId}/comments`),
    carepilotFetchSafe<{ items: ApiKmRef[]; total: number }>("/api/km"),
  ])

  if (!ticketRes.ok) {
    if (ticketRes.error.toLowerCase().includes("not found")) {
      throw new TicketNotFoundError()
    }
    throw new Error(ticketRes.error)
  }

  const { ticket, assigneeName, assigneeEmail } = mapTicketFromApi(ticketRes.data)

  const history = historyRes.ok ? mapHistoryFromApi(historyRes.data.items) : []
  const comments = commentsRes.ok ? mapCommentsFromApi(commentsRes.data.items) : []

  const syncKm = kmRes.ok ? mapSyncKmToSuggestions(kmRes.data.items, ticket) : []

  const ai = await cpAgentGetTicketAiEnrichment(ticketId, ticket.category)
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
  }
}
