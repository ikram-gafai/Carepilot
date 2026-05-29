import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  const ddl = readFileSync(
    join(process.cwd(), "sql", "patches", "021_ai_operational_explanations.sql"),
    "utf8",
  )
  await sql.unsafe(ddl)
  await sql.end({ timeout: 5 })
  console.log("Applied cp_agent.ai_operational_explanations schema")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
