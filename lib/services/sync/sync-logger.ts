import { eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { cpAgentSyncLogs } from "@/lib/db/schema/cp-agent"

export type SyncRunStatus = "running" | "success" | "partial_success" | "failed"

export type SyncCounters = {
  inserted: number
  updated: number
  skipped: number
  failed: number
}

export async function startSyncLog(db: Db, syncType = "full") {
  const started = new Date()
  const [row] = await db
    .insert(cpAgentSyncLogs)
    .values({
      syncType,
      syncStartedAt: started,
      status: "running",
      recordsProcessed: 0,
      recordsImported: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    })
    .returning({ id: cpAgentSyncLogs.id })

  if (!row?.id) throw new Error("Could not create sync log")
  return { logId: row.id, started }
}

export async function finishSyncLog(
  db: Db,
  logId: number,
  started: Date,
  status: SyncRunStatus,
  counters: SyncCounters,
  opts?: { errorMessage?: string; metadata?: Record<string, unknown>; message?: string },
) {
  const finished = new Date()
  const durationMs = finished.getTime() - started.getTime()
  const processed = counters.inserted + counters.updated + counters.skipped + counters.failed

  await db
    .update(cpAgentSyncLogs)
    .set({
      syncFinishedAt: finished,
      status,
      durationMs,
      insertedCount: counters.inserted,
      updatedCount: counters.updated,
      skippedCount: counters.skipped,
      failedCount: counters.failed,
      recordsProcessed: processed,
      recordsImported: counters.inserted,
      recordsUpdated: counters.updated,
      recordsFailed: counters.failed,
      errorMessage: opts?.errorMessage ?? null,
      message: opts?.message ?? null,
      metadata: opts?.metadata ?? {},
    })
    .where(eq(cpAgentSyncLogs.id, logId))
}
