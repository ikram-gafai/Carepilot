/**
 * Run CARE → cp_agent synchronization without starting the Next.js server.
 * Usage: bun run db:sync
 */
import "./load-env"

import { careListTickets } from "@/lib/care-api/store"
import { getOperationalSyncSummary } from "@/lib/care-operational/sync-stats"
import { getDb } from "@/lib/db"
import { syncCommentsFromCare } from "@/lib/services/sync/sync-comments"
import { syncHistoryFromCare } from "@/lib/services/sync/sync-history"
import { syncKmFromCare } from "@/lib/services/sync/sync-km"
import { finishSyncLog, startSyncLog, type SyncCounters } from "@/lib/services/sync/sync-logger"
import { syncTicketsFromCare } from "@/lib/services/sync/sync-tickets"
import { refreshOperationalSlaTimestamps } from "@/lib/care-operational/refresh-sla-timestamps"

async function main() {
  const db = getDb()
  const counters: SyncCounters = { inserted: 0, updated: 0, skipped: 0, failed: 0 }
  const errors: { entity: string; id: string; message: string }[] = []

  const client = {
    async getAllTickets() {
      const pageSize = 100
      const items = []
      let offset = 0
      let total = 0
      for (;;) {
        const page = await careListTickets({ limit: pageSize, offset })
        if (offset === 0) total = page.total
        items.push(...page.items)
        offset += page.items.length
        if (page.items.length === 0 || items.length >= total) break
      }
      return { items, total: Math.max(total, items.length) }
    },
    async getTicketHistory() {
      return { items: [], total: 0 }
    },
    async getTicketComments() {
      return { items: [], total: 0 }
    },
    async getKmList() {
      return { items: [], total: 0 }
    },
  }

  const { logId, started } = await startSyncLog(db, "cli")
  try {
    const ticketSync = await syncTicketsFromCare(db, client, counters, errors)
    await syncHistoryFromCare(db, client, ticketSync.ticketIdByExternal, ticketSync.changedExternalIds, counters, errors)
    await syncCommentsFromCare(db, client, ticketSync.ticketIdByExternal, ticketSync.changedExternalIds, counters, errors)
    await syncKmFromCare(db, client, counters, errors)
    await refreshOperationalSlaTimestamps(db)

    const status = errors.length === 0 ? "success" : counters.inserted + counters.updated > 0 ? "partial_success" : "failed"
    await finishSyncLog(db, logId, started, status, counters, {
      errorMessage: errors[0]?.message,
      metadata: { errors, careSourceTotal: ticketSync.careSourceTotal },
    })

    const summary = await getOperationalSyncSummary()
    console.log("Sync finished:", { status, ...counters, errors: errors.length })
    console.log("Operational summary:", summary)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await finishSyncLog(db, logId, started, "failed", counters, { errorMessage: msg })
    throw e
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
