import { getDbOrNull } from "@/lib/db"

export async function tryAdminWorkspace<T>(fn: () => Promise<T>): Promise<
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
