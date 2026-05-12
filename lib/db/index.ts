import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as careSourceSchema from "./schema/care-source"
import * as carepilotSchema from "./schema/carepilot"

const schema = { ...careSourceSchema, ...carepilotSchema }

/** True when `DATABASE_URL` is set (non-empty). Safe to call from any runtime. */
export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  return url
}

const globalForDb = globalThis as unknown as {
  carepilotSql?: ReturnType<typeof postgres>
  carepilotDb?: ReturnType<typeof drizzle<typeof schema>>
}

export function getSql() {
  if (!globalForDb.carepilotSql) {
    globalForDb.carepilotSql = postgres(requireDatabaseUrl(), { max: 10 })
  }
  return globalForDb.carepilotSql
}

/** Returns Drizzle client, or `null` when no database URL (offline / demo UI). */
export function getDbOrNull(): ReturnType<typeof getDb> | null {
  if (!hasDatabaseUrl()) return null
  return getDb()
}

export function getDb() {
  if (!globalForDb.carepilotDb) {
    globalForDb.carepilotDb = drizzle(getSql(), { schema })
  }
  return globalForDb.carepilotDb
}

export type Db = ReturnType<typeof getDb>
