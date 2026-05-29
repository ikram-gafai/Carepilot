import { eq } from "drizzle-orm"

import {
  buildSimilarTicketPreviewSeeds,
  careIdForCatalogIndex,
  SIMILAR_TICKET_PREVIEW_METHOD,
} from "@/lib/care-operational/similar-ticket-preview-seed"
import { getDb } from "@/lib/db"
import { cpAgentAiSimilarTicketResults, cpAgentTickets } from "@/lib/db/schema/cp-agent"

export type SeedSimilarTicketPreviewResult = {
  ticketsMatched: number
  resultsWritten: number
  ticketsWithResults: number
}

/** Upsert stable historical reference rows for synchronized CARE operational tickets. */
export async function seedSimilarTicketPreview(): Promise<SeedSimilarTicketPreviewResult> {
  const db = getDb()
  const tickets = await db
    .select({ id: cpAgentTickets.id, careId: cpAgentTickets.careId })
    .from(cpAgentTickets)
    .where(eq(cpAgentTickets.source, "CARE"))

  const idByCatalogIndex = new Map<number, number>()
  for (const ticket of tickets) {
    const match = ticket.careId.match(/^CARE-OP-(\d{5})$/)
    if (!match) continue
    idByCatalogIndex.set(Number(match[1]) - 1, ticket.id)
  }

  const seeds = buildSimilarTicketPreviewSeeds()
  const now = new Date()
  const values: (typeof cpAgentAiSimilarTicketResults.$inferInsert)[] = []
  const ticketIdsWithResults = new Set<number>()

  for (const seed of seeds) {
    const ticketId = idByCatalogIndex.get(seed.queryCatalogIndex)
    const similarTicketId = idByCatalogIndex.get(seed.similarCatalogIndex)
    if (ticketId == null || similarTicketId == null) continue

    values.push({
      ticketId,
      similarTicketId,
      similarityScore: seed.similarityScore,
      retrievalMethod: SIMILAR_TICKET_PREVIEW_METHOD,
      rankPosition: seed.rankPosition,
      linkedResolution: seed.linkedResolution,
      linkedAction: seed.linkedAction,
      linkedKmId: seed.linkedKmId,
      updatedAt: now,
    })
    ticketIdsWithResults.add(ticketId)
  }

  await db.delete(cpAgentAiSimilarTicketResults)
  if (values.length > 0) {
    await db.insert(cpAgentAiSimilarTicketResults).values(values)
  }

  return {
    ticketsMatched: idByCatalogIndex.size,
    resultsWritten: values.length,
    ticketsWithResults: ticketIdsWithResults.size,
  }
}

export function missingCareIdsForPreview(): string[] {
  const seeds = buildSimilarTicketPreviewSeeds()
  const required = new Set<number>()
  for (const seed of seeds) {
    required.add(seed.queryCatalogIndex)
    required.add(seed.similarCatalogIndex)
  }
  return [...required].sort((a, b) => a - b).map(careIdForCatalogIndex)
}
