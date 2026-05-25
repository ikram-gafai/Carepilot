import { getDbOrNull } from "@/lib/db"

/**
 * Runs a workspace query when a database URL is configured.
 * Returns `{ ok: false }` when offline, or when the schema is not provisioned yet.
 */
export async function tryCpAgentWorkspace<T>(fn: () => Promise<T>): Promise<
  | { ok: true; data: T }
  | { ok: false; reason: "offline" | "unavailable" }
> {
  if (!getDbOrNull()) {
    return { ok: false, reason: "offline" }
  }
  try {
    return { ok: true, data: await fn() }
  } catch {
    return { ok: false, reason: "unavailable" }
  }
}
