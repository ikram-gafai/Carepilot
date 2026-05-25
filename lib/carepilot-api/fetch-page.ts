import { carepilotFetchSafe } from "@/lib/carepilot-api/server-fetch"

/** Server Component helper — loads a CarePilot API bundle with consistent errors. */
export async function fetchCarepilotPage<T>(path: string): Promise<
  { ok: true; data: T } | { ok: false; error: string }
> {
  return carepilotFetchSafe<T>(path)
}
