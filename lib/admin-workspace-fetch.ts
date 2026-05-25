import { fetchCarepilotPage } from "@/lib/carepilot-api/fetch-page"
import { routeErrorMessage } from "@/lib/api/http"
import { getDbOrNull } from "@/lib/db"

export async function loadAdminWorkspace<T>(
  loader: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; reason: "offline" | "unavailable" }> {
  if (!getDbOrNull()) return { ok: false, reason: "offline" }
  try {
    return { ok: true, data: await loader() }
  } catch (e) {
    console.error("[admin-workspace]", routeErrorMessage(e))
    return { ok: false, reason: "unavailable" }
  }
}

/** Optional HTTP path for external clients; admin RSC pages use {@link loadAdminWorkspace}. */
export async function fetchAdminBundle<T>(path: string): Promise<
  { ok: true; data: T } | { ok: false; reason: "offline" | "unavailable" }
> {
  if (!getDbOrNull()) return { ok: false, reason: "offline" }
  const res = await fetchCarepilotPage<T>(path)
  if (!res.ok) return { ok: false, reason: "unavailable" }
  return { ok: true, data: res.data }
}
