import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  const ddl = readFileSync(join(process.cwd(), "sql", "patches", "011_ai_escalation_predictions.sql"), "utf8")
  await sql.unsafe(ddl)
  await sql.end({ timeout: 5 })
  console.log("cp_agent.ai_escalation_predictions schema applied.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
