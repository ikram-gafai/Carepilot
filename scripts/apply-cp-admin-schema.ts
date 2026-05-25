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
    for (const file of ["003_cp_admin.sql", "004_cp_admin_operational.sql"]) {
      const ddl = fs.readFileSync(path.join(process.cwd(), "sql", "patches", file), "utf8")
      await sql.unsafe(ddl)
      console.log(`Applied sql/patches/${file}`)
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
  console.log("cp_admin supervision schema applied.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
