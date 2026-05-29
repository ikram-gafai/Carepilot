import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm"

import {
  buildTicketSignals,
  formatSuggestedActionWithTarget,
  normalizeUntreatedTicketStatus,
} from "@/lib/cp-agent/ticket-workflow"
import { resolveApplicableKm } from "@/lib/ai/orchestration/km-applicability"
import { plannedOperationalOutcomeForCareId } from "@/lib/care-operational/catalog-operational-outcome"
import { isOrchestratedSlaAttention } from "@/lib/ai/orchestration/resolve-operational-decision"
import { isDemoCareTicketId, operationalCareTicketScope } from "@/lib/care-operational/operational-ticket-scope"
import {
  compareAgentTicketListItems,
} from "@/lib/carepilot-api/ticket-list-sort"
import {
  matchesTicketQueueQuickFilter,
  type TicketQueueQuickFilter,
} from "@/lib/agent/ticket-queue-display"
import { englishLegacyCopy } from "@/lib/cp-agent-legacy-copy-en"
import { cpAgentSlaLabel } from "@/lib/queries/cp-agent"
import { getDb } from "@/lib/db"
import {
  cpAgentAiActionRecommendations,
  cpAgentAiEscalationPredictions,
  cpAgentAiKmRecommendations,
  cpAgentAiMissingInformationAnalysis,
  cpAgentAiPriorityPredictions,
  cpAgentAiSlaPredictions,
  cpAgentAiTransferPredictions,
  cpAgentTicketComments,
  cpAgentTicketHistory,
  cpAgentTickets,
  cpAgentUsers,
} from "@/lib/db/schema/cp-agent"
import type { TicketSignalKey } from "@/lib/cp-agent/ticket-workflow"

const AGENT_OUTCOME_EVENTS = [
  "resolve",
  "escalate_n3",
  "transfer_monetique",
  "transfer_materiel",
  "transfer_bo",
  "transfer_reseau",
  "transfer_bureautique",
  "transfer_infrastructure",
] as const

export type TicketListFilters = {
  q?: string
  status?: string
  priority?: string
  category?: string
  assignedUserId?: string
  slaState?: "all" | "breached" | "at_risk" | "ok"
  quickFilter?: TicketQueueQuickFilter
}

export type AgentTicketListItem = {
  id: number
  careId: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  predictedPriority: string | null
  storeName: string | null
  storeCode: string | null
  slaDueAt: Date | null
  slaLabel: string
  slaTone: "critical" | "warning" | "success" | "neutral"
  suggestedAction: string | null
  suggestedActionLabel: string
  signals: TicketSignalKey[]
  assigneeName: string | null
  updatedAt: Date
  createdAt: Date
}

async function loadAgentOutcomeTicketIds(ticketIds: number[]): Promise<Set<number>> {
  if (ticketIds.length === 0) return new Set()
  const db = getDb()
  const rows = await db
    .selectDistinct({ ticketId: cpAgentTicketHistory.ticketId })
    .from(cpAgentTicketHistory)
    .where(
      and(
        inArray(cpAgentTicketHistory.ticketId, ticketIds),
        inArray(cpAgentTicketHistory.eventType, [...AGENT_OUTCOME_EVENTS]),
        eq(cpAgentTicketHistory.actorLabel, "Agent"),
      ),
    )
  return new Set(rows.map((r) => r.ticketId))
}

export async function listSynchronizedTickets(filters: TicketListFilters = {}) {
  const db = getDb()
  const clauses = [] as ReturnType<typeof and>[]

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`
    clauses.push(
      or(
        ilike(cpAgentTickets.title, q),
        ilike(cpAgentTickets.description, q),
        ilike(cpAgentTickets.careId, q),
        ilike(cpAgentTickets.storeCode, q),
      )!,
    )
  }
  if (filters.status && filters.status !== "all") {
    clauses.push(eq(cpAgentTickets.status, filters.status))
  }
  if (filters.priority && filters.priority !== "all") {
    clauses.push(eq(cpAgentTickets.priority, filters.priority))
  }
  if (filters.category && filters.category !== "all") {
    clauses.push(eq(cpAgentTickets.category, filters.category))
  }
  if (filters.assignedUserId && filters.assignedUserId !== "all") {
    clauses.push(eq(cpAgentTickets.assignedUserId, Number(filters.assignedUserId)))
  }
  const where = clauses.length ? and(...clauses) : undefined
  const whereClause = where
    ? operationalCareTicketScope(where)
    : operationalCareTicketScope()

  const rows = await db
    .select({
      ticket: cpAgentTickets,
      assigneeName: cpAgentUsers.displayName,
      recommendedAction: cpAgentAiActionRecommendations.recommendedAction,
      actionConfidence: cpAgentAiActionRecommendations.confidenceScore,
      probabilityDistribution: cpAgentAiActionRecommendations.probabilityDistribution,
      escalationRequired: cpAgentAiEscalationPredictions.predictedEscalationRequired,
      escalationConfidence: cpAgentAiEscalationPredictions.confidenceScore,
      transferRequired: cpAgentAiTransferPredictions.predictedTransferRequired,
      transferConfidence: cpAgentAiTransferPredictions.confidenceScore,
      qualityLevel: cpAgentAiMissingInformationAnalysis.qualityLevel,
      completenessScore: cpAgentAiMissingInformationAnalysis.completenessScore,
      missingFields: cpAgentAiMissingInformationAnalysis.missingFields,
      missingContextConfidence: cpAgentAiMissingInformationAnalysis.confidenceScore,
      slaRiskLevel: cpAgentAiSlaPredictions.riskLevel,
      slaPredictedBreach: cpAgentAiSlaPredictions.predictedSlaBreach,
      slaConfidence: cpAgentAiSlaPredictions.confidenceScore,
      predictedPriority: cpAgentAiPriorityPredictions.predictedPriority,
      priorityConfidence: cpAgentAiPriorityPredictions.confidenceScore,
    })
    .from(cpAgentTickets)
    .leftJoin(cpAgentUsers, eq(cpAgentTickets.assignedUserId, cpAgentUsers.id))
    .leftJoin(cpAgentAiActionRecommendations, eq(cpAgentTickets.id, cpAgentAiActionRecommendations.ticketId))
    .leftJoin(cpAgentAiEscalationPredictions, eq(cpAgentTickets.id, cpAgentAiEscalationPredictions.ticketId))
    .leftJoin(cpAgentAiTransferPredictions, eq(cpAgentTickets.id, cpAgentAiTransferPredictions.ticketId))
    .leftJoin(cpAgentAiMissingInformationAnalysis, eq(cpAgentTickets.id, cpAgentAiMissingInformationAnalysis.ticketId))
    .leftJoin(cpAgentAiSlaPredictions, eq(cpAgentTickets.id, cpAgentAiSlaPredictions.ticketId))
    .leftJoin(cpAgentAiPriorityPredictions, eq(cpAgentTickets.id, cpAgentAiPriorityPredictions.ticketId))
    .where(whereClause)

  const ticketIds = [...new Set(rows.map((r) => r.ticket.id))]
  const [agentOutcomeIds, kmRows] = await Promise.all([
    loadAgentOutcomeTicketIds(ticketIds),
    ticketIds.length > 0
      ? db
          .select({
            ticketId: cpAgentAiKmRecommendations.ticketId,
            kmId: cpAgentAiKmRecommendations.kmId,
            kmTitle: cpAgentAiKmRecommendations.kmTitle,
            similarityScore: cpAgentAiKmRecommendations.similarityScore,
          })
          .from(cpAgentAiKmRecommendations)
          .where(inArray(cpAgentAiKmRecommendations.ticketId, ticketIds))
      : Promise.resolve([]),
  ])
  const kmByTicket = new Map(kmRows.map((r) => [r.ticketId, r]))

  const seenTicketIds = new Set<number>()
  const items: AgentTicketListItem[] = []
  for (const r of rows) {
    if (seenTicketIds.has(r.ticket.id)) continue
    seenTicketIds.add(r.ticket.id)
    const hasAgentOutcome = agentOutcomeIds.has(r.ticket.id)
    const displayStatus = normalizeUntreatedTicketStatus(r.ticket.status, hasAgentOutcome)
    const sla = cpAgentSlaLabel(r.ticket.slaDueAt, displayStatus, {
      priority: r.ticket.priority,
      createdAt: r.ticket.createdAt,
      externalCreatedAt: r.ticket.externalCreatedAt,
      ttrTargetHours: r.ticket.ttrTargetHours,
    })
    const missingContext =
      r.qualityLevel === "INCOMPLETE" || r.qualityLevel === "POOR"
    const slaAttention = isOrchestratedSlaAttention(sla.label, r.slaRiskLevel)

    const missingFields = Array.isArray(r.missingFields) ? r.missingFields.map(String) : []
    const kmRow = kmByTicket.get(r.ticket.id)
    const catalogPlan = plannedOperationalOutcomeForCareId(r.ticket.careId)
    const kmApplicable = resolveApplicableKm({
      category: r.ticket.category,
      perimeter: r.ticket.perimeter,
      aiKmId: kmRow?.kmId ?? catalogPlan?.kmCode ?? null,
      aiKmTitle: kmRow?.kmTitle ?? null,
      aiSimilarity: kmRow?.similarityScore ?? null,
    })

    const signals = buildTicketSignals({
      escalationRequired: r.escalationRequired ?? false,
      transferRequired: r.transferRequired ?? false,
      missingContext,
      slaAttention,
      kmOpportunity: kmApplicable.hasKm,
    })

    const suggestedAction = r.recommendedAction ?? null

    items.push({
      id: r.ticket.id,
      careId: r.ticket.careId,
      title: englishLegacyCopy(r.ticket.title),
      description: englishLegacyCopy(r.ticket.description),
      category: r.ticket.category,
      status: displayStatus,
      priority: r.ticket.priority,
      predictedPriority: r.predictedPriority ?? null,
      storeName: r.ticket.storeName,
      storeCode: r.ticket.storeCode,
      slaDueAt: r.ticket.slaDueAt,
      slaLabel: sla.label,
      slaTone: sla.tone,
      suggestedAction,
      suggestedActionLabel: formatSuggestedActionWithTarget(suggestedAction, null, {
        careId: r.ticket.careId,
        title: r.ticket.title,
        description: r.ticket.description,
        ticketStatus: displayStatus,
        category: r.ticket.category,
        perimeter: r.ticket.perimeter,
        priority: r.ticket.priority,
        predictedPriority: r.predictedPriority ?? null,
        qualityLevel: r.qualityLevel ?? null,
        completenessScore: r.completenessScore ?? null,
        missingFields,
        escalationSignal: r.escalationRequired ?? false,
        transferSignal: r.transferRequired ?? false,
        escalationConfidence: r.escalationConfidence ?? null,
        transferConfidence: r.transferConfidence ?? null,
        aiKmId: kmApplicable.kmId,
        aiKmTitle: kmApplicable.kmTitle,
        slaLabel: sla.label,
        slaRiskLevel: r.slaRiskLevel ?? null,
        slaPredictedBreach: r.slaPredictedBreach ?? false,
        slaConfidence: r.slaConfidence ?? null,
        priorityConfidence: r.priorityConfidence ?? null,
        missingContextConfidence: r.missingContextConfidence ?? null,
      }),
      signals,
      assigneeName: r.assigneeName,
      updatedAt: r.ticket.updatedAt,
      createdAt: r.ticket.createdAt,
    })
  }

  const slaFilter = filters.slaState && filters.slaState !== "all" ? filters.slaState : null
  const quickFilter =
    filters.quickFilter && filters.quickFilter !== "all" ? filters.quickFilter : null

  let filtered = slaFilter
    ? items.filter((item) => {
        if (slaFilter === "breached") return item.slaLabel === "Breached"
        if (slaFilter === "at_risk") return item.slaLabel === "At risk"
        return item.slaLabel === "On track"
      })
    : items

  if (quickFilter) {
    filtered = filtered.filter((item) => matchesTicketQueueQuickFilter(item, quickFilter))
  }

  filtered.sort(compareAgentTicketListItems)

  return { items: filtered, total: filtered.length }
}

export async function getSynchronizedTicket(id: number) {
  const db = getDb()
  const [row] = await db
    .select({
      ticket: cpAgentTickets,
      assigneeName: cpAgentUsers.displayName,
      assigneeEmail: cpAgentUsers.email,
    })
    .from(cpAgentTickets)
    .leftJoin(cpAgentUsers, eq(cpAgentTickets.assignedUserId, cpAgentUsers.id))
    .where(eq(cpAgentTickets.id, id))
    .limit(1)

  if (!row || isDemoCareTicketId(row.ticket.careId)) return null

  const agentOutcomeIds = await loadAgentOutcomeTicketIds([id])
  const displayStatus = normalizeUntreatedTicketStatus(
    row.ticket.status,
    agentOutcomeIds.has(id),
  )

  return {
    ...row.ticket,
    status: displayStatus,
    title: englishLegacyCopy(row.ticket.title),
    description: englishLegacyCopy(row.ticket.description),
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
  }
}

export async function getSynchronizedTicketHistory(ticketId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(cpAgentTicketHistory)
    .where(eq(cpAgentTicketHistory.ticketId, ticketId))
    .orderBy(desc(cpAgentTicketHistory.occurredAt))

  return { items: rows, total: rows.length }
}

export async function getSynchronizedTicketComments(ticketId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(cpAgentTicketComments)
    .where(eq(cpAgentTicketComments.ticketId, ticketId))
    .orderBy(asc(cpAgentTicketComments.createdAt))

  return { items: rows, total: rows.length }
}

export { isDemoCareTicketId, isOperationalCareTicketId } from "@/lib/care-operational/operational-ticket-scope"
