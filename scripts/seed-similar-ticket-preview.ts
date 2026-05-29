import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { missingCareIdsForPreview, seedSimilarTicketPreview } from "@/lib/ai/seed-similar-ticket-preview"
import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  const ddl = readFileSync(join(process.cwd(), "sql", "patches", "018_ai_similar_ticket_results.sql"), "utf8")
  await sql.unsafe(ddl)

  const result = await seedSimilarTicketPreview()
  console.log(
    `Similar ticket preview seeded: ${result.resultsWritten} rows across ${result.ticketsWithResults} tickets (${result.ticketsMatched} CARE-OP tickets matched).`,
  )
  if (result.ticketsMatched < 70) {
    console.warn(
      `Expected 70 synchronized tickets — run db:seed:care-operational then db:sync before seeding. Missing examples include: ${missingCareIdsForPreview().slice(0, 5).join(", ")}…`,
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
