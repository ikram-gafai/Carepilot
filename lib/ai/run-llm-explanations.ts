import { and, count, desc, eq, inArray, sql } from "drizzle-orm"

import {
  LLM_EXPLANATION_ENABLED,
  LLM_EXPLANATION_MODEL_DISPLAY,
  LLM_EXPLANATION_MODEL_VERSION,
} from "@/lib/ai-phase"
import {
  generateOperationalExplanation,
  type ExplanationAiContext,
  type ExplanationTicketContext,
} from "@/lib/ai/llm-explanation"
import { getOllamaExplanationModel } from "@/lib/ai/ollama-client"
import { getDb } from "@/lib/db"
import { cpAgentAiOperationalExplanations, cpAgentTickets } from "@/lib/db/schema/cp-agent"

import { getActionRecommendationForTicket } from "./run-action-recommendations"
import { getEscalationPredictionForTicket } from "./run-escalation-predictions"
import { getKmRecommendationsForTicket } from "./run-km-recommendations"
import { getMissingInformationForTicket } from "./run-missing-information-analysis"
import { getPriorityPredictionForTicket } from "./run-priority-predictions"
import { getSlaPredictionForTicket } from "./run-sla-predictions"
import { getTransferPredictionForTicket } from "./run-transfer-predictions"

export type OperationalExplanationStats = {
  totalExplanations: number
  avgLatencyMs: number
  selectedModel: string
}

export type OperationalExplanationRow = {
  id: number
  ticketId: number
  careId: string
  title: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  priority: string
  modelName: string
  operationalSummary: string
  recommendedActionExplanation: string
  reasoning: string
  missingInformationNote: string
  nextSteps: string
  latencyMs: number
  createdAt: Date
  updatedAt: Date
}

const CARE_FILTER = eq(cpAgentTickets.source, "CARE")

export async function loadExplanationAiContext(ticketId: number): Promise<ExplanationAiContext> {
  const [escalation, transfer, action, sla, priority, km, missingInformation] = await Promise.all([
    getEscalationPredictionForTicket(ticketId),
    getTransferPredictionForTicket(ticketId),
    getActionRecommendationForTicket(ticketId),
    getSlaPredictionForTicket(ticketId),
    getPriorityPredictionForTicket(ticketId),
    getKmRecommendationsForTicket(ticketId),
    getMissingInformationForTicket(ticketId),
  ])
  return { escalation, transfer, action, sla, priority, km, missingInformation }
}

export async function getOperationalExplanationStats(): Promise<OperationalExplanationStats> {
  if (!LLM_EXPLANATION_ENABLED) {
    return { totalExplanations: 0, avgLatencyMs: 0, selectedModel: getOllamaExplanationModel() }
  }

  const db = getDb()
  const [[totalRow], [avgRow]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentAiOperationalExplanations),
    db
      .select({
        avg: sql<number>`coalesce(avg(${cpAgentAiOperationalExplanations.latencyMs}), 0)`,
      })
      .from(cpAgentAiOperationalExplanations),
  ])

  return {
    totalExplanations: Number(totalRow?.c ?? 0),
    avgLatencyMs: Math.round(Number(avgRow?.avg ?? 0)),
    selectedModel: getOllamaExplanationModel(),
  }
}

export async function listOperationalExplanations(limit = 200): Promise<OperationalExplanationRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: cpAgentAiOperationalExplanations.id,
      ticketId: cpAgentAiOperationalExplanations.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      modelName: cpAgentAiOperationalExplanations.modelName,
      operationalSummary: cpAgentAiOperationalExplanations.operationalSummary,
      recommendedActionExplanation: cpAgentAiOperationalExplanations.recommendedActionExplanation,
      reasoning: cpAgentAiOperationalExplanations.reasoning,
      missingInformationNote: cpAgentAiOperationalExplanations.missingInformationNote,
      nextSteps: cpAgentAiOperationalExplanations.nextSteps,
      latencyMs: cpAgentAiOperationalExplanations.latencyMs,
      createdAt: cpAgentAiOperationalExplanations.createdAt,
      updatedAt: cpAgentAiOperationalExplanations.updatedAt,
    })
    .from(cpAgentAiOperationalExplanations)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiOperationalExplanations.ticketId))
    .where(CARE_FILTER)
    .orderBy(desc(cpAgentAiOperationalExplanations.updatedAt))
    .limit(limit)

  return rows
}

export async function getOperationalExplanationForTicket(
  ticketId: number,
): Promise<OperationalExplanationRow | null> {
  const db = getDb()
  const [row] = await db
    .select({
      id: cpAgentAiOperationalExplanations.id,
      ticketId: cpAgentAiOperationalExplanations.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
      modelName: cpAgentAiOperationalExplanations.modelName,
      operationalSummary: cpAgentAiOperationalExplanations.operationalSummary,
      recommendedActionExplanation: cpAgentAiOperationalExplanations.recommendedActionExplanation,
      reasoning: cpAgentAiOperationalExplanations.reasoning,
      missingInformationNote: cpAgentAiOperationalExplanations.missingInformationNote,
      nextSteps: cpAgentAiOperationalExplanations.nextSteps,
      latencyMs: cpAgentAiOperationalExplanations.latencyMs,
      createdAt: cpAgentAiOperationalExplanations.createdAt,
      updatedAt: cpAgentAiOperationalExplanations.updatedAt,
    })
    .from(cpAgentAiOperationalExplanations)
    .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiOperationalExplanations.ticketId))
    .where(and(eq(cpAgentAiOperationalExplanations.ticketId, ticketId), CARE_FILTER)!)
    .limit(1)

  return row ?? null
}

async function upsertOperationalExplanation(
  result: Awaited<ReturnType<typeof generateOperationalExplanation>>,
): Promise<void> {
  const db = getDb()
  const now = new Date()

  await db
    .insert(cpAgentAiOperationalExplanations)
    .values({
      ticketId: result.ticketId,
      modelName: result.modelName,
      operationalSummary: result.operationalSummary,
      recommendedActionExplanation: result.recommendedActionExplanation,
      reasoning: result.reasoning,
      missingInformationNote: result.missingInformationNote,
      nextSteps: result.nextSteps,
      latencyMs: result.latencyMs,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cpAgentAiOperationalExplanations.ticketId,
      set: {
        modelName: result.modelName,
        operationalSummary: result.operationalSummary,
        recommendedActionExplanation: result.recommendedActionExplanation,
        reasoning: result.reasoning,
        missingInformationNote: result.missingInformationNote,
        nextSteps: result.nextSteps,
        latencyMs: result.latencyMs,
        updatedAt: now,
      },
    })
}

export type RunOperationalExplanationResult = {
  ticketsProcessed: number
  explanationsWritten: number
  avgLatencyMs: number
  modelName: string
  modelVersion: string
}

export async function runOperationalExplanations(opts?: {
  ticketIds?: number[]
}): Promise<RunOperationalExplanationResult> {
  if (!LLM_EXPLANATION_ENABLED) {
    return {
      ticketsProcessed: 0,
      explanationsWritten: 0,
      avgLatencyMs: 0,
      modelName: getOllamaExplanationModel(),
      modelVersion: LLM_EXPLANATION_MODEL_VERSION,
    }
  }

  const db = getDb()
  const tickets = await db
    .select({
      id: cpAgentTickets.id,
      title: cpAgentTickets.title,
      description: cpAgentTickets.description,
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      perimeter: cpAgentTickets.perimeter,
      priority: cpAgentTickets.priority,
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
      explanationsWritten: 0,
      avgLatencyMs: 0,
      modelName: getOllamaExplanationModel(),
      modelVersion: LLM_EXPLANATION_MODEL_VERSION,
    }
  }

  let explanationsWritten = 0
  let latencySum = 0

  for (const ticket of tickets) {
    const ticketCtx: ExplanationTicketContext = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      storeCode: ticket.storeCode,
      storeName: ticket.storeName,
      perimeter: ticket.perimeter,
      priority: ticket.priority,
      category: ticket.category,
    }
    const ai = await loadExplanationAiContext(ticket.id)
    const result = await generateOperationalExplanation(ticketCtx, ai)
    await upsertOperationalExplanation(result)
    explanationsWritten++
    latencySum += result.latencyMs
  }

  return {
    ticketsProcessed: tickets.length,
    explanationsWritten,
    avgLatencyMs: explanationsWritten ? Math.round(latencySum / explanationsWritten) : 0,
    modelName: getOllamaExplanationModel(),
    modelVersion: LLM_EXPLANATION_MODEL_VERSION,
  }
}
