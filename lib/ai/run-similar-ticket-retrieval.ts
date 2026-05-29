import { alias } from "drizzle-orm/pg-core"
import { and, count, desc, eq, inArray, ne, not, sql } from "drizzle-orm"

import {
  SIMILAR_TICKET_MODEL_NAME,
  SIMILAR_TICKET_MODEL_VERSION,
  SIMILAR_TICKET_PREVIEW_ENABLED,
  SIMILAR_TICKET_RETRIEVAL_RUN_ENABLED,
} from "@/lib/ai-phase"
import { KM_TITLE_BY_CODE } from "@/lib/care-operational/similar-ticket-preview-seed"
import { getDb } from "@/lib/db"
import {
  cpAgentAiKmRecommendations,
  cpAgentAiSimilarTicketResults,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

import {
  recommendSimilarTicketsBatch,
  type SimilarTicketCorpusRecord,
  type SimilarTicketResult,
} from "./similar-ticket-retrieval"

export type SimilarTicketStats = {
  totalResults: number
  ticketsWithResults: number
  avgSimilarityPct: number
}

export type SimilarTicketRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  similarTicketId: number
  similarCareId: string
  similarTitle: string
  similarStoreCode: string | null
  similarStoreName: string | null
  similarPerimeter: string | null
  similarityScore: number
  retrievalMethod: string
  rankPosition: number
  linkedResolution: string | null
  linkedAction: string | null
  linkedKmId: string | null
  linkedKmTitle: string | null
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")
const RESOLVED_STATUSES = ["Resolved", "Closed", "RESOLVED", "CLOSED", "resolved", "closed"]
const similarTicket = alias(cpAgentTickets, "similar_ticket")

type SimilarTicketDbRow = Omit<SimilarTicketRow, "linkedKmTitle">

function enrichSimilarTicketRows(rows: SimilarTicketDbRow[]): SimilarTicketRow[] {
  return rows.map((row) => ({
    ...row,
    linkedKmTitle: row.linkedKmId ? (KM_TITLE_BY_CODE.get(row.linkedKmId) ?? row.linkedKmId) : null,
  }))
}

export async function getSimilarTicketStats(): Promise<SimilarTicketStats> {
  if (!SIMILAR_TICKET_PREVIEW_ENABLED) {
    return { totalResults: 0, ticketsWithResults: 0, avgSimilarityPct: 0 }
  }
  const db = getDb()
  const [[totalRow], [ticketRow], [avgRow]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiSimilarTicketResults),
    db
      .select({ c: sql<number>`count(distinct ${cpAgentAiSimilarTicketResults.ticketId})` })
      .from(cpAgentAiSimilarTicketResults),
    db
      .select({ avg: sql<number>`coalesce(avg(${cpAgentAiSimilarTicketResults.similarityScore}), 0)` })
      .from(cpAgentAiSimilarTicketResults),
  ])
  return {
    totalResults: Number(totalRow?.c ?? 0),
    ticketsWithResults: Number(ticketRow?.c ?? 0),
    avgSimilarityPct: Math.round(Number(avgRow?.avg ?? 0) * 100),
  }
}

export async function listSimilarTicketResults(limit = 200): Promise<SimilarTicketRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: cpAgentAiSimilarTicketResults.id,
      ticketId: cpAgentAiSimilarTicketResults.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      similarTicketId: cpAgentAiSimilarTicketResults.similarTicketId,
      similarCareId: similarTicket.careId,
      similarTitle: similarTicket.title,
      similarStoreCode: similarTicket.storeCode,
      similarStoreName: similarTicket.storeName,
      similarPerimeter: similarTicket.perimeter,
      similarityScore: cpAgentAiSimilarTicketResults.similarityScore,
      retrievalMethod: cpAgentAiSimilarTicketResults.retrievalMethod,
      rankPosition: cpAgentAiSimilarTicketResults.rankPosition,
      linkedResolution: cpAgentAiSimilarTicketResults.linkedResolution,
      linkedAction: cpAgentAiSimilarTicketResults.linkedAction,
      linkedKmId: cpAgentAiSimilarTicketResults.linkedKmId,
      createdAt: cpAgentAiSimilarTicketResults.createdAt,
      updatedAt: cpAgentAiSimilarTicketResults.updatedAt,
    })
    .from(cpAgentAiSimilarTicketResults)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiSimilarTicketResults.ticketId))
    .innerJoin(similarTicket, eq(similarTicket.id, cpAgentAiSimilarTicketResults.similarTicketId))
    .where(and(CARE_FILTER, eq(cpAgentAiSimilarTicketResults.rankPosition, 1))!)
    .orderBy(desc(cpAgentAiSimilarTicketResults.similarityScore))
    .limit(limit)

  return enrichSimilarTicketRows(rows)
}

export async function getSimilarTicketsForTicket(ticketId: number): Promise<SimilarTicketRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: cpAgentAiSimilarTicketResults.id,
      ticketId: cpAgentAiSimilarTicketResults.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      similarTicketId: cpAgentAiSimilarTicketResults.similarTicketId,
      similarCareId: similarTicket.careId,
      similarTitle: similarTicket.title,
      similarStoreCode: similarTicket.storeCode,
      similarStoreName: similarTicket.storeName,
      similarPerimeter: similarTicket.perimeter,
      similarityScore: cpAgentAiSimilarTicketResults.similarityScore,
      retrievalMethod: cpAgentAiSimilarTicketResults.retrievalMethod,
      rankPosition: cpAgentAiSimilarTicketResults.rankPosition,
      linkedResolution: cpAgentAiSimilarTicketResults.linkedResolution,
      linkedAction: cpAgentAiSimilarTicketResults.linkedAction,
      linkedKmId: cpAgentAiSimilarTicketResults.linkedKmId,
      createdAt: cpAgentAiSimilarTicketResults.createdAt,
      updatedAt: cpAgentAiSimilarTicketResults.updatedAt,
    })
    .from(cpAgentAiSimilarTicketResults)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiSimilarTicketResults.ticketId))
    .innerJoin(similarTicket, eq(similarTicket.id, cpAgentAiSimilarTicketResults.similarTicketId))
    .where(and(eq(cpAgentAiSimilarTicketResults.ticketId, ticketId), CARE_FILTER)!)
    .orderBy(cpAgentAiSimilarTicketResults.rankPosition)

  return enrichSimilarTicketRows(rows)
}

async function loadSimilarTicketCorpus(excludeTicketId?: number): Promise<SimilarTicketCorpusRecord[]> {
  const db = getDb()
  const rows = await db
    .select({
      ticket_id: cpAgentTickets.id,
      care_id: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
      ai_recommended_action: cpAgentTickets.aiRecommendedAction,
      linked_resolution: cpAgentTickets.aiReason,
      linked_km_id: cpAgentAiKmRecommendations.kmId,
    })
    .from(cpAgentTickets)
    .leftJoin(
      cpAgentAiKmRecommendations,
      and(eq(cpAgentAiKmRecommendations.ticketId, cpAgentTickets.id), eq(cpAgentAiKmRecommendations.rank, 1)),
    )
    .where(
      and(
        CARE_FILTER,
        inArray(cpAgentTickets.status, RESOLVED_STATUSES),
        excludeTicketId ? ne(cpAgentTickets.id, excludeTicketId) : undefined,
      ),
    )

  return rows.map((row) => ({
    ticket_id: row.ticket_id,
    care_id: row.care_id,
    title: row.title,
    description: row.description,
    perimeter: row.perimeter,
    category: row.category,
    ai_recommended_action: row.ai_recommended_action,
    linked_resolution: row.linked_resolution,
    linked_km_id: row.linked_km_id,
  }))
}

async function replaceTicketResults(ticketId: number, matches: SimilarTicketResult[]): Promise<void> {
  const db = getDb()
  const now = new Date()
  await db.delete(cpAgentAiSimilarTicketResults).where(eq(cpAgentAiSimilarTicketResults.ticketId, ticketId))
  if (matches.length === 0) return
  await db.insert(cpAgentAiSimilarTicketResults).values(
    matches.map((match) => ({
      ticketId: match.ticketId,
      similarTicketId: match.similarTicketId,
      similarityScore: match.similarityScore,
      retrievalMethod: match.retrievalMethod,
      rankPosition: match.rank,
      linkedResolution: match.linkedResolution,
      linkedAction: match.linkedAction,
      linkedKmId: match.linkedKmId,
      updatedAt: now,
    })),
  )
}

export type RunSimilarTicketRetrievalResult = {
  ticketsProcessed: number
  resultsWritten: number
  ticketsWithResults: number
  avgSimilarityPct: number
  modelVersion: string
  modelName: string
}

export async function runSimilarTicketRetrieval(opts?: {
  ticketIds?: number[]
}): Promise<RunSimilarTicketRetrievalResult> {
  if (!SIMILAR_TICKET_RETRIEVAL_RUN_ENABLED) {
    throw new Error(
      "Live similar ticket retrieval is paused (experimental benchmark). Seed preview data with db:seed:similar-preview instead.",
    )
  }

  const db = getDb()
  const tickets = await db
    .select({
      id: cpAgentTickets.id,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
      aiRecommendedAction: cpAgentTickets.aiRecommendedAction,
    })
    .from(cpAgentTickets)
    .where(
      opts?.ticketIds?.length
        ? and(CARE_FILTER, inArray(cpAgentTickets.id, opts.ticketIds))!
        : and(CARE_FILTER, not(inArray(cpAgentTickets.status, RESOLVED_STATUSES)))!,
    )

  if (tickets.length === 0) {
    return {
      ticketsProcessed: 0,
      resultsWritten: 0,
      ticketsWithResults: 0,
      avgSimilarityPct: 0,
      modelVersion: SIMILAR_TICKET_MODEL_VERSION,
      modelName: SIMILAR_TICKET_MODEL_NAME,
    }
  }

  let resultsWritten = 0
  let similaritySum = 0
  let ticketsWithResults = 0

  for (const ticket of tickets) {
    const corpus = await loadSimilarTicketCorpus(ticket.id)
    if (corpus.length === 0) continue
    const matches = await recommendSimilarTicketsBatch([ticket], corpus)
    await replaceTicketResults(ticket.id, matches)
    if (matches.length > 0) ticketsWithResults++
    for (const match of matches) {
      resultsWritten++
      similaritySum += match.similarityScore
    }
  }

  return {
    ticketsProcessed: tickets.length,
    resultsWritten,
    ticketsWithResults,
    avgSimilarityPct: resultsWritten ? Math.round((similaritySum / resultsWritten) * 100) : 0,
    modelVersion: SIMILAR_TICKET_MODEL_VERSION,
    modelName: SIMILAR_TICKET_MODEL_NAME,
  }
}
