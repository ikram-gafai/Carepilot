import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  const ddl = readFileSync(join(process.cwd(), "sql", "patches", "017_ai_km_recommendations.sql"), "utf8")
  await sql.unsafe(ddl)
  await sql.end({ timeout: 5 })
  console.log("cp_agent.ai_km_recommendations schema applied.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
