import { asc } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

import type { AgentProcedureRow } from "@/lib/agent-procedures-view"
import { getDb } from "@/lib/db"
import { cpAgentProcedures } from "@/lib/db/schema/cp-agent"

export type { AgentProcedureRow } from "@/lib/agent-procedures-view"

type ProcedureRow = InferSelectModel<typeof cpAgentProcedures>

function serializeRow(r: ProcedureRow): AgentProcedureRow {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    category: r.category,
    scope: r.scope,
    summary: r.summary,
    prerequisites: r.prerequisites,
    steps: Array.isArray(r.steps) ? r.steps : [],
    tags: r.tags,
    relevanceScore: Math.round(r.relevanceScore * 100) / 100,
    usageCount: r.usageCount,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  }
}

/** All operational procedures — usage merged into agent Runbooks. */
export async function listAgentProcedures(): Promise<AgentProcedureRow[]> {
  const db = getDb()
  const rows = await db.select().from(cpAgentProcedures).orderBy(asc(cpAgentProcedures.code))
  return rows.map(serializeRow)
}
