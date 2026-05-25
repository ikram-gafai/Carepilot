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

  const ddlPath = path.join(process.cwd(), "sql", "patches", "006_care_operational_sync.sql")
  const ddl = fs.readFileSync(ddlPath, "utf8")

  const sql = postgres(url, { max: 1 })
  try {
    await sql.unsafe(ddl)
  } finally {
    await sql.end({ timeout: 5 })
  }
  console.log("CARE operational sync patch applied (006_care_operational_sync.sql).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
