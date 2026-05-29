/**
 * Realign open ticket SLA timestamps to realistic exposure buckets.
 * Usage: bun run db:repair-sla-timestamps
 */
import "./load-env"

import { refreshOperationalSlaTimestamps } from "@/lib/care-operational/refresh-sla-timestamps"
import { resolveTtrTargetHours } from "@/lib/care-operational/sla-exposure"
import { getDb } from "@/lib/db"

async function main() {
  const result = await refreshOperationalSlaTimestamps(getDb())
  console.log(JSON.stringify({ ...result, sampleTtr: resolveTtrTargetHours("P1") }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
