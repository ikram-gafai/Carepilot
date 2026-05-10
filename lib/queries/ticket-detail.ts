import { asc, desc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import type { Db } from "@/lib/db"
import {
  careSourceTickets,
  kmProcedures,
  ticketActions,
  ticketComments,
} from "@/lib/db/schema/care-source"
import {
  carepilotTickets,
  decisionSuggestions,
  kmRecommendations,
  similarTicketResults,
  ticketAnalysis,
  ticketTimelineEvents,
} from "@/lib/db/schema/carepilot"

export type MergedTimelineEntry = {
  occurredAt: Date
  kind: string
  title: string
  subtitle?: string | null
}

const PIPELINE_EVENT_LABELS: Record<string, string> = {
  ai_analysis: "Analyse IA",
  embedding: "Embedding ticket (pgvector)",
  similar_tickets: "Recherche tickets similaires",
  km_recommendation: "Recommandations KM",
  escalation_transfer_suggestion: "Escalade & transfert — suggestion IA",
  agent_override: "Décision agent (override)",
}

export async function loadTicketDetail(db: Db, carepilotTicketId: number) {
  const cpRows = await db
    .select()
    .from(carepilotTickets)
    .where(eq(carepilotTickets.id, carepilotTicketId))
    .limit(1)

  const cp = cpRows[0]
  if (!cp) return null

  const srcRows = await db
    .select()
    .from(careSourceTickets)
    .where(eq(careSourceTickets.id, cp.sourceTicketId))
    .limit(1)

  const src = srcRows[0]

  const analysisRows = await db
    .select()
    .from(ticketAnalysis)
    .where(eq(ticketAnalysis.ticketId, carepilotTicketId))
    .limit(1)

  /** Both schemas use table name `tickets`; Drizzle must not reuse alias `tickets` twice. */
  const similarCpTicket = alias(carepilotTickets, "similar_cp_ticket")
  const similarSrcTicket = alias(careSourceTickets, "similar_src_ticket")

  const similar = await db
    .select({
      rank: similarTicketResults.rank,
      score: similarTicketResults.similarityScore,
      referenceNote: similarTicketResults.referenceNote,
      similarId: similarTicketResults.similarTicketId,
      careRef: similarSrcTicket.careTicketId,
    })
    .from(similarTicketResults)
    .innerJoin(
      similarCpTicket,
      eq(similarTicketResults.similarTicketId, similarCpTicket.id),
    )
    .innerJoin(
      similarSrcTicket,
      eq(similarCpTicket.sourceTicketId, similarSrcTicket.id),
    )
    .where(eq(similarTicketResults.ticketId, carepilotTicketId))
    .orderBy(asc(similarTicketResults.rank))

  const kmRecos = await db
    .select({
      rank: kmRecommendations.rank,
      score: kmRecommendations.score,
      explanation: kmRecommendations.explanation,
      whyFactors: kmRecommendations.whyFactors,
      kmCode: kmProcedures.kmCode,
      kmTitle: kmProcedures.title,
    })
    .from(kmRecommendations)
    .innerJoin(kmProcedures, eq(kmRecommendations.kmId, kmProcedures.id))
    .where(eq(kmRecommendations.ticketId, carepilotTicketId))
    .orderBy(asc(kmRecommendations.rank))

  const decisions = await db
    .select()
    .from(decisionSuggestions)
    .where(eq(decisionSuggestions.ticketId, carepilotTicketId))
    .orderBy(desc(decisionSuggestions.createdAt))
    .limit(3)

  const timelineParts = await buildMergedTimeline(db, cp)

  return {
    ticket: cp,
    source: src,
    analysis: analysisRows[0] ?? null,
    similar,
    kmRecos,
    decisions,
    timeline: timelineParts,
  }
}

async function buildMergedTimeline(
  db: Db,
  cp: typeof carepilotTickets.$inferSelect,
): Promise<MergedTimelineEntry[]> {
  const entries: MergedTimelineEntry[] = []

  entries.push({
    occurredAt: cp.createdAt,
    kind: "ticket_created",
    title: "Ticket synchronisé dans CAREPILOT",
    subtitle: `Réf. source CARE id ${cp.sourceTicketId} — copie opérationnelle pour analyse.`,
  })

  if (!cp.sourceTicketId) return entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())

  const comments = await db
    .select()
    .from(ticketComments)
    .where(eq(ticketComments.ticketId, cp.sourceTicketId))
    .orderBy(asc(ticketComments.createdAt))

  for (const c of comments) {
    entries.push({
      occurredAt: c.createdAt,
      kind: "comment",
      title: `Commentaire (${c.authorRole})`,
      subtitle: c.content,
    })
  }

  const actions = await db
    .select()
    .from(ticketActions)
    .where(eq(ticketActions.ticketId, cp.sourceTicketId))
    .orderBy(asc(ticketActions.createdAt))

  for (const a of actions) {
    const isKm = a.actionType === "KM_APPLY"
    entries.push({
      occurredAt: a.createdAt,
      kind: isKm ? "km_apply" : "action",
      title: isKm ? `${a.description}` : `Action — ${a.actionType}`,
      subtitle: a.result ? `Résultat: ${a.result}` : a.description,
    })
  }

  const aiRows = await db
    .select()
    .from(ticketTimelineEvents)
    .where(eq(ticketTimelineEvents.ticketId, cp.id))
    .orderBy(asc(ticketTimelineEvents.occurredAt))

  for (const e of aiRows) {
    const prefix = PIPELINE_EVENT_LABELS[e.eventType]
    entries.push({
      occurredAt: e.occurredAt,
      kind: e.eventType,
      title: prefix ? `${prefix} — ${e.summary}` : e.summary,
      subtitle: e.detail ?? null,
    })
  }

  return entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
}
