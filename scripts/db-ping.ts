/**
 * Check that PostgreSQL responds on DATABASE_URL (scripts/load-env + Docker fallback).
 * Usage: bun run db:ping
 */
import "./load-env"

import postgres from "postgres"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url?.trim()) {
    console.error("DATABASE_URL is empty after loading environment files.")
    process.exit(1)
  }

  console.log("Connecting to:", maskUrl(url))

  const sql = postgres(url, { max: 1 })
  try {
    const rows = await sql`select now() as now, version() as version`
    const row = rows[0] as { now: Date; version: string }
    const { now, version } = row
    console.log("Status: OK — database reachable.")
    console.log("Server time:", now?.toISOString?.() ?? now)
    console.log("Version:", version?.split("\n")[0] ?? version)
  } catch (e) {
    console.error("Status: FAILED — could not connect or run the query.")
    if (e instanceof Error) {
      console.error(e.message)
      if ("code" in e && (e as NodeJS.ErrnoException).code === "ECONNREFUSED") {
        console.error(
          "→ Nothing is listening on this port: run `docker compose up -d` and ensure DATABASE_URL uses the correct port (5433 with this repo's compose).",
        )
      }
    } else {
      console.error(e)
    }
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

function maskUrl(raw: string): string {
  try {
    const u = new URL(raw)
    if (u.password) u.password = "***"
    return u.toString()
  } catch {
    return "(unparseable URL)"
  }
}

main()
