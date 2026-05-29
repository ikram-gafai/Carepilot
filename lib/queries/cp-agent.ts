import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

import { CLOSED_TICKET_STATUSES, CLOSED_STATUS_SQL_LIST } from "@/lib/care-operational-actions"
import {
  isDemoCareTicketId,
  operationalCareTicketScope,
} from "@/lib/care-operational/operational-ticket-scope"
import {
  classifySlaExposure,
  type SlaExposureInput,
  type SlaExposureResult,
} from "@/lib/care-operational/sla-exposure"
import { isOrchestratedSlaAttention } from "@/lib/ai/orchestration/resolve-operational-decision"
import { englishLegacyCopy } from "@/lib/cp-agent-legacy-copy-en"
import { getDb } from "@/lib/db"
import {
  cpAgentAiAnalyses,
  cpAgentAiFeedback,
  cpAgentAiSlaPredictions,
  cpAgentKmSuggestions,
  cpAgentSyncLogs,
  cpAgentTicketHistory,
  cpAgentTickets,
  cpAgentUsers,
} from "@/lib/db/schema/cp-agent"

export type CpAgentTicketRow = InferSelectModel<typeof cpAgentTickets>
export type CpAgentUserRow = InferSelectModel<typeof cpAgentUsers>

const CLOSED_STATUSES = CLOSED_TICKET_STATUSES

function isOpenStatus(status: string) {
  return !CLOSED_STATUSES.includes(status as (typeof CLOSED_STATUSES)[number])
}

const CLOSED_SQL = CLOSED_STATUS_SQL_LIST

export async function cpAgentTicketCountsByStatus() {
  const db = getDb()
  const rows = await db
    .select({
      status: cpAgentTickets.status,
      c: count(),
    })
    .from(cpAgentTickets)
    .where(operationalCareTicketScope())
    .groupBy(cpAgentTickets.status)
  return rows.map((r) => ({ status: r.status, count: Number(r.c) }))
}

export async function cpAgentTicketCountsByPriority() {
  const db = getDb()
  const rows = await db
    .select({
      priority: cpAgentTickets.priority,
      c: count(),
    })
    .from(cpAgentTickets)
    .where(operationalCareTicketScope())
    .groupBy(cpAgentTickets.priority)
  return rows.map((r) => ({ priority: r.priority, count: Number(r.c) }))
}

/** SLA/TTR buckets for dashboard chart — uses stored timestamps + ttr_target_hours when present. */
export async function cpAgentSlaRiskBuckets() {
  const db = getDb()
  const now = new Date()

  const [closed] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(inArray(cpAgentTickets.status, [...CLOSED_STATUSES]))

  const openRows = await db
    .select({
      status: cpAgentTickets.status,
      priority: cpAgentTickets.priority,
      slaDueAt: cpAgentTickets.slaDueAt,
      createdAt: cpAgentTickets.createdAt,
      externalCreatedAt: cpAgentTickets.externalCreatedAt,
      ttrTargetHours: cpAgentTickets.ttrTargetHours,
    })
    .from(cpAgentTickets)
    .where(operationalCareTicketScope(sql`${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_SQL)})`!))

  let unknown = 0
  let breached = 0
  let atRisk = 0
  let onTrack = 0

  for (const row of openRows) {
    const exposure = classifySlaExposure({
      status: row.status,
      priority: row.priority,
      slaDueAt: row.slaDueAt,
      createdAt: row.createdAt,
      externalCreatedAt: row.externalCreatedAt,
      ttrTargetHours: row.ttrTargetHours,
      now,
    })
    if (exposure.label === "Not set") unknown++
    else if (exposure.bucket === "breached") breached++
    else if (exposure.bucket === "at_risk") atRisk++
    else onTrack++
  }

  return [
    { bucket: "closed", count: Number(closed?.c ?? 0) },
    { bucket: "unknown", count: unknown },
    { bucket: "breached", count: breached },
    { bucket: "at_risk", count: atRisk },
    { bucket: "on_track", count: onTrack },
  ]
}

export async function cpAgentRecommendationOutcomes() {
  const db = getDb()
  const [helpful] = await db
    .select({ c: count() })
    .from(cpAgentAiFeedback)
    .where(eq(cpAgentAiFeedback.helpful, true))

  const [notHelpful] = await db
    .select({ c: count() })
    .from(cpAgentAiFeedback)
    .where(eq(cpAgentAiFeedback.helpful, false))

  const [pending] = await db
    .select({ c: count() })
    .from(cpAgentAiFeedback)
    .where(sql`${cpAgentAiFeedback.helpful} IS NULL`)

  return [
    { outcome: "helpful", count: Number(helpful?.c ?? 0) },
    { outcome: "not_helpful", count: Number(notHelpful?.c ?? 0) },
    { outcome: "pending", count: Number(pending?.c ?? 0) },
  ]
}

// TODO: move dashboard metrics to CarePilot API layer in next backend hardening phase.
export async function cpAgentDashboardTopMetrics() {
  const db = getDb()

  const openScope = operationalCareTicketScope(
    sql`${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_SQL)})`,
  )

  const openRows = await db
    .select({
      id: cpAgentTickets.id,
      priority: cpAgentTickets.priority,
      status: cpAgentTickets.status,
      slaDueAt: cpAgentTickets.slaDueAt,
      createdAt: cpAgentTickets.createdAt,
      externalCreatedAt: cpAgentTickets.externalCreatedAt,
      ttrTargetHours: cpAgentTickets.ttrTargetHours,
    })
    .from(cpAgentTickets)
    .where(openScope)

  const slaPredRows = await db
    .select({
      ticketId: cpAgentAiSlaPredictions.ticketId,
      riskLevel: cpAgentAiSlaPredictions.riskLevel,
    })
    .from(cpAgentAiSlaPredictions)
    .orderBy(desc(cpAgentAiSlaPredictions.createdAt))

  const slaRiskByTicket = new Map<number, string>()
  for (const row of slaPredRows) {
    if (!slaRiskByTicket.has(row.ticketId)) slaRiskByTicket.set(row.ticketId, row.riskLevel)
  }

  let slaAtRisk = 0
  let actionRequired = 0
  for (const row of openRows) {
    const exposure = classifySlaExposure({
      status: row.status,
      priority: row.priority,
      slaDueAt: row.slaDueAt,
      createdAt: row.createdAt,
      externalCreatedAt: row.externalCreatedAt,
      ttrTargetHours: row.ttrTargetHours,
    })

    if (isOrchestratedSlaAttention(exposure.label, slaRiskByTicket.get(row.id))) {
      slaAtRisk++
    }

    const priority = row.priority.toUpperCase()
    const waitingStatus = ["IN_PROGRESS", "WAITING_STORE", "SUSPENDED", "MONITORING"].includes(row.status)
    if (
      priority === "P1" ||
      priority === "P2" ||
      waitingStatus ||
      exposure.bucket === "breached" ||
      exposure.bucket === "at_risk"
    ) {
      actionRequired++
    }
  }

  const [fbTotal] = await db
    .select({ c: count() })
    .from(cpAgentAiFeedback)
    .where(isNotNull(cpAgentAiFeedback.helpful))

  const [fbHelpful] = await db
    .select({ c: count() })
    .from(cpAgentAiFeedback)
    .where(eq(cpAgentAiFeedback.helpful, true))

  const aiAccuracyPct =
    fbTotal && Number(fbTotal.c) > 0
      ? Math.round((100 * Number(fbHelpful?.c ?? 0)) / Number(fbTotal.c))
      : null

  return {
    openTickets: openRows.length,
    slaAtRisk,
    actionRequired,
    aiAccuracyPct,
  }
}

export type CpAgentTicketListRow = import("@/lib/carepilot-api/tickets").AgentTicketListItem

export type CpAgentTicketFilters = {
  q?: string
  assignedUserId?: string
  quickFilter?: import("@/lib/agent/ticket-queue-display").TicketQueueQuickFilter
}

export async function cpAgentListTickets(filters: CpAgentTicketFilters) {
  const { listSynchronizedTickets } = await import("@/lib/carepilot-api/tickets")
  const { items } = await listSynchronizedTickets(filters)
  return items
}

/** @deprecated Use GET /api/tickets/filters */
export async function cpAgentFilterOptions() {
  const { getTicketFilterOptions } = await import("@/lib/carepilot-api/ticket-filters")
  return getTicketFilterOptions()
}

export async function cpAgentHighRiskTickets(limit = 8) {
  const db = getDb()
  const rows = await db
    .select({
      ticket: cpAgentTickets,
      assigneeName: cpAgentUsers.displayName,
    })
    .from(cpAgentTickets)
    .leftJoin(cpAgentUsers, eq(cpAgentTickets.assignedUserId, cpAgentUsers.id))
    .where(
      operationalCareTicketScope(sql`${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_SQL)})`),
    )

  const ranked = rows
    .map((r) => {
      const exposure = classifySlaExposure({
        status: r.ticket.status,
        priority: r.ticket.priority,
        slaDueAt: r.ticket.slaDueAt,
        createdAt: r.ticket.createdAt,
        externalCreatedAt: r.ticket.externalCreatedAt,
        ttrTargetHours: r.ticket.ttrTargetHours,
      })
      const priorityScore =
        r.ticket.priority === "P1" ? 40 : r.ticket.priority === "P2" ? 30 : r.ticket.status === "ESCALATED_N3" ? 25 : 0
      const slaScore =
        exposure.bucket === "breached" ? 30 : exposure.bucket === "at_risk" ? 20 : 0
      return { ...r, score: priorityScore + slaScore, exposure }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.exposure.remainingMs ?? 0) - (b.exposure.remainingMs ?? 0))
    .slice(0, limit)

  return ranked.map((r) => ({
    ...r.ticket,
    title: englishLegacyCopy(r.ticket.title),
    description: englishLegacyCopy(r.ticket.description),
    assigneeName: r.assigneeName,
  }))
}

export async function cpAgentRecentActivity(limit = 12) {
  const db = getDb()
  const rows = await db
    .select({
      id: cpAgentTicketHistory.id,
      ticketId: cpAgentTicketHistory.ticketId,
      careId: cpAgentTickets.careId,
      eventType: cpAgentTicketHistory.eventType,
      summary: cpAgentTicketHistory.summary,
      actorLabel: cpAgentTicketHistory.actorLabel,
      occurredAt: cpAgentTicketHistory.occurredAt,
    })
    .from(cpAgentTicketHistory)
    .innerJoin(cpAgentTickets, eq(cpAgentTicketHistory.ticketId, cpAgentTickets.id))
    .where(operationalCareTicketScope())
    .orderBy(desc(cpAgentTicketHistory.occurredAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    summary: englishLegacyCopy(r.summary),
  }))
}

export async function cpAgentRecentRecommendations(limit = 10) {
  const db = getDb()
  const rows = await db
    .select({
      ticketId: cpAgentAiAnalyses.ticketId,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      confidence: cpAgentAiAnalyses.confidence,
      suggestedAction: cpAgentAiAnalyses.suggestedAction,
      createdAt: cpAgentAiAnalyses.createdAt,
    })
    .from(cpAgentAiAnalyses)
    .innerJoin(cpAgentTickets, eq(cpAgentAiAnalyses.ticketId, cpAgentTickets.id))
    .orderBy(desc(cpAgentAiAnalyses.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    title: englishLegacyCopy(r.title),
    suggestedAction: englishLegacyCopy(r.suggestedAction),
  }))
}

export async function cpAgentKmInsights(limit = 8) {
  const db = getDb()
  const rows = await db
    .select({
      kmCode: cpAgentKmSuggestions.kmCode,
      title: cpAgentKmSuggestions.title,
      relevanceScore: cpAgentKmSuggestions.relevanceScore,
      careId: cpAgentTickets.careId,
      ticketTitle: cpAgentTickets.title,
    })
    .from(cpAgentKmSuggestions)
    .innerJoin(cpAgentTickets, eq(cpAgentKmSuggestions.ticketId, cpAgentTickets.id))
    .orderBy(desc(cpAgentKmSuggestions.relevanceScore))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    title: englishLegacyCopy(r.title),
    ticketTitle: englishLegacyCopy(r.ticketTitle),
  }))
}

/** AI analysis, per-ticket KM suggestions, feedback, and related incidents (not CARE sync). */
export async function cpAgentGetTicketAiEnrichment(ticketId: number, ticketCategory?: string) {
  const db = getDb()

  const [ticketRow] = await db
    .select()
    .from(cpAgentTickets)
    .where(eq(cpAgentTickets.id, ticketId))
    .limit(1)

  let category = ticketCategory ?? ticketRow?.category

  const [analysisRow] = await db
    .select()
    .from(cpAgentAiAnalyses)
    .where(eq(cpAgentAiAnalyses.ticketId, ticketId))
    .limit(1)

  const actionLabels: Record<string, string> = {
    resolve: "Resolve",
    transfer: "Transfer",
    escalate: "Escalate N3",
    suspend: "Suspend",
    apply_km: "Apply knowledge article",
  }

  const analysis =
    analysisRow ??
    (ticketRow?.aiRecommendedAction
      ? {
          id: -1,
          ticketId,
          confidence: ticketRow.aiConfidence ?? 0.75,
          detectedIssue: englishLegacyCopy(ticketRow.title),
          suggestedAction:
            actionLabels[ticketRow.aiRecommendedAction] ?? ticketRow.aiRecommendedAction,
          reasoning: englishLegacyCopy(ticketRow.aiReason ?? ""),
          missingInfo: [] as string[],
          isActive: true,
          createdAt: ticketRow.updatedAt,
        }
      : null)

  const [km, feedback, related] = await Promise.all([
    db
      .select()
      .from(cpAgentKmSuggestions)
      .where(eq(cpAgentKmSuggestions.ticketId, ticketId))
      .orderBy(asc(cpAgentKmSuggestions.rank)),
    db
      .select()
      .from(cpAgentAiFeedback)
      .where(eq(cpAgentAiFeedback.ticketId, ticketId))
      .orderBy(desc(cpAgentAiFeedback.createdAt)),
    category
      ? db
          .select({
            id: cpAgentTickets.id,
            careId: cpAgentTickets.careId,
            title: cpAgentTickets.title,
            status: cpAgentTickets.status,
            priority: cpAgentTickets.priority,
          })
          .from(cpAgentTickets)
          .where(and(ne(cpAgentTickets.id, ticketId), eq(cpAgentTickets.category, category)))
          .orderBy(desc(cpAgentTickets.updatedAt))
          .limit(6)
      : Promise.resolve([]),
  ])

  const analysisNorm = analysis
    ? {
        ...analysis,
        detectedIssue: englishLegacyCopy(analysis.detectedIssue),
        suggestedAction: englishLegacyCopy(analysis.suggestedAction),
        reasoning: englishLegacyCopy(analysis.reasoning),
        missingInfo: Array.isArray(analysis.missingInfo)
          ? (analysis.missingInfo as string[]).map((s) => englishLegacyCopy(s))
          : analysis.missingInfo,
      }
    : null

  const relatedNorm = related.map((r) => ({
    ...r,
    title: englishLegacyCopy(r.title),
  }))

  const kmNorm = km.map((k) => ({
    ...k,
    title: englishLegacyCopy(k.title),
    summary: englishLegacyCopy(k.summary),
    steps: englishLegacyCopy(k.steps),
  }))

  const feedbackNorm = feedback.map((f) => ({
    ...f,
    comment: f.comment ? englishLegacyCopy(f.comment) : null,
  }))

  return {
    analysis: analysisNorm,
    km: kmNorm,
    feedback: feedbackNorm,
    relatedIncidents: relatedNorm,
  }
}

/** @deprecated Prefer loadAgentTicketDetailPage (CarePilot APIs) for synchronized fields. */
export async function cpAgentGetTicketDetail(ticketId: number) {
  const db = getDb()
  const [row] = await db
    .select({
      ticket: cpAgentTickets,
      assigneeName: cpAgentUsers.displayName,
      assigneeEmail: cpAgentUsers.email,
    })
    .from(cpAgentTickets)
    .leftJoin(cpAgentUsers, eq(cpAgentTickets.assignedUserId, cpAgentUsers.id))
    .where(eq(cpAgentTickets.id, ticketId))
    .limit(1)

  if (!row || isDemoCareTicketId(row.ticket.careId)) return null

  const ticket = {
    ...row.ticket,
    title: englishLegacyCopy(row.ticket.title),
    description: englishLegacyCopy(row.ticket.description),
  }

  const ai = await cpAgentGetTicketAiEnrichment(ticketId, ticket.category)

  const history = await db
    .select()
    .from(cpAgentTicketHistory)
    .where(eq(cpAgentTicketHistory.ticketId, ticketId))
    .orderBy(desc(cpAgentTicketHistory.occurredAt))

  const historyNorm = history.map((h) => ({
    ...h,
    summary: englishLegacyCopy(h.summary),
    detail: h.detail ? englishLegacyCopy(h.detail) : null,
  }))

  return {
    ticket,
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
    analysis: ai.analysis,
    history: historyNorm,
    km: ai.km,
    feedback: ai.feedback,
    relatedIncidents: ai.relatedIncidents,
  }
}

export async function cpAgentLatestSyncLog() {
  const db = getDb()
  const [row] = await db
    .select()
    .from(cpAgentSyncLogs)
    .orderBy(desc(cpAgentSyncLogs.syncStartedAt))
    .limit(1)
  return row ?? null
}

export function cpAgentSlaExposure(input: SlaExposureInput): SlaExposureResult {
  return classifySlaExposure(input)
}

export function cpAgentSlaLabel(
  slaDueAt: Date | null,
  status: string,
  context?: Omit<SlaExposureInput, "slaDueAt" | "status">,
): { label: string; tone: "critical" | "warning" | "success" | "neutral" } {
  const result = classifySlaExposure({
    slaDueAt,
    status,
    priority: context?.priority,
    createdAt: context?.createdAt,
    externalCreatedAt: context?.externalCreatedAt,
    ttrTargetHours: context?.ttrTargetHours,
    now: context?.now,
  })
  return { label: result.label, tone: result.tone }
}
