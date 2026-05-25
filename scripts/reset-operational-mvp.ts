/**
 * Reset operational architecture to CARE → cp_agent MVP.
 * Usage: bun run db:reset:operational-mvp
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  const patch = readFileSync(
    join(process.cwd(), "sql", "patches", "009_operational_mvp_reset.sql"),
    "utf8",
  )
  await sql.unsafe(patch)

  await sql`
    TRUNCATE cp_agent.audit_logs, cp_agent.tickets, cp_agent.sync_logs RESTART IDENTITY CASCADE
  `

  console.log("Operational MVP reset complete.")
  console.log("  Schemas: care_source (CARE), cp_agent (synced ops), carepilot (auth only)")
  console.log("Next:")
  console.log("  bun run db:seed:care-operational")
  console.log("  bun run db:seed:cp-agent")
  console.log("  bun run db:sync   # or Admin → Run Sync Now")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
