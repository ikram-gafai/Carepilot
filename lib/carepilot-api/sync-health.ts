import type { InferSelectModel } from "drizzle-orm"

import type { cpAgentSyncLogs } from "@/lib/db/schema/cp-agent"

type SyncLogRow = InferSelectModel<typeof cpAgentSyncLogs>

export type SyncHealthLevel = "healthy" | "attention" | "failed" | "no_sync"

const HEALTHY_MS = 2 * 60 * 1000

/** Phantom failures from stale-log reconciliation (not a real sync run). */
export function isReconcileGhostLog(row: SyncLogRow | null | undefined): boolean {
  if (!row || row.status !== "failed") return false
  const processed =
    (row.insertedCount ?? row.recordsImported ?? 0) +
    (row.updatedCount ?? row.recordsUpdated ?? 0) +
    (row.skippedCount ?? 0)
  if (processed > 0) return false
  const err = row.errorMessage ?? ""
  return err.includes("interrupted or timed out") || err.includes("did not complete")
}

export function pickMeaningfulSyncLogs(logs: SyncLogRow[]): SyncLogRow[] {
  return logs.filter((l) => l.syncFinishedAt && !isReconcileGhostLog(l))
}

export function isCompletedIngestionLog(row: SyncLogRow): boolean {
  if (!row.syncFinishedAt) return false
  const status = row.status?.toLowerCase() ?? ""
  if (status === "success") return true
  if (status === "partial_success") {
    return (row.insertedCount ?? row.recordsImported ?? 0) + (row.updatedCount ?? row.recordsUpdated ?? 0) > 0
  }
  return false
}

function isFailedRun(row: SyncLogRow | null | undefined): boolean {
  if (!row?.syncFinishedAt) return false
  const status = row.status?.toLowerCase() ?? ""
  if (status === "failed") return true
  if (status === "partial_success") {
    const processed =
      (row.insertedCount ?? row.recordsImported ?? 0) + (row.updatedCount ?? row.recordsUpdated ?? 0)
    return processed === 0
  }
  return false
}

export function evaluateSyncHealth(input: {
  running: boolean
  latestFinished: SyncLogRow | null
  lastSuccessful: SyncLogRow | null
}): {
  level: SyncHealthLevel
  label: string
  lastIngestionAt: Date | null
  reason?: string
} {
  const { running, latestFinished, lastSuccessful } = input

  if (running) {
    return {
      level: "healthy",
      label: "Synchronizing",
      lastIngestionAt: lastSuccessful?.syncFinishedAt ?? null,
      reason: "Synchronization in progress",
    }
  }

  if (!lastSuccessful?.syncFinishedAt) {
    if (latestFinished && isFailedRun(latestFinished)) {
      return {
        level: "failed",
        label: "Failed",
        lastIngestionAt: null,
        reason: "Latest synchronization failed",
      }
    }
    return {
      level: "no_sync",
      label: "No sync",
      lastIngestionAt: null,
      reason: "No successful synchronization yet",
    }
  }

  if (latestFinished && isFailedRun(latestFinished) && latestFinished.id !== lastSuccessful.id) {
    const age = Date.now() - lastSuccessful.syncFinishedAt.getTime()
    if (age > HEALTHY_MS) {
      return {
        level: "attention",
        label: "Attention",
        lastIngestionAt: lastSuccessful.syncFinishedAt,
        reason: "Latest run failed; last success is stale",
      }
    }
    return {
      level: "failed",
      label: "Failed",
      lastIngestionAt: lastSuccessful.syncFinishedAt,
      reason: "Latest synchronization failed",
    }
  }

  const age = Date.now() - lastSuccessful.syncFinishedAt.getTime()
  if (age <= HEALTHY_MS) {
    return {
      level: "healthy",
      label: "Healthy",
      lastIngestionAt: lastSuccessful.syncFinishedAt,
    }
  }

  return {
    level: "attention",
    label: "Attention",
    lastIngestionAt: lastSuccessful.syncFinishedAt,
    reason: "Last successful sync is older than 2 minutes",
  }
}
