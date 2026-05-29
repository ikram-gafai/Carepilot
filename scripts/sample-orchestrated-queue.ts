/**
 * Sample orchestrated queue rows (fast path — same data as Admin/Agent dashboards).
 * Usage: bun run sample:queue
 */
import "./load-env"

import { buildAgentOperationalQueue } from "@/lib/carepilot-api/agent-dashboard-data"

async function main() {
  const limit = Number(process.argv[2] ?? 5)
  const queue = await buildAgentOperationalQueue()

  console.log(`Active queue: ${queue.length} tickets\n`)
  for (const r of queue.slice(0, limit)) {
    console.log(
      JSON.stringify({
        careId: r.careId,
        decision: r.aiActionLabel,
        target: r.decisionTarget,
        quality: r.qualityLevel,
        km: r.kmCode,
        sla: r.slaLabel,
        confidence: r.actionConfidencePct,
      }),
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
