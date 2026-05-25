/**
 * Reset synchronized operational store for CARE ingestion replay.
 * Usage: npx tsx scripts/reset-care-sync.ts
 */
import "./load-env"

import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()

  await sql`
    TRUNCATE
      cp_agent.ticket_comments,
      cp_agent.ticket_history,
      cp_agent.km_suggestions,
      cp_agent.ai_feedback,
      cp_agent.ai_analyses,
      cp_agent.ticket_procedure_links,
      cp_agent.audit_logs,
      cp_agent.tickets,
      cp_agent.sync_logs
    RESTART IDENTITY CASCADE
  `

  console.log("Synchronized operational store cleared.")
  console.log("Next: bun run db:sync  (or Admin → Run Sync Now)")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
