import { eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { cpAgentSyncSettings } from "@/lib/db/schema/cp-agent"

export type SyncWindow = "initial" | "full"
export type SyncMode = "automatic" | "manual"

const WINDOW_KEY = "sync_window"

export function syncWindowForMode(mode: SyncMode, current: SyncWindow): SyncWindow {
  if (mode === "manual") return "full"
  return current
}

export async function getSyncWindow(db: Db): Promise<SyncWindow> {
  try {
    const [row] = await db
      .select({ value: cpAgentSyncSettings.value })
      .from(cpAgentSyncSettings)
      .where(eq(cpAgentSyncSettings.key, WINDOW_KEY))
      .limit(1)
    return row?.value === "full" ? "full" : "initial"
  } catch {
    return "initial"
  }
}

export async function setSyncWindow(db: Db, window: SyncWindow) {
  await db
    .insert(cpAgentSyncSettings)
    .values({ key: WINDOW_KEY, value: window, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: cpAgentSyncSettings.key,
      set: { value: window, updatedAt: new Date() },
    })
}

export async function expandSyncWindow(db: Db) {
  await setSyncWindow(db, "full")
}

export async function resetSyncWindow(db: Db) {
  await setSyncWindow(db, "initial")
}
