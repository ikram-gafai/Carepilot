import { cache } from "react"
import { unstable_cache } from "next/cache"

import { buildAgentOperationalQueue } from "@/lib/carepilot-api/agent-dashboard-data"

const loadOperationalQueueCached = unstable_cache(
  async () => buildAgentOperationalQueue(),
  ["carepilot-operational-queue"],
  { revalidate: 45 },
)

/** Dedupe queue build within a request; 45s cross-request cache for dashboard/admin. */
export const getCachedAgentOperationalQueue = cache(loadOperationalQueueCached)
