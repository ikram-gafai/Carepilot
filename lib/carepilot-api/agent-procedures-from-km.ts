import type { AgentProcedureRow } from "@/lib/agent-procedures-view"
import { listSynchronizedKm } from "@/lib/carepilot-api/km"

function stepsFromJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    /* plain text */
  }
  return raw ? [raw] : []
}

/** KM references synchronized from CARE, shaped for the procedures/runbooks UI. */
export async function getAgentProceduresFromKm(): Promise<AgentProcedureRow[]> {
  const { items } = await listSynchronizedKm()
  return items.map((k) => ({
    id: k.id,
    code: k.code,
    title: k.title,
    category: k.category,
    scope: k.perimeter,
    summary: k.summary,
    prerequisites: "",
    steps: stepsFromJson(k.procedureSteps),
    tags: k.keywords,
    relevanceScore: 0.85,
    usageCount: 0,
    lastUsedAt: k.lastSyncedAt?.toISOString() ?? k.updatedAt.toISOString(),
  }))
}
