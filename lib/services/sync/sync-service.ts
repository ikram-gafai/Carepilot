import { eq, isNull, ne, or } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { cpAgentSyncLogs, cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { createCareClient } from "@/lib/integrations/care/care-client"

import { finishSyncLog, startSyncLog, type SyncCounters } from "./sync-logger"
import { reconcileStaleSyncLogs } from "./reconcile-stale-logs"
import { isSyncRunning, releaseSyncLock, tryAcquireSyncLock } from "./sync-state"
import { linkAllTicketAssignees } from "@/lib/cp-agent/assignee-link"
import { refreshCpAgentStoreFieldsFromCare } from "./refresh-store-fields"
import { syncTicketsFromCare } from "./sync-tickets"

export type SyncRunResult = {
  ok: boolean
  status: "success" | "partial_success" | "failed" | "skipped"
  syncLogId?: number
  inserted: number
  updated: number
  skipped: number
  failed: number
  message?: string
}

export async function runMvpCareSync(opts?: {
  syncType?: string
  actorId?: number
  actorRole?: string
}): Promise<SyncRunResult> {
  if (!tryAcquireSyncLock()) {
    return {
      ok: false,
      status: "skipped",
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      message: "Synchronization already in progress",
    }
  }

  const db = getDb()
  const client = createCareClient()
  const counters: SyncCounters = { inserted: 0, updated: 0, skipped: 0, failed: 0 }
  const errors: { entity: string; id: string; message: string }[] = []

  let logId: number | undefined
  let started = new Date()

  try {
    await reconcileStaleSyncLogs(db)

    // Drop legacy demo rows so dashboard counts stay aligned with CARE source (max 70).
    await db.delete(cpAgentTickets).where(or(ne(cpAgentTickets.source, "CARE"), isNull(cpAgentTickets.source)))

    const syncType = opts?.syncType ?? "manual"

    const log = await startSyncLog(db, syncType)
    logId = log.logId
    started = log.started

    const ticketSync = await syncTicketsFromCare(db, client, counters, errors)
    const { careSourceTotal } = ticketSync
    await refreshCpAgentStoreFieldsFromCare(db)
    await linkAllTicketAssignees(db)

    const status =
      errors.length === 0
        ? "success"
        : counters.inserted + counters.updated > 0
          ? "partial_success"
          : "failed"

    if (logId) {
      await finishSyncLog(db, logId, started, status, counters, {
        errorMessage: errors.length ? errors[0]?.message : undefined,
        metadata: {
          errors,
          actorId: opts?.actorId,
          actorRole: opts?.actorRole,
          careSourceTotal,
          scope: "tickets",
        },
        message:
          status === "success"
            ? "CARE synchronization completed"
            : status === "partial_success"
              ? "CARE synchronization completed with errors"
              : "CARE synchronization failed",
      })
    }

    return {
      ok: status !== "failed",
      status,
      syncLogId: logId,
      ...counters,
      message:
        status === "success"
          ? "Synchronization completed"
          : `${counters.failed} item(s) failed during synchronization`,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (logId) {
      await finishSyncLog(
        db,
        logId,
        started,
        "failed",
        counters,
        { errorMessage: msg, metadata: { errors } },
      )
    }
    return {
      ok: false,
      status: "failed",
      syncLogId: logId,
      ...counters,
      message: msg,
    }
  } finally {
    releaseSyncLock()
    if (logId) {
      try {
        const [row] = await db
          .select({ status: cpAgentSyncLogs.status, syncFinishedAt: cpAgentSyncLogs.syncFinishedAt })
          .from(cpAgentSyncLogs)
          .where(eq(cpAgentSyncLogs.id, logId))
          .limit(1)
        if (row?.status === "running" && !row.syncFinishedAt) {
          await finishSyncLog(db, logId, started, "failed", counters, {
            errorMessage: "Synchronization ended without completion",
            message: "Synchronization did not complete",
          })
        }
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}

export { isSyncRunning }
