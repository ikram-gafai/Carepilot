import { healthFromSyncStatus } from "./shared"
import { adminLatestSync } from "./sync"
import { adminQueueSupervisionDetail } from "./queue-metrics"

export type {
  QueueDisplayHealth,
  QueuePressureRow,
  QueueSupervisionRow,
  QueueTrendLabel,
  TransferDistributionRow,
} from "./queue-metrics"

export async function adminQueueSupervision() {
  const latestSync = await adminLatestSync()
  const syncHealth = healthFromSyncStatus(latestSync?.status)
  const syncLatencyMin =
    latestSync?.syncFinishedAt && latestSync?.syncStartedAt
      ? Math.round(
          (latestSync.syncFinishedAt.getTime() - latestSync.syncStartedAt.getTime()) / 60_000,
        )
      : null
  const syncUnstable =
    syncHealth === "degraded" ||
    syncHealth === "partial_failure" ||
    (syncLatencyMin != null && syncLatencyMin >= 12) ||
    (latestSync?.recordsFailed ?? 0) > 0

  return adminQueueSupervisionDetail(syncUnstable)
}
