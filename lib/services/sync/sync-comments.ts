import { eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { cpAgentTicketComments } from "@/lib/db/schema/cp-agent"
import type { CareClient } from "@/lib/integrations/care/care-client"
import { commentToSyncRow } from "@/lib/integrations/care/normalizers"
import type { SyncCounters } from "./sync-logger"

function isNewer(careUpdated: Date, localUpdated: Date | null) {
  if (!localUpdated) return true
  return careUpdated.getTime() > localUpdated.getTime()
}

export async function syncCommentsFromCare(
  db: Db,
  client: CareClient,
  ticketIdByExternal: Map<string, number>,
  changedExternalIds: string[],
  counters: SyncCounters,
  errors: { entity: string; id: string; message: string }[],
) {
  const now = new Date()
  const batchLimit = Number(process.env.SYNC_DETAILS_BATCH ?? "15")
  const targets = changedExternalIds.slice(0, Math.max(1, batchLimit))

  for (const externalTicketId of targets) {
    const ticketDbId = ticketIdByExternal.get(externalTicketId)
    if (ticketDbId == null) continue
    let comments
    try {
      comments = await client.getTicketComments(externalTicketId)
    } catch (e) {
      errors.push({
        entity: "comments",
        id: externalTicketId,
        message: e instanceof Error ? e.message : String(e),
      })
      counters.failed++
      continue
    }

    for (const comment of comments.items) {
      try {
        const row = commentToSyncRow(ticketDbId, comment)
        const [existing] = await db
          .select({ id: cpAgentTicketComments.id, externalUpdatedAt: cpAgentTicketComments.externalUpdatedAt })
          .from(cpAgentTicketComments)
          .where(eq(cpAgentTicketComments.externalId, row.externalId))
          .limit(1)

        if (!existing) {
          await db.insert(cpAgentTicketComments).values({
            ...row,
            lastSyncedAt: now,
            updatedAt: now,
          })
          counters.inserted++
          continue
        }

        if (!isNewer(row.externalUpdatedAt, existing.externalUpdatedAt)) {
          counters.skipped++
          continue
        }

        await db
          .update(cpAgentTicketComments)
          .set({ ...row, lastSyncedAt: now, updatedAt: now })
          .where(eq(cpAgentTicketComments.id, existing.id))
        counters.updated++
      } catch (e) {
        counters.failed++
        errors.push({
          entity: "comment",
          id: comment.id,
          message: e instanceof Error ? e.message : String(e),
        })
      }
    }
  }
}
