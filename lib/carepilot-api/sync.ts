import { count, desc } from "drizzle-orm"

import { getDb } from "@/lib/db"
import {
  cpAgentKmReferences,
  cpAgentSyncLogs,
  cpAgentTicketComments,
  cpAgentTicketHistory,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

import { loadSyncHealthMetrics } from "./metrics"

export async function getSyncStatus() {
  const db = getDb()
  const syncMetrics = await loadSyncHealthMetrics()
  const latest = syncMetrics.latestLog
  const lastSuccess = syncMetrics.lastIngestionLog
  const running = syncMetrics.running
  const health = {
    level: syncMetrics.level,
    label: syncMetrics.label,
    lastIngestionAt: syncMetrics.lastIngestionAt,
    reason: syncMetrics.reason,
  }

  const [[tickets], [history], [comments], [km]] = await Promise.all([
    db.select({ c: count() }).from(cpAgentTickets),
    db.select({ c: count() }).from(cpAgentTicketHistory),
    db.select({ c: count() }).from(cpAgentTicketComments),
    db.select({ c: count() }).from(cpAgentKmReferences),
  ])

  return {
    running,
    health: health.level,
    healthLabel: health.label,
    healthReason: health.reason ?? null,
    lastIngestionAt: health.lastIngestionAt,
    lastSync: latest
      ? {
          id: latest.id,
          status: latest.status,
          startedAt: latest.syncStartedAt,
          finishedAt: latest.syncFinishedAt,
          inserted: latest.insertedCount ?? latest.recordsImported,
          updated: latest.updatedCount ?? latest.recordsUpdated,
          skipped: latest.skippedCount ?? 0,
          failed: latest.failedCount ?? latest.recordsFailed,
          durationMs: latest.durationMs,
          message: latest.message,
        }
      : null,
    lastSuccessfulSync: lastSuccess
      ? {
          id: lastSuccess.id,
          finishedAt: lastSuccess.syncFinishedAt,
          startedAt: lastSuccess.syncStartedAt,
          inserted: lastSuccess.insertedCount ?? lastSuccess.recordsImported,
          updated: lastSuccess.updatedCount ?? lastSuccess.recordsUpdated,
          skipped: lastSuccess.skippedCount ?? 0,
          failed: lastSuccess.failedCount ?? lastSuccess.recordsFailed,
        }
      : null,
    entityCounts: {
      tickets: Number(tickets?.c ?? 0),
      history: Number(history?.c ?? 0),
      comments: Number(comments?.c ?? 0),
      km: Number(km?.c ?? 0),
    },
  }
}

export async function listSyncLogs(limit = 20) {
  const db = getDb()
  const rows = await db
    .select()
    .from(cpAgentSyncLogs)
    .orderBy(desc(cpAgentSyncLogs.syncStartedAt))
    .limit(limit)

  return rows.map((l) => ({
    id: l.id,
    syncType: l.syncType ?? "full",
    status: l.status,
    startedAt: l.syncStartedAt,
    finishedAt: l.syncFinishedAt,
    durationMs: l.durationMs,
    inserted: l.insertedCount ?? l.recordsImported,
    updated: l.updatedCount ?? l.recordsUpdated,
    skipped: l.skippedCount ?? 0,
    failed: l.failedCount ?? l.recordsFailed,
    errorMessage: l.errorMessage,
    message: l.message,
    metadata: l.metadata ?? {},
  }))
}
