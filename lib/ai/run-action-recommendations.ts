import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  ACTION_MODEL_NAME,
  ACTION_MODEL_VERSION,
  ACTION_RECOMMENDATION_ENABLED,
} from "@/lib/ai-phase"
import { deriveActionReason } from "@/lib/ai/action-reason"
import { buildOrchestratedTicketDecision } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import { deriveTransferTargetPerimeter } from "@/lib/ai/transfer-reason"
import { plannedOperationalOutcomeForCareId } from "@/lib/care-operational/catalog-operational-outcome"
import { getDb } from "@/lib/db"
import {
  cpAgentAiActionRecommendations,
  cpAgentAiEscalationPredictions,
  cpAgentAiKmRecommendations,
  cpAgentAiMissingInformationAnalysis,
  cpAgentAiTransferPredictions,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

import { predictActionBatch, type ActionRecommendationResult } from "./action-recommendation"

export type ActionRecommendationStats = {
  totalPredictions: number
  mostCommonAction: string | null
  avgConfidencePct: number
}

export type ActionRecommendationRow = {
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
  recommendedAction: string
  confidenceScore: number
  probabilityDistribution: Record<string, number>
  reason: string
  modelName: string
  modelVersion: string
  createdAt: Date
  updatedAt: Date
}

const ACTION_CALIBRATION_SELECT = {
  id: cpAgentAiActionRecommendations.id,
  ticketId: cpAgentAiActionRecommendations.ticketId,
  careId: cpAgentTickets.careId,
  title: cpAgentTickets.title,
  description: cpAgentTickets.description,
  storeCode: cpAgentTickets.storeCode,
  storeName: cpAgentTickets.storeName,
  perimeter: cpAgentTickets.perimeter,
  category: cpAgentTickets.category,
  priority: cpAgentTickets.priority,
  ticketStatus: cpAgentTickets.status,
  recommendedAction: cpAgentAiActionRecommendations.recommendedAction,
  confidenceScore: cpAgentAiActionRecommendations.confidenceScore,
  probabilityDistribution: cpAgentAiActionRecommendations.probabilityDistribution,
  modelName: cpAgentAiActionRecommendations.modelName,
  modelVersion: cpAgentAiActionRecommendations.modelVersion,
  createdAt: cpAgentAiActionRecommendations.createdAt,
  updatedAt: cpAgentAiActionRecommendations.updatedAt,
  escalationRequired: cpAgentAiEscalationPredictions.predictedEscalationRequired,
  escalationConfidence: cpAgentAiEscalationPredictions.confidenceScore,
  transferRequired: cpAgentAiTransferPredictions.predictedTransferRequired,
  transferConfidence: cpAgentAiTransferPredictions.confidenceScore,
  qualityLevel: cpAgentAiMissingInformationAnalysis.qualityLevel,
  completenessScore: cpAgentAiMissingInformationAnalysis.completenessScore,
  missingFields: cpAgentAiMissingInformationAnalysis.missingFields,
  aiKmId: cpAgentAiKmRecommendations.kmId,
  aiKmTitle: cpAgentAiKmRecommendations.kmTitle,
  aiSimilarity: cpAgentAiKmRecommendations.similarityScore,
} as const

function mapCalibratedActionRow(
  row: {
    probabilityDistribution: Record<string, number> | null
    escalationRequired: boolean | null
    transferRequired: boolean | null
    missingFields: unknown
  } & Omit<
    Parameters<typeof enrichActionRow>[0],
    "probabilityDistribution" | "escalationRequired" | "transferRequired" | "missingFields"
  >,
): ActionRecommendationRow {
  return enrichActionRow({
    ...row,
    probabilityDistribution: row.probabilityDistribution ?? {},
    escalationRequired: row.escalationRequired ?? undefined,
    transferRequired: row.transferRequired ?? undefined,
    missingFields: Array.isArray(row.missingFields) ? row.missingFields.map(String) : [],
  })
}

function enrichActionRow(
  row: Omit<ActionRecommendationRow, "reason" | "description" | "category"> & {
    description?: string
    category?: string | null
    escalationRequired?: boolean
    transferRequired?: boolean
    ticketStatus?: string
    qualityLevel?: string | null
    completenessScore?: number | null
    missingFields?: string[] | null
    escalationConfidence?: number | null
    transferConfidence?: number | null
    transferTarget?: string | null
    aiKmId?: string | null
    aiKmTitle?: string | null
    aiSimilarity?: number | null
  },
): ActionRecommendationRow {
  const description = row.description ?? ""
  const category = row.category ?? null
  const reason = deriveActionReason({
    title: row.title,
    description,
    perimeter: row.perimeter,
    category,
    priority: row.priority,
    recommendedAction: row.recommendedAction,
    escalationRequired: row.escalationRequired,
    transferRequired: row.transferRequired,
  })

  const catalogPlan = plannedOperationalOutcomeForCareId(row.careId)
  const transferTarget =
    row.transferTarget ??
    (row.transferRequired
      ? deriveTransferTargetPerimeter({
          title: row.title,
          description,
          perimeter: row.perimeter,
          category,
        })
      : null)
  const orchestrated = buildOrchestratedTicketDecision({
    careId: row.careId,
    title: row.title,
    description,
    ticketStatus: row.ticketStatus ?? "OPEN",
    category,
    perimeter: row.perimeter,
    priority: row.priority,
    qualityLevel: row.qualityLevel ?? null,
    completenessScore: row.completenessScore ?? null,
    missingFields: Array.isArray(row.missingFields) ? row.missingFields.map(String) : [],
    escalationSignal: row.escalationRequired ?? false,
    escalationConfidence: row.escalationConfidence ?? null,
    transferSignal: row.transferRequired ?? false,
    transferConfidence: row.transferConfidence ?? null,
    transferTarget,
    aiKmId: row.aiKmId ?? catalogPlan?.kmCode ?? null,
    aiKmTitle: row.aiKmTitle ?? null,
    aiSimilarity: row.aiSimilarity ?? null,
  })

  return {
    ...row,
    description,
    category,
    reason,
    confidenceScore: orchestrated.decisionConfidencePct / 100,
  }
}

export async function getActionRecommendationStats(): Promise<ActionRecommendationStats> {
  if (!ACTION_RECOMMENDATION_ENABLED) {
    return { totalPredictions: 0, mostCommonAction: null, avgConfidencePct: 0 }
  }

  const db = getDb()
  const rows = await listActionRecommendations()
  const [[totalRow], topActionRows] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiActionRecommendations),
    db
      .select({
        action: cpAgentAiActionRecommendations.recommendedAction,
        c: count(),
      })
      .from(cpAgentAiActionRecommendations)
      .groupBy(cpAgentAiActionRecommendations.recommendedAction)
      .orderBy(desc(count()))
      .limit(1),
  ])

  const avgConfidencePct =
    rows.length > 0
      ? Math.round((rows.reduce((sum, row) => sum + row.confidenceScore * 100, 0) / rows.length))
      : 0

  return {
    totalPredictions: Number(totalRow?.c ?? 0),
    mostCommonAction: topActionRows[0]?.action ?? null,
    avgConfidencePct,
  }
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

export async function listActionRecommendations(ticketIds?: number[]): Promise<ActionRecommendationRow[]> {
  const db = getDb()
  const scope =
    ticketIds && ticketIds.length > 0
      ? and(CARE_FILTER, inArray(cpAgentAiActionRecommendations.ticketId, ticketIds))
      : CARE_FILTER
  const rows = await db
    .select(ACTION_CALIBRATION_SELECT)
    .from(cpAgentAiActionRecommendations)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiActionRecommendations.ticketId))
    .leftJoin(
      cpAgentAiEscalationPredictions,
      eq(cpAgentAiEscalationPredictions.ticketId, cpAgentAiActionRecommendations.ticketId),
    )
    .leftJoin(
      cpAgentAiTransferPredictions,
      eq(cpAgentAiTransferPredictions.ticketId, cpAgentAiActionRecommendations.ticketId),
    )
    .leftJoin(
      cpAgentAiMissingInformationAnalysis,
      eq(cpAgentAiMissingInformationAnalysis.ticketId, cpAgentAiActionRecommendations.ticketId),
    )
    .leftJoin(
      cpAgentAiKmRecommendations,
      and(
        eq(cpAgentAiKmRecommendations.ticketId, cpAgentAiActionRecommendations.ticketId),
        eq(cpAgentAiKmRecommendations.rank, 1),
      )!,
    )
    .where(scope)
    .orderBy(desc(cpAgentAiActionRecommendations.createdAt))

  return rows.map((row) => mapCalibratedActionRow(row))
}

export async function getActionRecommendationForTicket(
  ticketId: number,
): Promise<ActionRecommendationRow | null> {
  const db = getDb()
  const [row] = await db
    .select(ACTION_CALIBRATION_SELECT)
    .from(cpAgentAiActionRecommendations)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiActionRecommendations.ticketId))
    .leftJoin(
      cpAgentAiEscalationPredictions,
      eq(cpAgentAiEscalationPredictions.ticketId, cpAgentAiActionRecommendations.ticketId),
    )
    .leftJoin(
      cpAgentAiTransferPredictions,
      eq(cpAgentAiTransferPredictions.ticketId, cpAgentAiActionRecommendations.ticketId),
    )
    .leftJoin(
      cpAgentAiMissingInformationAnalysis,
      eq(cpAgentAiMissingInformationAnalysis.ticketId, cpAgentAiActionRecommendations.ticketId),
    )
    .leftJoin(
      cpAgentAiKmRecommendations,
      and(
        eq(cpAgentAiKmRecommendations.ticketId, cpAgentAiActionRecommendations.ticketId),
        eq(cpAgentAiKmRecommendations.rank, 1),
      )!,
    )
    .where(and(eq(cpAgentAiActionRecommendations.ticketId, ticketId), CARE_FILTER)!)
    .limit(1)

  return row ? mapCalibratedActionRow(row) : null
}

async function loadRoutingSignals(ticketIds: number[]) {
  const db = getDb()
  if (ticketIds.length === 0) return new Map<number, { escalationRequired: boolean; transferRequired: boolean }>()

  const [escalations, transfers] = await Promise.all([
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
  ])

  const map = new Map<number, { escalationRequired: boolean; transferRequired: boolean }>()
  for (const ticketId of ticketIds) {
    map.set(ticketId, { escalationRequired: false, transferRequired: false })
  }
  for (const row of escalations) {
    const current = map.get(row.ticketId) ?? { escalationRequired: false, transferRequired: false }
    current.escalationRequired = row.predictedEscalationRequired
    map.set(row.ticketId, current)
  }
  for (const row of transfers) {
    const current = map.get(row.ticketId) ?? { escalationRequired: false, transferRequired: false }
    current.transferRequired = row.predictedTransferRequired
    map.set(row.ticketId, current)
  }
  return map
}

async function upsertActionRecommendation(result: ActionRecommendationResult, reason: string): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db
    .insert(cpAgentAiActionRecommendations)
    .values({
      ticketId: result.ticketId,
      modelName: result.modelName,
      recommendedAction: result.recommendedAction,
      confidenceScore: result.confidenceScore,
      probabilityDistribution: result.probabilityDistribution,
      modelVersion: result.modelVersion,
      reason,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiActionRecommendations.ticketId,
      set: {
        modelName: result.modelName,
        recommendedAction: result.recommendedAction,
        confidenceScore: result.confidenceScore,
        probabilityDistribution: result.probabilityDistribution,
        modelVersion: result.modelVersion,
        reason,
        updatedAt: now,
      },
    })
}

export type RunActionRecommendationsResult = {
  ticketsProcessed: number
  predictionsWritten: number
  avgConfidencePct: number
  mostCommonAction: string | null
  modelVersion: string
  modelName: string
}

/** Score synchronized CARE tickets and upsert into cp_agent.ai_action_recommendations. */
export async function runActionRecommendations(opts?: {
  ticketIds?: number[]
}): Promise<RunActionRecommendationsResult> {
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
      source: cpAgentTickets.source,
      storeType: cpAgentTickets.storeType,
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
      avgConfidencePct: 0,
      mostCommonAction: null,
      modelVersion: ACTION_MODEL_VERSION,
      modelName: ACTION_MODEL_NAME,
    }
  }

  const batchSize = 50
  let predictionsWritten = 0
  let confidenceSum = 0
  const actionCounts = new Map<string, number>()

  for (let i = 0; i < tickets.length; i += batchSize) {
    const chunk = tickets.slice(i, i + batchSize)
    const ticketIds = chunk.map((ticket) => ticket.id)
    const routingSignals = await loadRoutingSignals(ticketIds)
    const predictions = await predictActionBatch(chunk, routingSignals)

    for (const prediction of predictions) {
      const ticket = chunk.find((item) => item.id === prediction.ticketId)!
      const routing = routingSignals.get(prediction.ticketId)
      const reason = deriveActionReason({
        title: ticket.title,
        description: ticket.description,
        perimeter: ticket.perimeter,
        category: ticket.category,
        priority: ticket.priority,
        recommendedAction: prediction.recommendedAction,
        escalationRequired: routing?.escalationRequired,
        transferRequired: routing?.transferRequired,
      })
      await upsertActionRecommendation(prediction, reason)
      predictionsWritten++
      confidenceSum += prediction.confidenceScore
      actionCounts.set(
        prediction.recommendedAction,
        (actionCounts.get(prediction.recommendedAction) ?? 0) + 1,
      )
    }
  }

  const mostCommonAction =
    [...actionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    ticketsProcessed: tickets.length,
    predictionsWritten,
    avgConfidencePct: predictionsWritten
      ? Math.round((confidenceSum / predictionsWritten) * 100)
      : 0,
    mostCommonAction,
    modelVersion: ACTION_MODEL_VERSION,
    modelName: ACTION_MODEL_NAME,
  }
}
