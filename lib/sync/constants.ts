/** Background scheduler runs unless DISABLE_SYNC_SCHEDULER=1. */
export const CARE_SYNC_BACKGROUND_ENABLED = process.env.DISABLE_SYNC_SCHEDULER !== "1"

/** @deprecated No sync UI — internal scheduler only. */
export const CARE_SYNC_INTERVAL_LABEL = CARE_SYNC_BACKGROUND_ENABLED
  ? `${Math.round(Number(process.env.SYNC_INTERVAL_MS ?? "60000") / 1000)}s (background)`
  : "Disabled"

/** @deprecated Scheduler interval; unused when manual-only. */
export const CARE_SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? "60000")
