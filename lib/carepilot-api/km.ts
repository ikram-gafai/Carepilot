import { asc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { cpAgentKmReferences } from "@/lib/db/schema/cp-agent"

export async function listSynchronizedKm() {
  const db = getDb()
  const rows = await db.select().from(cpAgentKmReferences).orderBy(asc(cpAgentKmReferences.code))
  return { items: rows, total: rows.length }
}

export async function getSynchronizedKmByCode(code: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(cpAgentKmReferences)
    .where(eq(cpAgentKmReferences.code, code))
    .limit(1)
  return row ?? null
}
