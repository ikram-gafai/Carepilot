import { expect, test } from "bun:test"
import postgres from "postgres"

/**
 * Smoke test optionnel : `RUN_INTEGRATION=1` + Postgres accessible (Docker local).
 * CI minimal : non exécuté par défaut.
 */
test("postgres: SELECT 1 (RUN_INTEGRATION=1)", async () => {
  if (process.env.RUN_INTEGRATION !== "1") return
  const url = process.env.DATABASE_URL
  if (!url) return

  const sql = postgres(url, { max: 1 })
  try {
    const rows = await sql`SELECT 1 AS x`
    expect(rows[0].x).toBe(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
})
