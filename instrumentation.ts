export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.DISABLE_SYNC_SCHEDULER === "1") {
      console.info("[sync] Background CARE scheduler disabled (DISABLE_SYNC_SCHEDULER=1).")
      return
    }
    const { startSyncScheduler } = await import("@/lib/jobs/sync-scheduler")
    const started = startSyncScheduler()
    if (started) {
      console.info("[sync] Background CARE synchronization started (internal).")
    }
  }
}
