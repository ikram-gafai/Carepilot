import { eq, sql } from "drizzle-orm"

import { operationalCareTicketScope } from "@/lib/care-operational/operational-ticket-scope"
import { getDb } from "@/lib/db"
import { AI_PIPELINE_LABELS } from "@/lib/operational-ui-copy"
import {
  cpAgentAiActionRecommendations,
  cpAgentAiKmRecommendations,
  cpAgentAiMissingInformationAnalysis,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

export type AiPipelineHealthRow = {
  label: string
  completed: number
  total: number
  pct: number
}

export type AiPipelineHealth = {
  rows: AiPipelineHealthRow[]
}

function pct(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}

function buildRows(
  total: number,
  aiAnalyzed: number,
  contextAnalysisCompleted: number,
  kmAnalysisCompleted: number,
  agentDecisionsRecorded: number,
): AiPipelineHealth {
  return {
    rows: [
      {
        label: AI_PIPELINE_LABELS.analyzed,
        completed: aiAnalyzed,
        total,
        pct: pct(aiAnalyzed, total),
      },
      {
        label: AI_PIPELINE_LABELS.context,
        completed: contextAnalysisCompleted,
        total,
        pct: pct(contextAnalysisCompleted, total),
      },
      {
        label: AI_PIPELINE_LABELS.km,
        completed: kmAnalysisCompleted,
        total,
        pct: pct(kmAnalysisCompleted, total),
      },
      {
        label: AI_PIPELINE_LABELS.decisions,
        completed: agentDecisionsRecorded,
        total,
        pct: pct(agentDecisionsRecorded, total),
      },
    ],
  }
}

/**
 * CAREPILOT pipeline coverage — AI processing health, not operational KPIs.
 * Counts distinct tickets with each AI stage on the full synchronized population.
 * KM uses orchestrated queue match count when provided (same view as agent procedures).
 */
export async function loadAiPipelineHealth(
  synchronizedTotal: number,
  agentDecisionsRecorded: number,
  orchestrated?: {
    kmAnalysisCompleted?: number
  },
): Promise<AiPipelineHealth> {
  const db = getDb()
  const scope = operationalCareTicketScope()!
  const total = Math.max(0, synchronizedTotal)

  const [[ai], [context], [km]] = await Promise.all([
    db
      .select({
        c: sql<number>`count(distinct ${cpAgentAiActionRecommendations.ticketId})::int`,
      })
      .from(cpAgentAiActionRecommendations)
      .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiActionRecommendations.ticketId))
      .where(scope),
    db
      .select({
        c: sql<number>`count(distinct ${cpAgentAiMissingInformationAnalysis.ticketId})::int`,
      })
      .from(cpAgentAiMissingInformationAnalysis)
      .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiMissingInformationAnalysis.ticketId))
      .where(scope),
    db
      .select({
        c: sql<number>`count(distinct ${cpAgentAiKmRecommendations.ticketId})::int`,
      })
      .from(cpAgentAiKmRecommendations)
      .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiKmRecommendations.ticketId))
      .where(scope),
  ])

  const kmFromDb = km?.c ?? 0
  const kmCompleted = Math.max(kmFromDb, orchestrated?.kmAnalysisCompleted ?? 0)

  return buildRows(
    total,
    ai?.c ?? 0,
    context?.c ?? 0,
    kmCompleted,
    agentDecisionsRecorded,
  )
}
