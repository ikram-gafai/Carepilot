import { and, eq, lt } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { cpAgentSyncLogs } from "@/lib/db/schema/cp-agent"

const DEFAULT_STALE_MS = Number(process.env.SYNC_STALE_LOG_MS ?? String(2 * 60 * 1000))

/** Close sync log rows left in `running` after a crash, timeout, or hot reload. */
export async function reconcileStaleSyncLogs(db: Db, maxAgeMs = DEFAULT_STALE_MS) {
  const cutoff = new Date(Date.now() - maxAgeMs)
  const finished = new Date()

  await db
    .update(cpAgentSyncLogs)
    .set({
      status: "failed",
      syncFinishedAt: finished,
      durationMs: maxAgeMs,
      errorMessage: "Synchronization interrupted or timed out",
      message: "Synchronization did not complete — marked as failed",
      failedCount: 0,
    })
    .where(and(eq(cpAgentSyncLogs.status, "running"), lt(cpAgentSyncLogs.syncStartedAt, cutoff)))
}
