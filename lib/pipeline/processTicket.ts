import { desc, eq, inArray } from "drizzle-orm"

import { getEmbeddingClient } from "@/lib/ai/embeddings"
import { getLlmClient } from "@/lib/ai/llm"
import { analyzeTicketHeuristic } from "@/lib/analysis/heuristic"
import type { Db } from "@/lib/db"
import {
  careSourceTickets,
  kmProcedures,
  ticketActions,
} from "@/lib/db/schema/care-source"
import {
  carepilotTickets,
  decisionSuggestions,
  embeddings,
  kmRecommendations,
  similarTicketResults,
  ticketAnalysis,
} from "@/lib/db/schema/carepilot"
import { appendTimelineEvent } from "@/lib/pipeline/timeline"
import { buildDecisionSignals, suggestEscalationTransfer } from "@/lib/rules/engine"
import { searchKmProcedures, searchSimilarTickets } from "@/lib/vector/index"

async function fetchCpTicket(db: Db, carepilotTicketId: number) {
  const rows = await db
    .select()
    .from(carepilotTickets)
    .where(eq(carepilotTickets.id, carepilotTicketId))
    .limit(1)
  return rows[0] ?? null
}

async function fetchSourceTicket(db: Db, sourceTicketId: number) {
  const rows = await db
    .select()
    .from(careSourceTickets)
    .where(eq(careSourceTickets.id, sourceTicketId))
    .limit(1)
  return rows[0] ?? null
}

/** Étapes séparées : analyse → embeddings → retrieval → KM → règles (pas de pipeline monolithique). */
export async function runAiPipelineForTicket(db: Db, carepilotTicketId: number) {
  const cp = await fetchCpTicket(db, carepilotTicketId)
  if (!cp) throw new Error("Ticket introuvable")

  const src = await fetchSourceTicket(db, cp.sourceTicketId)
  if (!src) throw new Error("Ticket source introuvable")

  const actions = await db
    .select()
    .from(ticketActions)
    .where(eq(ticketActions.ticketId, src.id))
    .orderBy(desc(ticketActions.createdAt))

  const actionsSummary = actions.map((a) => `${a.actionType}: ${a.description}`)

  const heuristic = analyzeTicketHeuristic({
    rawText: cp.rawText,
    source: src,
    actionsSummary,
  })

  const llm = getLlmClient()
  const aiSummary =
    (await llm.summarizeTicket({ title: src.title, description: src.description })) ||
    heuristic.detectedProblemType ||
    "Résumé indisponible"

  await db.delete(ticketAnalysis).where(eq(ticketAnalysis.ticketId, carepilotTicketId))
  await db.insert(ticketAnalysis).values({
    ticketId: carepilotTicketId,
    extractedEntities: heuristic.extractedEntities,
    missingFields: heuristic.missingFields,
    operationalTags: heuristic.operationalTags,
    detectedProblemType: heuristic.detectedProblemType,
    detectedActions: heuristic.detectedActions,
    aiSummary,
    confidenceScore: 0.72,
  })

  await appendTimelineEvent(db, {
    ticketId: carepilotTicketId,
    eventType: "ai_analysis",
    summary: "Analyse ticket enregistrée",
    detail: aiSummary.slice(0, 500),
  })

  const embedClient = getEmbeddingClient()
  const ticketVec = await embedClient.embed(cp.rawText)

  await db
    .insert(embeddings)
    .values({
      sourceType: "ticket",
      sourceId: String(carepilotTicketId),
      embedding: ticketVec,
      modelName: embedClient.modelName,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [embeddings.sourceType, embeddings.sourceId, embeddings.modelName],
      set: {
        embedding: ticketVec,
        updatedAt: new Date(),
      },
    })

  await appendTimelineEvent(db, {
    ticketId: carepilotTicketId,
    eventType: "embedding",
    summary: "Embedding ticket mis à jour",
    metadata: { model: embedClient.modelName },
  })

  await db
    .delete(similarTicketResults)
    .where(eq(similarTicketResults.ticketId, carepilotTicketId))

  const similarHits = await searchSimilarTickets({
    queryVector: ticketVec,
    excludeTicketId: String(carepilotTicketId),
    limit: 10,
  })

  let rank = 1
  const similarCpIds: number[] = []
  for (const h of similarHits) {
    const sid = Number.parseInt(h.sourceId, 10)
    if (Number.isNaN(sid)) continue
    similarCpIds.push(sid)

    const simRows = await db
      .select({
        careId: careSourceTickets.careTicketId,
        perimeter: carepilotTickets.perimeter,
        cash: carepilotTickets.cashRegisterCode,
      })
      .from(carepilotTickets)
      .innerJoin(careSourceTickets, eq(carepilotTickets.sourceTicketId, careSourceTickets.id))
      .where(eq(carepilotTickets.id, sid))
      .limit(1)

    const meta = simRows[0]
    const referenceNote = meta
      ? `Similar to Ticket #${meta.careId} — périmètre ${meta.perimeter}${meta.cash ? `, caisse ${meta.cash}` : ""}`
      : `Similar ticket interne id=${sid}`

    await db.insert(similarTicketResults).values({
      ticketId: carepilotTicketId,
      similarTicketId: sid,
      similarityScore: Math.min(0.94, Math.max(0.35, h.score)),
      rank: rank++,
      referenceNote,
    })
  }

  const tagSet = new Set(heuristic.operationalTags)
  if (similarHits.length >= 2) tagSet.add("Repeated incident")
  if (similarHits.length > 0) tagSet.add("Similar incidents found")

  await db
    .update(ticketAnalysis)
    .set({ operationalTags: [...tagSet] })
    .where(eq(ticketAnalysis.ticketId, carepilotTicketId))

  await appendTimelineEvent(db, {
    ticketId: carepilotTicketId,
    eventType: "similar_tickets",
    summary: `${similarHits.length} ticket(s) similaire(s) détecté(s)`,
  })

  await db.delete(kmRecommendations).where(eq(kmRecommendations.ticketId, carepilotTicketId))

  const kmHits = await searchKmProcedures({ queryVector: ticketVec, limit: 8 })
  let kmRank = 1
  for (const h of kmHits) {
    const kmId = Number.parseInt(h.sourceId, 10)
    if (Number.isNaN(kmId)) continue
    const kmRows = await db
      .select({
        title: kmProcedures.title,
        perimeter: kmProcedures.perimeter,
        kmCode: kmProcedures.kmCode,
      })
      .from(kmProcedures)
      .where(eq(kmProcedures.id, kmId))
      .limit(1)

    const km = kmRows[0]
    const explanation = km
      ? `KM existante ${km.kmCode} (${km.title}) — similarité sémantique avec le ticket.`
      : "KM candidate via similarité sémantique."

    const whyFactors = [
      km ? `Procédure ${km.kmCode} — périmètre ${km.perimeter}` : "Alignement sémantique",
      heuristic.detectedProblemType ? `Type détecté: ${heuristic.detectedProblemType}` : "",
    ].filter(Boolean)

    await db.insert(kmRecommendations).values({
      ticketId: carepilotTicketId,
      kmId,
      score: Math.min(0.93, Math.max(0.38, h.score)),
      rank: kmRank++,
      explanation,
      whyFactors,
    })
  }

  if (kmHits.length > 0) tagSet.add("KM available")

  await db
    .update(ticketAnalysis)
    .set({ operationalTags: [...tagSet] })
    .where(eq(ticketAnalysis.ticketId, carepilotTicketId))

  await appendTimelineEvent(db, {
    ticketId: carepilotTicketId,
    eventType: "km_recommendation",
    summary: `${kmHits.length} reco KM calculée(s)`,
  })

  await db
    .delete(decisionSuggestions)
    .where(eq(decisionSuggestions.ticketId, carepilotTicketId))

  const similarFinalActions =
    similarCpIds.length === 0
      ? []
      : await db
          .select({ finalAction: careSourceTickets.finalAction })
          .from(carepilotTickets)
          .innerJoin(careSourceTickets, eq(carepilotTickets.sourceTicketId, careSourceTickets.id))
          .where(inArray(carepilotTickets.id, similarCpIds))

  const signals = buildDecisionSignals({
    analysis: heuristic,
    appliedKmCode: src.appliedKmCode,
    kmApplicable: src.kmApplicable,
    similarTicketsMeta: similarFinalActions.map((r) => ({
      finalAction: r.finalAction,
    })),
  })

  const decision = suggestEscalationTransfer(signals)

  await db.insert(decisionSuggestions).values({
    ticketId: carepilotTicketId,
    suggestedAction: decision.suggestedAction,
    reason: decision.reason,
    whyFactors: decision.whyFactors,
    blockingRules: decision.blockingRules,
    confidenceScore: decision.confidenceScore,
  })

  await appendTimelineEvent(db, {
    ticketId: carepilotTicketId,
    eventType: "escalation_transfer_suggestion",
    summary: `Suggestion: ${decision.suggestedAction}`,
    detail: decision.reason,
    metadata: { blockingRules: decision.blockingRules },
  })

  const escalationCandidate =
    /escalade|n3|transfert/i.test(decision.suggestedAction) ||
    decision.blockingRules.some((b) => /escalade|n3/i.test(b))

  if (escalationCandidate) tagSet.add("Escalation candidate")

  await db
    .update(ticketAnalysis)
    .set({ operationalTags: [...tagSet] })
    .where(eq(ticketAnalysis.ticketId, carepilotTicketId))

  return {
    similarCount: similarHits.length,
    kmCount: kmHits.length,
  }
}
