import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  KM_MODEL_NAME,
  KM_MODEL_VERSION,
  KM_RECOMMENDATION_ENABLED,
} from "@/lib/ai-phase"
import { getDb } from "@/lib/db"
import {
  cpAgentAiKmRecommendations,
  cpAgentKmReferences,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

import {
  mapKmCorpusRecord,
  recommendKmBatch,
  type KmCorpusRecord,
  type KmRecommendationResult,
} from "./km-recommendation"

export type KmRecommendationStats = {
  totalRecommendations: number
  ticketsWithRecommendations: number
  avgSimilarityPct: number
  highConfidenceCount: number
}

export type KmRecommendationRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  kmId: string
  kmTitle: string
  methodName: string
  similarityScore: number
  rank: number
  confidenceLevel: string
  reason: string | null
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

export async function getKmRecommendationStats(): Promise<KmRecommendationStats> {
  if (!KM_RECOMMENDATION_ENABLED) {
    return { totalRecommendations: 0, ticketsWithRecommendations: 0, avgSimilarityPct: 0, highConfidenceCount: 0 }
  }

  const db = getDb()
  const [[totalRow], [ticketRow], [avgRow], [highRow]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiKmRecommendations),
    db
      .select({ c: sql<number>`count(distinct ${cpAgentAiKmRecommendations.ticketId})` })
      .from(cpAgentAiKmRecommendations),
    db
      .select({ avg: sql<number>`coalesce(avg(${cpAgentAiKmRecommendations.similarityScore}), 0)` })
      .from(cpAgentAiKmRecommendations),
    db
      .select({ c: count() })
      .from(cpAgentAiKmRecommendations)
      .where(eq(cpAgentAiKmRecommendations.confidenceLevel, "HIGH")),
  ])

  return {
    totalRecommendations: Number(totalRow?.c ?? 0),
    ticketsWithRecommendations: Number(ticketRow?.c ?? 0),
    avgSimilarityPct: Math.round(Number(avgRow?.avg ?? 0) * 100),
    highConfidenceCount: Number(highRow?.c ?? 0),
  }
}

export async function listKmRecommendations(limit = 200, ticketIds?: number[]): Promise<KmRecommendationRow[]> {
  const db = getDb()
  const scopeClauses = [CARE_FILTER, eq(cpAgentAiKmRecommendations.rank, 1)] as const
  const scope =
    ticketIds && ticketIds.length > 0
      ? and(...scopeClauses, inArray(cpAgentAiKmRecommendations.ticketId, ticketIds))
      : and(...scopeClauses)
  return db
    .select({
      id: cpAgentAiKmRecommendations.id,
      ticketId: cpAgentAiKmRecommendations.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      kmId: cpAgentAiKmRecommendations.kmId,
      kmTitle: cpAgentAiKmRecommendations.kmTitle,
      methodName: cpAgentAiKmRecommendations.methodName,
      similarityScore: cpAgentAiKmRecommendations.similarityScore,
      rank: cpAgentAiKmRecommendations.rank,
      confidenceLevel: cpAgentAiKmRecommendations.confidenceLevel,
      reason: cpAgentAiKmRecommendations.reason,
      createdAt: cpAgentAiKmRecommendations.createdAt,
      updatedAt: cpAgentAiKmRecommendations.updatedAt,
    })
    .from(cpAgentAiKmRecommendations)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiKmRecommendations.ticketId))
    .where(scope!)
    .orderBy(desc(cpAgentAiKmRecommendations.similarityScore))
    .limit(limit)
}

export async function getKmRecommendationsForTicket(ticketId: number): Promise<KmRecommendationRow[]> {
  const db = getDb()
  return db
    .select({
      id: cpAgentAiKmRecommendations.id,
      ticketId: cpAgentAiKmRecommendations.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      kmId: cpAgentAiKmRecommendations.kmId,
      kmTitle: cpAgentAiKmRecommendations.kmTitle,
      methodName: cpAgentAiKmRecommendations.methodName,
      similarityScore: cpAgentAiKmRecommendations.similarityScore,
      rank: cpAgentAiKmRecommendations.rank,
      confidenceLevel: cpAgentAiKmRecommendations.confidenceLevel,
      reason: cpAgentAiKmRecommendations.reason,
      createdAt: cpAgentAiKmRecommendations.createdAt,
      updatedAt: cpAgentAiKmRecommendations.updatedAt,
    })
    .from(cpAgentAiKmRecommendations)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiKmRecommendations.ticketId))
    .where(and(eq(cpAgentAiKmRecommendations.ticketId, ticketId), CARE_FILTER)!)
    .orderBy(cpAgentAiKmRecommendations.rank)
}

async function loadKmCorpus(): Promise<KmCorpusRecord[]> {
  const db = getDb()
  const rows = await db
    .select({
      code: cpAgentKmReferences.code,
      title: cpAgentKmReferences.title,
      perimeter: cpAgentKmReferences.perimeter,
      category: cpAgentKmReferences.category,
      keywords: cpAgentKmReferences.keywords,
      summary: cpAgentKmReferences.summary,
      procedureSteps: cpAgentKmReferences.procedureSteps,
    })
    .from(cpAgentKmReferences)
    .where(eq(cpAgentKmReferences.status, "active"))

  return rows
}

async function replaceTicketRecommendations(ticketId: number, recommendations: KmRecommendationResult[]): Promise<void> {
  const db = getDb()
  const now = new Date()
  await db.delete(cpAgentAiKmRecommendations).where(eq(cpAgentAiKmRecommendations.ticketId, ticketId))
  if (recommendations.length === 0) return
  await db.insert(cpAgentAiKmRecommendations).values(
    recommendations.map((rec) => ({
      ticketId: rec.ticketId,
      kmId: rec.kmId,
      kmTitle: rec.kmTitle,
      methodName: rec.methodName,
      similarityScore: rec.similarityScore,
      rank: rec.rank,
      confidenceLevel: rec.confidenceLevel,
      reason: rec.reason,
      updatedAt: now,
    })),
  )
}

export type RunKmRecommendationsResult = {
  ticketsProcessed: number
  recommendationsWritten: number
  ticketsWithRecommendations: number
  avgSimilarityPct: number
  highConfidenceCount: number
  modelVersion: string
  modelName: string
}

export async function runKmRecommendations(opts?: { ticketIds?: number[] }): Promise<RunKmRecommendationsResult> {
  if (!KM_RECOMMENDATION_ENABLED) {
    return {
      ticketsProcessed: 0,
      recommendationsWritten: 0,
      ticketsWithRecommendations: 0,
      avgSimilarityPct: 0,
      highConfidenceCount: 0,
      modelVersion: KM_MODEL_VERSION,
      modelName: KM_MODEL_NAME,
    }
  }

  const db = getDb()
  const kmCorpus = await loadKmCorpus()
  if (kmCorpus.length === 0) {
    throw new Error("No KM corpus available in cp_agent.km_references. Sync CARE KM data first.")
  }

  const tickets = await db
    .select({
      id: cpAgentTickets.id,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
    })
    .from(cpAgentTickets)
    .where(
      opts?.ticketIds?.length
        ? and(CARE_FILTER, inArray(cpAgentTickets.id, opts.ticketIds))!
        : CARE_FILTER,
    )

  if (tickets.length === 0) {
    return {
      ticketsProcessed: 0,
      recommendationsWritten: 0,
      ticketsWithRecommendations: 0,
      avgSimilarityPct: 0,
      highConfidenceCount: 0,
      modelVersion: KM_MODEL_VERSION,
      modelName: KM_MODEL_NAME,
    }
  }

  const batchSize = 25
  let recommendationsWritten = 0
  let highConfidenceCount = 0
  let similaritySum = 0
  let ticketsWithRecommendations = 0

  for (let i = 0; i < tickets.length; i += batchSize) {
    const chunk = tickets.slice(i, i + batchSize)
    const recommendations = await recommendKmBatch(chunk, kmCorpus)
    const byTicket = new Map<number, KmRecommendationResult[]>()
    for (const rec of recommendations) {
      const bucket = byTicket.get(rec.ticketId) ?? []
      bucket.push(rec)
      byTicket.set(rec.ticketId, bucket)
    }

    for (const ticket of chunk) {
      const ticketRecs = byTicket.get(ticket.id) ?? []
      await replaceTicketRecommendations(ticket.id, ticketRecs)
      if (ticketRecs.length > 0) ticketsWithRecommendations++
      for (const rec of ticketRecs) {
        recommendationsWritten++
        similaritySum += rec.similarityScore
        if (rec.confidenceLevel === "HIGH") highConfidenceCount++
      }
    }
  }

  return {
    ticketsProcessed: tickets.length,
    recommendationsWritten,
    ticketsWithRecommendations,
    avgSimilarityPct: recommendationsWritten
      ? Math.round((similaritySum / recommendationsWritten) * 100)
      : 0,
    highConfidenceCount,
    modelVersion: KM_MODEL_VERSION,
    modelName: KM_MODEL_NAME,
  }
}
