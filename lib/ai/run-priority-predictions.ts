import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  PRIORITY_MODEL_NAME,
  PRIORITY_MODEL_VERSION,
  PRIORITY_PREDICTION_ENABLED,
} from "@/lib/ai-phase"
import { getDb } from "@/lib/db"
import {
  cpAgentAiActionRecommendations,
  cpAgentAiEscalationPredictions,
  cpAgentAiPriorityPredictions,
  cpAgentAiSlaPredictions,
  cpAgentAiTransferPredictions,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

import { predictPriorityBatch, type PriorityPredictionResult } from "./priority-prediction"

export type PriorityPredictionStats = {
  totalPredictions: number
  highPriorityCount: number
  p1Count: number
  avgConfidencePct: number
  distribution: Record<string, number>
}

export type PriorityPredictionRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  priority: string
  predictedPriority: string
  confidenceScore: number
  probabilityDistribution: Record<string, number>
  modelName: string
  modelVersion: string
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

export async function getPriorityPredictionStats(): Promise<PriorityPredictionStats> {
  if (!PRIORITY_PREDICTION_ENABLED) {
    return { totalPredictions: 0, highPriorityCount: 0, p1Count: 0, avgConfidencePct: 0, distribution: {} }
  }

  const db = getDb()
  const [[totalRow], [highRow], [p1Row], [avgRow], distRows] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiPriorityPredictions),
    db
      .select({ c: count() })
      .from(cpAgentAiPriorityPredictions)
      .where(inArray(cpAgentAiPriorityPredictions.predictedPriority, ["P1", "P2"])),
    db
      .select({ c: count() })
      .from(cpAgentAiPriorityPredictions)
      .where(eq(cpAgentAiPriorityPredictions.predictedPriority, "P1")),
    db
      .select({
        avg: sql<number>`coalesce(avg(${cpAgentAiPriorityPredictions.confidenceScore}), 0)`,
      })
      .from(cpAgentAiPriorityPredictions),
    db
      .select({
        predictedPriority: cpAgentAiPriorityPredictions.predictedPriority,
        c: count(),
      })
      .from(cpAgentAiPriorityPredictions)
      .groupBy(cpAgentAiPriorityPredictions.predictedPriority),
  ])

  const distribution: Record<string, number> = {}
  for (const row of distRows) {
    distribution[row.predictedPriority] = Number(row.c)
  }

  return {
    totalPredictions: Number(totalRow?.c ?? 0),
    highPriorityCount: Number(highRow?.c ?? 0),
    p1Count: Number(p1Row?.c ?? 0),
    avgConfidencePct: Math.round(Number(avgRow?.avg ?? 0) * 100),
    distribution,
  }
}

export async function listPriorityPredictions(ticketIds?: number[]): Promise<PriorityPredictionRow[]> {
  const db = getDb()
  const scope =
    ticketIds && ticketIds.length > 0
      ? and(CARE_FILTER, inArray(cpAgentAiPriorityPredictions.ticketId, ticketIds))
      : CARE_FILTER
  return db
    .select({
      id: cpAgentAiPriorityPredictions.id,
      ticketId: cpAgentAiPriorityPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      predictedPriority: cpAgentAiPriorityPredictions.predictedPriority,
      confidenceScore: cpAgentAiPriorityPredictions.confidenceScore,
      probabilityDistribution: cpAgentAiPriorityPredictions.probabilityDistribution,
      modelName: cpAgentAiPriorityPredictions.modelName,
      modelVersion: cpAgentAiPriorityPredictions.modelVersion,
      createdAt: cpAgentAiPriorityPredictions.createdAt,
      updatedAt: cpAgentAiPriorityPredictions.updatedAt,
    })
    .from(cpAgentAiPriorityPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiPriorityPredictions.ticketId))
    .where(scope)
    .orderBy(desc(cpAgentAiPriorityPredictions.confidenceScore))
}

export async function getPriorityPredictionForTicket(ticketId: number): Promise<PriorityPredictionRow | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: cpAgentAiPriorityPredictions.id,
      ticketId: cpAgentAiPriorityPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      predictedPriority: cpAgentAiPriorityPredictions.predictedPriority,
      confidenceScore: cpAgentAiPriorityPredictions.confidenceScore,
      probabilityDistribution: cpAgentAiPriorityPredictions.probabilityDistribution,
      modelName: cpAgentAiPriorityPredictions.modelName,
      modelVersion: cpAgentAiPriorityPredictions.modelVersion,
      createdAt: cpAgentAiPriorityPredictions.createdAt,
      updatedAt: cpAgentAiPriorityPredictions.updatedAt,
    })
    .from(cpAgentAiPriorityPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiPriorityPredictions.ticketId))
    .where(and(eq(cpAgentAiPriorityPredictions.ticketId, ticketId), CARE_FILTER)!)
    .limit(1)

  return row ?? null
}

async function loadRoutingSignals(ticketIds: number[]) {
  const db = getDb()
  if (ticketIds.length === 0) {
    return new Map<
      number,
      { escalationRequired: boolean; transferRequired: boolean; recommendedAction: string; slaBreached: boolean }
    >()
  }

  const [escalations, transfers, actions, slaRows] = await Promise.all([
    db
      .select({
        ticketId: cpAgentAiEscalationPredictions.ticketId,
        predictedEscalationRequired: cpAgentAiEscalationPredictions.predictedEscalationRequired,
      })
      .from(cpAgentAiEscalationPredictions)
      .where(inArray(cpAgentAiEscalationPredictions.ticketId, ticketIds)),
    db
      .select({
        ticketId: cpAgentAiTransferPredictions.ticketId,
        predictedTransferRequired: cpAgentAiTransferPredictions.predictedTransferRequired,
      })
      .from(cpAgentAiTransferPredictions)
      .where(inArray(cpAgentAiTransferPredictions.ticketId, ticketIds)),
    db
      .select({
        ticketId: cpAgentAiActionRecommendations.ticketId,
        recommendedAction: cpAgentAiActionRecommendations.recommendedAction,
      })
      .from(cpAgentAiActionRecommendations)
      .where(inArray(cpAgentAiActionRecommendations.ticketId, ticketIds)),
    db
      .select({
        ticketId: cpAgentAiSlaPredictions.ticketId,
        predictedSlaBreach: cpAgentAiSlaPredictions.predictedSlaBreach,
      })
      .from(cpAgentAiSlaPredictions)
      .where(inArray(cpAgentAiSlaPredictions.ticketId, ticketIds)),
  ])

  const map = new Map<
    number,
    { escalationRequired: boolean; transferRequired: boolean; recommendedAction: string; slaBreached: boolean }
  >()
  for (const ticketId of ticketIds) {
    map.set(ticketId, {
      escalationRequired: false,
      transferRequired: false,
      recommendedAction: "RESOLVE_LOCALLY",
      slaBreached: false,
    })
  }
  for (const row of escalations) {
    map.get(row.ticketId)!.escalationRequired = row.predictedEscalationRequired
  }
  for (const row of transfers) {
    map.get(row.ticketId)!.transferRequired = row.predictedTransferRequired
  }
  for (const row of actions) {
    map.get(row.ticketId)!.recommendedAction = row.recommendedAction
  }
  for (const row of slaRows) {
    map.get(row.ticketId)!.slaBreached = row.predictedSlaBreach
  }
  return map
}

async function upsertPriorityPrediction(result: PriorityPredictionResult): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db
    .insert(cpAgentAiPriorityPredictions)
    .values({
      ticketId: result.ticketId,
      modelName: result.modelName,
      predictedPriority: result.predictedPriority,
      confidenceScore: result.confidenceScore,
      probabilityDistribution: result.probabilityDistribution,
      modelVersion: result.modelVersion,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiPriorityPredictions.ticketId,
      set: {
        modelName: result.modelName,
        predictedPriority: result.predictedPriority,
        confidenceScore: result.confidenceScore,
        probabilityDistribution: result.probabilityDistribution,
        modelVersion: result.modelVersion,
        updatedAt: now,
      },
    })
}

export type RunPriorityPredictionsResult = {
  ticketsProcessed: number
  predictionsWritten: number
  highPriorityCount: number
  p1Count: number
  avgConfidencePct: number
  modelVersion: string
  modelName: string
}

export async function runPriorityPredictions(opts?: {
  ticketIds?: number[]
}): Promise<RunPriorityPredictionsResult> {
  const db = getDb()

  const tickets = await db
    .select({
      id: cpAgentTickets.id,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
      slaDueAt: cpAgentTickets.slaDueAt,
      resolutionDate: cpAgentTickets.resolutionDate,
      externalCreatedAt: cpAgentTickets.externalCreatedAt,
      createdAt: cpAgentTickets.createdAt,
      updatedAt: cpAgentTickets.updatedAt,
      status: cpAgentTickets.status,
      storeType: cpAgentTickets.storeType,
      storeCode: cpAgentTickets.storeCode,
      storeRegion: cpAgentTickets.storeRegion,
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
      predictionsWritten: 0,
      highPriorityCount: 0,
      p1Count: 0,
      avgConfidencePct: 0,
      modelVersion: PRIORITY_MODEL_VERSION,
      modelName: PRIORITY_MODEL_NAME,
    }
  }

  const batchSize = 50
  let predictionsWritten = 0
  let highPriorityCount = 0
  let p1Count = 0
  let confidenceSum = 0

  for (let i = 0; i < tickets.length; i += batchSize) {
    const chunk = tickets.slice(i, i + batchSize)
    const ticketIds = chunk.map((ticket) => ticket.id)
    const routingSignals = await loadRoutingSignals(ticketIds)
    const predictions = await predictPriorityBatch(chunk, routingSignals)

    for (const prediction of predictions) {
      await upsertPriorityPrediction(prediction)
      predictionsWritten++
      if (prediction.predictedPriority === "P1" || prediction.predictedPriority === "P2") highPriorityCount++
      if (prediction.predictedPriority === "P1") p1Count++
      confidenceSum += prediction.confidenceScore
    }
  }

  return {
    ticketsProcessed: tickets.length,
    predictionsWritten,
    highPriorityCount,
    p1Count,
    avgConfidencePct: predictionsWritten
      ? Math.round((confidenceSum / predictionsWritten) * 100)
      : 0,
    modelVersion: PRIORITY_MODEL_VERSION,
    modelName: PRIORITY_MODEL_NAME,
  }
}
