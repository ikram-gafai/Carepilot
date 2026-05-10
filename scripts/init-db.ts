import "./load-env"
import fs from "node:fs"
import path from "node:path"
import postgres from "postgres"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL manquant")
    process.exit(1)
  }

  const sql = postgres(url, { max: 1 })
  const ddlPath = path.join(process.cwd(), "sql", "init.sql")
  const ddl = fs.readFileSync(ddlPath, "utf8")

  await sql.unsafe(ddl)
  await sql.end({ timeout: 5 })
  console.log("Schéma CAREPILOT initialisé (care_source + carepilot + pgvector).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
