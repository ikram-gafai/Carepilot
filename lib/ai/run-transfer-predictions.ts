import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  TRANSFER_MODEL_NAME,
  TRANSFER_MODEL_VERSION,
  TRANSFER_PREDICTION_ENABLED,
} from "@/lib/ai-phase"
import { getDb } from "@/lib/db"
import { cpAgentAiTransferPredictions, cpAgentTickets } from "@/lib/db/schema/cp-agent"

import { predictTransferBatch, type TransferPredictionResult } from "./transfer-prediction"
import {
  deriveTransferReason,
  deriveTransferTargetPerimeter,
  formatTransferRecommendation,
} from "./transfer-reason"

export type TransferPredictionStats = {
  totalPredictions: number
  transferCount: number
  avgConfidencePct: number
}

export type TransferPredictionRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  description: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  category: string | null
  priority: string
  predictedTransferRequired: boolean
  confidenceScore: number
  probabilityScore: number
  predictionLabel: string
  targetPerimeter: string
  recommendation: string
  reason: string
  modelName: string
  modelVersion: string
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

function enrichTransferRow(
  row: Omit<
    TransferPredictionRow,
    "targetPerimeter" | "recommendation" | "reason" | "description" | "category"
  > & {
    description?: string
    category?: string | null
  },
): TransferPredictionRow {
  const description = row.description ?? ""
  const category = row.category ?? null
  const targetPerimeter = deriveTransferTargetPerimeter({
    title: row.title,
    description,
    perimeter: row.perimeter,
    category,
  })
  const recommendation = formatTransferRecommendation(row.predictedTransferRequired, targetPerimeter)
  const reason = row.predictedTransferRequired
    ? deriveTransferReason({
        title: row.title,
        description,
        perimeter: row.perimeter,
        category,
        targetPerimeter,
      })
    : "Ticket can remain on current perimeter"

  return {
    ...row,
    description,
    category,
    targetPerimeter,
    recommendation,
    reason,
  }
}

export async function getTransferPredictionStats(): Promise<TransferPredictionStats> {
  if (!TRANSFER_PREDICTION_ENABLED) {
    return { totalPredictions: 0, transferCount: 0, avgConfidencePct: 0 }
  }

  const db = getDb()
  const [[totalRow], [transferRow], [avgRow]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiTransferPredictions),
    db
      .select({ c: count() })
      .from(cpAgentAiTransferPredictions)
      .where(eq(cpAgentAiTransferPredictions.predictedTransferRequired, true)),
    db
      .select({
        avg: sql<number>`coalesce(avg(${cpAgentAiTransferPredictions.confidenceScore}), 0)`,
      })
      .from(cpAgentAiTransferPredictions),
  ])

  return {
    totalPredictions: Number(totalRow?.c ?? 0),
    transferCount: Number(transferRow?.c ?? 0),
    avgConfidencePct: Math.round(Number(avgRow?.avg ?? 0) * 100),
  }
}

export async function listTransferPredictions(ticketIds?: number[]): Promise<TransferPredictionRow[]> {
  const db = getDb()
  const scope =
    ticketIds && ticketIds.length > 0
      ? and(CARE_FILTER, inArray(cpAgentAiTransferPredictions.ticketId, ticketIds))
      : CARE_FILTER
  const rows = await db
    .select({
      id: cpAgentAiTransferPredictions.id,
      ticketId: cpAgentAiTransferPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
      priority: cpAgentTickets.priority,
      predictedTransferRequired: cpAgentAiTransferPredictions.predictedTransferRequired,
      confidenceScore: cpAgentAiTransferPredictions.confidenceScore,
      probabilityScore: cpAgentAiTransferPredictions.probabilityScore,
      predictionLabel: cpAgentAiTransferPredictions.predictionLabel,
      modelName: cpAgentAiTransferPredictions.modelName,
      modelVersion: cpAgentAiTransferPredictions.modelVersion,
      createdAt: cpAgentAiTransferPredictions.createdAt,
      updatedAt: cpAgentAiTransferPredictions.updatedAt,
    })
    .from(cpAgentAiTransferPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiTransferPredictions.ticketId))
    .where(scope)
    .orderBy(desc(cpAgentAiTransferPredictions.createdAt))

  return rows.map((row) => enrichTransferRow(row))
}

export async function getTransferPredictionForTicket(
  ticketId: number,
): Promise<TransferPredictionRow | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: cpAgentAiTransferPredictions.id,
      ticketId: cpAgentAiTransferPredictions.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      category: cpAgentTickets.category,
      priority: cpAgentTickets.priority,
      predictedTransferRequired: cpAgentAiTransferPredictions.predictedTransferRequired,
      confidenceScore: cpAgentAiTransferPredictions.confidenceScore,
      probabilityScore: cpAgentAiTransferPredictions.probabilityScore,
      predictionLabel: cpAgentAiTransferPredictions.predictionLabel,
      modelName: cpAgentAiTransferPredictions.modelName,
      modelVersion: cpAgentAiTransferPredictions.modelVersion,
      createdAt: cpAgentAiTransferPredictions.createdAt,
      updatedAt: cpAgentAiTransferPredictions.updatedAt,
    })
    .from(cpAgentAiTransferPredictions)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiTransferPredictions.ticketId))
    .where(and(eq(cpAgentAiTransferPredictions.ticketId, ticketId), CARE_FILTER)!)
    .limit(1)

  return row ? enrichTransferRow(row) : null
}

async function upsertTransferPrediction(result: TransferPredictionResult): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db
    .insert(cpAgentAiTransferPredictions)
    .values({
      ticketId: result.ticketId,
      modelName: result.modelName,
      predictedTransferRequired: result.predictedTransferRequired,
      confidenceScore: result.confidenceScore,
      probabilityScore: result.probabilityScore,
      predictionLabel: result.predictionLabel,
      modelVersion: result.modelVersion,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiTransferPredictions.ticketId,
      set: {
        modelName: result.modelName,
        predictedTransferRequired: result.predictedTransferRequired,
        confidenceScore: result.confidenceScore,
        probabilityScore: result.probabilityScore,
        predictionLabel: result.predictionLabel,
        modelVersion: result.modelVersion,
        updatedAt: now,
      },
    })
}

export type RunTransferPredictionsResult = {
  ticketsProcessed: number
  predictionsWritten: number
  transferCount: number
  avgConfidencePct: number
  modelVersion: string
  modelName: string
}

/** Score synchronized CARE tickets and upsert into cp_agent.ai_transfer_predictions. */
export async function runTransferPredictions(opts?: {
  ticketIds?: number[]
}): Promise<RunTransferPredictionsResult> {
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
      transferCount: 0,
      avgConfidencePct: 0,
      modelVersion: TRANSFER_MODEL_VERSION,
      modelName: TRANSFER_MODEL_NAME,
    }
  }

  const batchSize = 50
  let predictionsWritten = 0
  let transferCount = 0
  let confidenceSum = 0

  for (let i = 0; i < tickets.length; i += batchSize) {
    const chunk = tickets.slice(i, i + batchSize)
    const predictions = await predictTransferBatch(chunk)

    for (const prediction of predictions) {
      await upsertTransferPrediction(prediction)
      predictionsWritten++
      if (prediction.predictedTransferRequired) transferCount++
      confidenceSum += prediction.confidenceScore
    }
  }

  return {
    ticketsProcessed: tickets.length,
    predictionsWritten,
    transferCount,
    avgConfidencePct: predictionsWritten
      ? Math.round((confidenceSum / predictionsWritten) * 100)
      : 0,
    modelVersion: TRANSFER_MODEL_VERSION,
    modelName: TRANSFER_MODEL_NAME,
  }
}
