import { eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { cpAgentTicketHistory } from "@/lib/db/schema/cp-agent"
import type { CareClient } from "@/lib/integrations/care/care-client"
import { historyToSyncRow } from "@/lib/integrations/care/normalizers"
import type { SyncCounters } from "./sync-logger"

function isNewer(careUpdated: Date, localUpdated: Date | null) {
  if (!localUpdated) return true
  return careUpdated.getTime() > localUpdated.getTime()
}

export async function syncHistoryFromCare(
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
    let events
    try {
      events = await client.getTicketHistory(externalTicketId)
    } catch (e) {
      errors.push({
        entity: "history",
        id: externalTicketId,
        message: e instanceof Error ? e.message : String(e),
      })
      counters.failed++
      continue
    }

    for (const event of events.items) {
      try {
        const row = historyToSyncRow(ticketDbId, event)
        const [existing] = await db
          .select({ id: cpAgentTicketHistory.id, externalUpdatedAt: cpAgentTicketHistory.externalUpdatedAt })
          .from(cpAgentTicketHistory)
          .where(eq(cpAgentTicketHistory.externalId, row.externalId))
          .limit(1)

        if (!existing) {
          await db.insert(cpAgentTicketHistory).values({
            ...row,
            lastSyncedAt: now,
          })
          counters.inserted++
          continue
        }

        if (!isNewer(row.externalUpdatedAt, existing.externalUpdatedAt)) {
          counters.skipped++
          continue
        }

        await db
          .update(cpAgentTicketHistory)
          .set({ ...row, lastSyncedAt: now })
          .where(eq(cpAgentTicketHistory.id, existing.id))
        counters.updated++
      } catch (e) {
        counters.failed++
        errors.push({
          entity: "history_event",
          id: event.id,
          message: e instanceof Error ? e.message : String(e),
        })
      }
    }
  }
}
