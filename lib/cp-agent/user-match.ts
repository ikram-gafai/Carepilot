import { eq, or, sql } from "drizzle-orm"

import type { getDb } from "@/lib/db"
import { authEmailFromCpAgent, cpAgentEmailFromAuth } from "@/lib/data/support-agents"
import { cpAgentUsers } from "@/lib/db/schema/cp-agent"

type Db = ReturnType<typeof getDb>

export function normalizeAgentEmail(email: string): string {
  return authEmailFromCpAgent(email)
}

export async function findCpAgentUserByAuthEmail(db: Db, email: string) {
  const lower = email.toLowerCase()
  const internal = cpAgentEmailFromAuth(lower)
  const carrefour = normalizeAgentEmail(lower)

  const [row] = await db
    .select()
    .from(cpAgentUsers)
    .where(
      or(
        eq(sql`lower(${cpAgentUsers.email})`, lower),
        eq(sql`lower(${cpAgentUsers.email})`, internal),
        eq(sql`lower(${cpAgentUsers.email})`, carrefour),
      )!,
    )
    .limit(1)

  return row ?? null
}
