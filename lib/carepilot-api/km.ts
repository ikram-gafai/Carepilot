import { and, asc, eq, ilike, or } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { cpAgentKmReferences } from "@/lib/db/schema/cp-agent"

/** KM articles relevant to a ticket (perimeter/category), capped for detail views. */
export async function listKmReferencesForTicketContext(input: {
  perimeter?: string | null
  category?: string | null
  limit?: number
}) {
  const db = getDb()
  const limit = input.limit ?? 12
  const perimeter = input.perimeter?.trim().toUpperCase() ?? ""
  const category = input.category?.trim().toUpperCase() ?? ""

  const clauses = [eq(cpAgentKmReferences.status, "active")] as ReturnType<typeof eq>[]
  if (perimeter || category) {
    const match = or(
      perimeter ? ilike(cpAgentKmReferences.perimeter, perimeter) : undefined,
      category ? ilike(cpAgentKmReferences.category, category) : undefined,
    )
    if (match) clauses.push(match)
  }

  const rows = await db
    .select()
    .from(cpAgentKmReferences)
    .where(clauses.length > 1 ? and(...clauses) : clauses[0])
    .orderBy(asc(cpAgentKmReferences.code))
    .limit(limit)

  return { items: rows, total: rows.length }
}

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
