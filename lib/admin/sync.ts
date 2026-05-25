import { desc } from "drizzle-orm"

import { pickMeaningfulSyncLogs } from "@/lib/carepilot-api/sync-health"
import { getDb } from "@/lib/db"
import { cpAgentSyncLogs } from "@/lib/db/schema/cp-agent"
import { reconcileStaleSyncLogs } from "@/lib/services/sync/reconcile-stale-logs"

/** Latest finished sync log (internal — queues supervision only). */
export async function adminLatestSync() {
  const db = getDb()
  await reconcileStaleSyncLogs(db)
  const logs = await db
    .select()
    .from(cpAgentSyncLogs)
    .orderBy(desc(cpAgentSyncLogs.syncStartedAt))
    .limit(12)
  const meaningful = pickMeaningfulSyncLogs(logs)
  return meaningful[0] ?? logs.find((l) => l.status !== "running" && l.syncFinishedAt) ?? logs[0] ?? null
}
