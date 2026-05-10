/**
 * Peuple `carepilot.golden_test_cases` après synchronisation (références aux tickets CAREPILOT existants).
 * Usage : `bun run db:seed:golden` (DATABASE_URL requis).
 */
import "./load-env"

import { eq } from "drizzle-orm"
import postgres from "postgres"

import { getDb } from "@/lib/db"
import { careSourceTickets } from "@/lib/db/schema/care-source"
import { carepilotTickets, goldenTestCases } from "@/lib/db/schema/carepilot"

const MAX_ROWS = Number(process.env.GOLDEN_SEED_COUNT ?? "48")

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL manquant")
    process.exit(1)
  }

  const pg = postgres(url, { max: 1 })
  await pg.unsafe(`TRUNCATE TABLE carepilot.golden_test_cases RESTART IDENTITY`)
  await pg.end({ timeout: 5 })

  const db = getDb()
  const rows = await db
    .select({
      cpId: carepilotTickets.id,
      storeCode: careSourceTickets.storeCode,
      cashRegisterCode: careSourceTickets.cashRegisterCode,
      errorMessage: careSourceTickets.errorMessage,
      kmApplicable: careSourceTickets.kmApplicable,
      finalAction: careSourceTickets.finalAction,
      missingInformationFlag: careSourceTickets.missingInformationFlag,
    })
    .from(carepilotTickets)
    .innerJoin(careSourceTickets, eq(carepilotTickets.sourceTicketId, careSourceTickets.id))
    .limit(MAX_ROWS)

  let inserted = 0
  for (const r of rows) {
    const missingFields: string[] = []
    if (!r.storeCode) missingFields.push("magasin")
    if (!r.cashRegisterCode) missingFields.push("caisse")
    if (!r.errorMessage) missingFields.push("message_erreur")

    await db.insert(goldenTestCases).values({
      ticketId: r.cpId,
      expectedEntities: {
        magasin: r.storeCode ?? null,
        caisse: r.cashRegisterCode ?? null,
      },
      expectedMissingFields: missingFields,
      expectedSimilarGroup: "Similar to Ticket",
      expectedKm: r.kmApplicable ?? null,
      expectedDecision:
        r.finalAction ??
        (r.missingInformationFlag ? "Compléter le ticket" : "Poursuivre analyse N2"),
    })
    inserted++
  }

  console.log(`golden_test_cases : ${inserted} lignes (max ${MAX_ROWS}).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
