import { runMvpCareSync } from "@/lib/services/sync/sync-service"
import { CARE_SYNC_INTERVAL_MS } from "@/lib/sync/constants"

let timer: ReturnType<typeof setInterval> | null = null
let started = false

export function startSyncScheduler(): boolean {
  if (started) return false
  if (process.env.DISABLE_SYNC_SCHEDULER === "1") return false
  if (process.env.NODE_ENV === "development" && process.env.SYNC_SCHEDULER_ENABLED !== "1") return false
  if (process.env.DISABLE_SYNC_SCHEDULER !== "0" && process.env.SYNC_SCHEDULER_ENABLED !== "1") return false
  started = true

  const safeInterval =
    Number.isFinite(CARE_SYNC_INTERVAL_MS) && CARE_SYNC_INTERVAL_MS >= 10_000
      ? CARE_SYNC_INTERVAL_MS
      : 60_000

  const tick = () => {
    void runMvpCareSync({ syncType: "scheduled" }).catch((e) => {
      console.error("[sync-scheduler]", e instanceof Error ? e.message : e)
    })
  }

  // Initial run shortly after boot
  setTimeout(tick, 5_000)
  timer = setInterval(tick, safeInterval)

  console.info(`[sync-scheduler] CARE synchronization every ${safeInterval}ms`)
  return true
}

export function stopSyncScheduler() {
  if (timer) clearInterval(timer)
  timer = null
  started = false
}
