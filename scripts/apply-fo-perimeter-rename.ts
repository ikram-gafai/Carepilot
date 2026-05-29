import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { getSql } from "@/lib/db"

async function main() {
  const sql = getSql()
  const ddl = readFileSync(join(process.cwd(), "sql", "patches", "012_rename_fo_vlp_to_fo.sql"), "utf8")
  await sql.unsafe(ddl)
  await sql.end({ timeout: 5 })
  console.log("Renamed FO_VLP → FO in care_source, cp_agent, and ml_training.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
