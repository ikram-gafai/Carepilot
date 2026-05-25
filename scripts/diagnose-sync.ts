/**
 * CARE → cp_agent sync diagnostics.
 * Usage: npx tsx scripts/diagnose-sync.ts [--run]
 */
import "./load-env"

import { count, desc, sql } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { careSourceTickets } from "@/lib/db/schema/care-source"
import { cpAgentSyncLogs, cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { createCareClient } from "@/lib/integrations/care/care-client"
import { getSyncStatus } from "@/lib/carepilot-api/sync"
import { runMvpCareSync } from "@/lib/services/sync/sync-service"

async function main() {
  const run = process.argv.includes("--run")
  const db = getDb()

  const [[cs], [cp], [cpCare]] = await Promise.all([
    db.select({ c: count() }).from(careSourceTickets),
    db.select({ c: count() }).from(cpAgentTickets),
    db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(sql`${cpAgentTickets.source} = 'CARE'`),
  ])

  console.log("--- Counts ---")
  console.log("care_source.tickets:", cs?.c ?? 0)
  console.log("cp_agent.tickets (all):", cp?.c ?? 0)
  console.log("cp_agent.tickets (source=CARE):", cpCare?.c ?? 0)

  const client = createCareClient()
  try {
    const page = await client.getTickets({ limit: 5, offset: 0 })
    const all = await client.getAllTickets()
    console.log("\n--- CARE API ---")
    console.log("GET /api/care/tickets page total:", page.total, "items:", page.items.length)
    console.log("getAllTickets total:", all.total, "items:", all.items.length)
    if (page.items[0]) {
      console.log("sample external id:", page.items[0].id, "updatedAt:", page.items[0].updatedAt)
    }
  } catch (e) {
    console.error("\nCARE API fetch failed (is `bun run dev` running?):", e)
  }

  if (run) {
    console.log("\n--- Running MVP sync ---")
    const result = await runMvpCareSync({ syncType: "diagnostic" })
    console.log(JSON.stringify(result, null, 2))
  }

  const status = await getSyncStatus()
  const [lastLog] = await db
    .select()
    .from(cpAgentSyncLogs)
    .orderBy(desc(cpAgentSyncLogs.syncStartedAt))
    .limit(1)

  const [[cpAfter]] = await Promise.all([db.select({ c: count() }).from(cpAgentTickets)])

  console.log("\n--- Sync status ---")
  console.log(JSON.stringify(status, null, 2))
  if (lastLog) {
    console.log("\nLatest log:", {
      id: lastLog.id,
      status: lastLog.status,
      inserted: lastLog.insertedCount,
      updated: lastLog.updatedCount,
      skipped: lastLog.skippedCount,
      failed: lastLog.failedCount,
      message: lastLog.message,
      error: lastLog.errorMessage,
    })
  }
  console.log("\ncp_agent.tickets after:", cpAfter?.c ?? 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
