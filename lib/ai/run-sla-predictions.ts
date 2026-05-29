import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  SLA_MODEL_NAME,
  SLA_MODEL_VERSION,
  SLA_PREDICTION_ENABLED,
} from "@/lib/ai-phase"
import { getDb } from "@/lib/db"
import {
  cpAgentAiActionRecommendations,
  cpAgentAiEscalationPredictions,
  cpAgentAiSlaPredictions,
  cpAgentAiTransferPredictions,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

import { predictSlaBatch, type SlaPredictionResult } from "./sla-prediction"

export type SlaPredictionStats = {
  totalPredictions: number
  highRiskCount: number
  breachCount: number
  avgConfidencePct: number
}

export type SlaPredictionRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  priority: string
  predictedSlaBreach: boolean
  probabilityScore: number
  confidenceScore: number
  riskLevel: string
  modelName: string
  modelVersion: string
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

export async function getSlaPredictionStats(): Promise<SlaPredictionStats> {
  if (!SLA_PREDICTION_ENABLED) {
    return { totalPredictions: 0, highRiskCount: 0, breachCount: 0, avgConfidencePct: 0 }
  }

  const db = getDb()
  const [[totalRow], [highRow], [breachRow], [avgRow]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiSlaPredictions),
    db
      .select({ c: count() })
      .from(cpAgentAiSlaPredictions)
      .where(eq(cpAgentAiSlaPredictions.riskLevel, "HIGH")),
    db
      .select({ c: count() })
      .from(cpAgentAiSlaPredictions)
      .where(eq(cpAgentAiSlaPredictions.predictedSlaBreach, true)),
    db
      .select({
        avg: sql<number>`coalesce(avg(${cpAgentAiSlaPredictions.confidenceScore}), 0)`,
      })
      .from(cpAgentAiSlaPredictions),
  ])

  return {
    totalPredictions: Number(totalRow?.c ?? 0),
    highRiskCount: Number(highRow?.c ?? 0),
    breachCount: Number(breachRow?.c ?? 0),
    avgConfidencePct: Math.round(Number(avgRow?.avg ?? 0) * 100),
  }
}

export async function listSlaPredictions(ticketIds?: number[]): Promise<SlaPredictionRow[]> {
  const db = getDb()
  const scope =
    ticketIds && ticketIds.length > 0
      ? and(CARE_FILTER, inArray(cpAgentAiSlaPredictions.ticketId, ticketIds))
      : CARE_FILTER
  return db
    .select({
      id: cpAgentAiSlaPredictions.id,
      ticketId: cpAgentAiSlaPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      predictedSlaBreach: cpAgentAiSlaPredictions.predictedSlaBreach,
      probabilityScore: cpAgentAiSlaPredictions.probabilityScore,
      confidenceScore: cpAgentAiSlaPredictions.confidenceScore,
      riskLevel: cpAgentAiSlaPredictions.riskLevel,
      modelName: cpAgentAiSlaPredictions.modelName,
      modelVersion: cpAgentAiSlaPredictions.modelVersion,
      createdAt: cpAgentAiSlaPredictions.createdAt,
      updatedAt: cpAgentAiSlaPredictions.updatedAt,
    })
    .from(cpAgentAiSlaPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiSlaPredictions.ticketId))
    .where(scope)
    .orderBy(desc(cpAgentAiSlaPredictions.probabilityScore))
}

export async function getSlaPredictionForTicket(ticketId: number): Promise<SlaPredictionRow | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: cpAgentAiSlaPredictions.id,
      ticketId: cpAgentAiSlaPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      predictedSlaBreach: cpAgentAiSlaPredictions.predictedSlaBreach,
      probabilityScore: cpAgentAiSlaPredictions.probabilityScore,
      confidenceScore: cpAgentAiSlaPredictions.confidenceScore,
      riskLevel: cpAgentAiSlaPredictions.riskLevel,
      modelName: cpAgentAiSlaPredictions.modelName,
      modelVersion: cpAgentAiSlaPredictions.modelVersion,
      createdAt: cpAgentAiSlaPredictions.createdAt,
      updatedAt: cpAgentAiSlaPredictions.updatedAt,
    })
    .from(cpAgentAiSlaPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiSlaPredictions.ticketId))
    .where(and(eq(cpAgentAiSlaPredictions.ticketId, ticketId), CARE_FILTER)!)
    .limit(1)

  return row ?? null
}

async function loadRoutingSignals(ticketIds: number[]) {
  const db = getDb()
  if (ticketIds.length === 0) {
    return new Map<number, { escalationRequired: boolean; transferRequired: boolean; recommendedAction: string }>()
  }

  const [escalations, transfers, actions] = await Promise.all([
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
  ])

  const map = new Map<number, { escalationRequired: boolean; transferRequired: boolean; recommendedAction: string }>()
  for (const ticketId of ticketIds) {
    map.set(ticketId, {
      escalationRequired: false,
      transferRequired: false,
      recommendedAction: "RESOLVE_LOCALLY",
    })
  }
  for (const row of escalations) {
    const current = map.get(row.ticketId)!
    current.escalationRequired = row.predictedEscalationRequired
  }
  for (const row of transfers) {
    const current = map.get(row.ticketId)!
    current.transferRequired = row.predictedTransferRequired
  }
  for (const row of actions) {
    const current = map.get(row.ticketId)!
    current.recommendedAction = row.recommendedAction
  }
  return map
}

async function upsertSlaPrediction(result: SlaPredictionResult): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db
    .insert(cpAgentAiSlaPredictions)
    .values({
      ticketId: result.ticketId,
      modelName: result.modelName,
      predictedSlaBreach: result.predictedSlaBreach,
      probabilityScore: result.probabilityScore,
      confidenceScore: result.confidenceScore,
      riskLevel: result.riskLevel,
      modelVersion: result.modelVersion,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiSlaPredictions.ticketId,
      set: {
        modelName: result.modelName,
        predictedSlaBreach: result.predictedSlaBreach,
        probabilityScore: result.probabilityScore,
        confidenceScore: result.confidenceScore,
        riskLevel: result.riskLevel,
        modelVersion: result.modelVersion,
        updatedAt: now,
      },
    })
}

export type RunSlaPredictionsResult = {
  ticketsProcessed: number
  predictionsWritten: number
  breachCount: number
  highRiskCount: number
  avgConfidencePct: number
  modelVersion: string
  modelName: string
}

export async function runSlaPredictions(opts?: {
  ticketIds?: number[]
}): Promise<RunSlaPredictionsResult> {
  const db = getDb()

  const tickets = await db
    .select({
      id: cpAgentTickets.id,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      category: cpAgentTickets.category,
      slaDueAt: cpAgentTickets.slaDueAt,
      resolutionDate: cpAgentTickets.resolutionDate,
      externalCreatedAt: cpAgentTickets.externalCreatedAt,
      createdAt: cpAgentTickets.createdAt,
      status: cpAgentTickets.status,
      updatedAt: cpAgentTickets.updatedAt,
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
      breachCount: 0,
      highRiskCount: 0,
      avgConfidencePct: 0,
      modelVersion: SLA_MODEL_VERSION,
      modelName: SLA_MODEL_NAME,
    }
  }

  const batchSize = 50
  let predictionsWritten = 0
  let breachCount = 0
  let highRiskCount = 0
  let confidenceSum = 0

  for (let i = 0; i < tickets.length; i += batchSize) {
    const chunk = tickets.slice(i, i + batchSize)
    const ticketIds = chunk.map((ticket) => ticket.id)
    const routingSignals = await loadRoutingSignals(ticketIds)
    const predictions = await predictSlaBatch(chunk, routingSignals)

    for (const prediction of predictions) {
      await upsertSlaPrediction(prediction)
      predictionsWritten++
      if (prediction.predictedSlaBreach) breachCount++
      if (prediction.riskLevel === "HIGH") highRiskCount++
      confidenceSum += prediction.confidenceScore
    }
  }

  return {
    ticketsProcessed: tickets.length,
    predictionsWritten,
    breachCount,
    highRiskCount,
    avgConfidencePct: predictionsWritten
      ? Math.round((confidenceSum / predictionsWritten) * 100)
      : 0,
    modelVersion: SLA_MODEL_VERSION,
    modelName: SLA_MODEL_NAME,
  }
}
