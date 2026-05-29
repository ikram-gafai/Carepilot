import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  const ddl = readFileSync(join(process.cwd(), "sql", "patches", "019_ai_missing_information_analysis.sql"), "utf8")
  await sql.unsafe(ddl)
  console.log("cp_agent.ai_missing_information_analysis schema applied.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
