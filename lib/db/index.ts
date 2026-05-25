import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as careSourceSchema from "./schema/care-source"
import * as carepilotSchema from "./schema/carepilot"
import * as cpAdminSchema from "./schema/cp-admin"
import * as cpAgentSchema from "./schema/cp-agent"
import * as mlTrainingSchema from "./schema/ml-training"

const schema = {
  ...careSourceSchema,
  ...carepilotSchema,
  ...cpAgentSchema,
  ...cpAdminSchema,
  ...mlTrainingSchema,
}

function resolvedDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_DATABASE_URL?.trim() || undefined
  )
}

/** True when a Postgres URL is set (non-empty). Safe to call from any runtime. */
export function hasDatabaseUrl(): boolean {
  return Boolean(resolvedDatabaseUrl())
}

function requireDatabaseUrl(): string {
  const url = resolvedDatabaseUrl()
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_DATABASE_URL must be set")
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
