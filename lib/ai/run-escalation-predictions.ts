import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  ESCALATION_MODEL_NAME,
  ESCALATION_MODEL_VERSION,
  ESCALATION_PREDICTION_ENABLED,
} from "@/lib/ai-phase"
import { getDb } from "@/lib/db"
import {
  cpAgentAiEscalationPredictions,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

import { predictEscalationBatch, type EscalationPredictionResult } from "./escalation-prediction"
import { calibrateEscalationPrediction } from "./escalation-calibration"

export type EscalationPredictionStats = {
  totalPredictions: number
  escalationCount: number
  avgConfidencePct: number
}

export type EscalationPredictionRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  priority: string
  predictedEscalationRequired: boolean
  confidenceScore: number
  probabilityScore: number
  predictionLabel: string
  modelName: string
  modelVersion: string
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

export async function getEscalationPredictionStats(): Promise<EscalationPredictionStats> {
  if (!ESCALATION_PREDICTION_ENABLED) {
    return { totalPredictions: 0, escalationCount: 0, avgConfidencePct: 0 }
  }

  const db = getDb()
  const [[totalRow], [escalateRow], [avgRow]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiEscalationPredictions),
    db
      .select({ c: count() })
      .from(cpAgentAiEscalationPredictions)
      .where(eq(cpAgentAiEscalationPredictions.predictedEscalationRequired, true)),
    db
      .select({
        avg: sql<number>`coalesce(avg(${cpAgentAiEscalationPredictions.confidenceScore}), 0)`,
      })
      .from(cpAgentAiEscalationPredictions),
  ])

  return {
    totalPredictions: Number(totalRow?.c ?? 0),
    escalationCount: Number(escalateRow?.c ?? 0),
    avgConfidencePct: Math.round(Number(avgRow?.avg ?? 0) * 100),
  }
}

export async function listEscalationPredictions(ticketIds?: number[]): Promise<EscalationPredictionRow[]> {
  const db = getDb()
  const scope =
    ticketIds && ticketIds.length > 0
      ? and(CARE_FILTER, inArray(cpAgentAiEscalationPredictions.ticketId, ticketIds))
      : CARE_FILTER
  const rows = await db
    .select({
      id: cpAgentAiEscalationPredictions.id,
      ticketId: cpAgentAiEscalationPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      predictedEscalationRequired: cpAgentAiEscalationPredictions.predictedEscalationRequired,
      confidenceScore: cpAgentAiEscalationPredictions.confidenceScore,
      probabilityScore: cpAgentAiEscalationPredictions.probabilityScore,
      predictionLabel: cpAgentAiEscalationPredictions.predictionLabel,
      modelName: cpAgentAiEscalationPredictions.modelName,
      modelVersion: cpAgentAiEscalationPredictions.modelVersion,
      createdAt: cpAgentAiEscalationPredictions.createdAt,
      updatedAt: cpAgentAiEscalationPredictions.updatedAt,
    })
    .from(cpAgentAiEscalationPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiEscalationPredictions.ticketId))
    .where(scope)
    .orderBy(desc(cpAgentAiEscalationPredictions.createdAt))

  return rows
}

export async function getEscalationPredictionForTicket(
  ticketId: number,
): Promise<EscalationPredictionRow | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: cpAgentAiEscalationPredictions.id,
      ticketId: cpAgentAiEscalationPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      predictedEscalationRequired: cpAgentAiEscalationPredictions.predictedEscalationRequired,
      confidenceScore: cpAgentAiEscalationPredictions.confidenceScore,
      probabilityScore: cpAgentAiEscalationPredictions.probabilityScore,
      predictionLabel: cpAgentAiEscalationPredictions.predictionLabel,
      modelName: cpAgentAiEscalationPredictions.modelName,
      modelVersion: cpAgentAiEscalationPredictions.modelVersion,
      createdAt: cpAgentAiEscalationPredictions.createdAt,
      updatedAt: cpAgentAiEscalationPredictions.updatedAt,
    })
    .from(cpAgentAiEscalationPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiEscalationPredictions.ticketId))
    .where(and(eq(cpAgentAiEscalationPredictions.ticketId, ticketId), CARE_FILTER)!)
    .limit(1)

  return row ?? null
}

async function upsertEscalationPrediction(result: EscalationPredictionResult): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db
    .insert(cpAgentAiEscalationPredictions)
    .values({
      ticketId: result.ticketId,
      modelName: result.modelName,
      predictedEscalationRequired: result.predictedEscalationRequired,
      confidenceScore: result.confidenceScore,
      probabilityScore: result.probabilityScore,
      predictionLabel: result.predictionLabel,
      modelVersion: result.modelVersion,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiEscalationPredictions.ticketId,
      set: {
        modelName: result.modelName,
        predictedEscalationRequired: result.predictedEscalationRequired,
        confidenceScore: result.confidenceScore,
        probabilityScore: result.probabilityScore,
        predictionLabel: result.predictionLabel,
        modelVersion: result.modelVersion,
        updatedAt: now,
      },
    })
}

export type RunEscalationPredictionsResult = {
  ticketsProcessed: number
  predictionsWritten: number
  escalationCount: number
  avgConfidencePct: number
  modelVersion: string
  modelName: string
}

/** Score synchronized CARE tickets and upsert into cp_agent.ai_escalation_predictions. */
export async function runEscalationPredictions(opts?: {
  ticketIds?: number[]
}): Promise<RunEscalationPredictionsResult> {
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
      escalationCount: 0,
      avgConfidencePct: 0,
      modelVersion: ESCALATION_MODEL_VERSION,
      modelName: ESCALATION_MODEL_NAME,
    }
  }

  const batchSize = 50
  let predictionsWritten = 0
  let escalationCount = 0
  let confidenceSum = 0

  for (let i = 0; i < tickets.length; i += batchSize) {
    const chunk = tickets.slice(i, i + batchSize)
    const ticketById = new Map(chunk.map((t) => [t.id, t]))
    const predictions = await predictEscalationBatch(chunk)

    for (const prediction of predictions) {
      const ticket = ticketById.get(prediction.ticketId)
      const calibrated = ticket
        ? calibrateEscalationPrediction(ticket, prediction)
        : prediction
      await upsertEscalationPrediction(calibrated)
      predictionsWritten++
      if (calibrated.predictedEscalationRequired) escalationCount++
      confidenceSum += calibrated.confidenceScore
    }
  }

  return {
    ticketsProcessed: tickets.length,
    predictionsWritten,
    escalationCount,
    avgConfidencePct: predictionsWritten
      ? Math.round((confidenceSum / predictionsWritten) * 100)
      : 0,
    modelVersion: ESCALATION_MODEL_VERSION,
    modelName: ESCALATION_MODEL_NAME,
  }
}
