import fs from "node:fs"
import path from "node:path"

import "./load-env"
import postgres from "postgres"

async function main() {
  const url =
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_DATABASE_URL?.trim()
  if (!url) {
    console.error("DATABASE_URL or POSTGRES_DATABASE_URL is required.")
    process.exit(1)
  }

  const sql = postgres(url, { max: 1 })
  try {
    const corePath = path.join(process.cwd(), "sql", "ensure-care-source-carepilot.sql")
    await sql.unsafe(fs.readFileSync(corePath, "utf8"))

    let vectorOk = false
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS vector`
      vectorOk = true
    } catch (e) {
      const err = e as { code?: string }
      if (err.code === "0A000") {
        console.warn(
          "[db:ensure-care] pgvector is not installed on this server — skipped carepilot.embeddings. Use Postgres with the vector extension (e.g. local Docker compose in this repo) for full parity.",
        )
      } else {
        throw e
      }
    }

    if (vectorOk) {
      const embPath = path.join(process.cwd(), "sql", "ensure-care-embeddings.sql")
      await sql.unsafe(fs.readFileSync(embPath, "utf8"))
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
  console.log("Care layer applied (care_source + carepilot).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
