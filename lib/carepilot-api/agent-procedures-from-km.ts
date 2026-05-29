import type { AgentProcedureRow } from "@/lib/agent-procedures-view"
import {
  KM_PROCEDURE_CATALOG,
  type KmProcedureCatalogEntry,
} from "@/lib/care-operational/km-procedure-catalog"
import { buildAgentOperationalQueue } from "@/lib/carepilot-api/agent-dashboard-data"
import { getDb } from "@/lib/db"
import { cpAgentKmReferences } from "@/lib/db/schema/cp-agent"
import {
  catalogEntryForKmCode,
  loadKmUsageAnalytics,
  type KmUsageAnalytics,
  type KmUsageSummary,
} from "@/lib/km/km-usage-analytics"

import { loadLatestAgentActions } from "./agent-procedures-agent-actions"

function stepsFromJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    /* plain text */
  }
  return raw
    .split(/[•\n;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function rowFromCatalog(
  entry: KmProcedureCatalogEntry,
  usage: {
    matchedTickets: number
    successPct: number
    escalatedAfterCount: number
    successfulCount: number
    waitingCount: number
    lastUsedAt: string | null
  },
  dbOverride?: {
    summary?: string
    steps?: string[]
  },
): AgentProcedureRow {
  const steps = dbOverride?.steps?.length ? dbOverride.steps : entry.procedureSteps
  return {
    id: Number.parseInt(entry.code.replace(/\D/g, ""), 10) || 0,
    code: entry.code,
    title: entry.title,
    category: entry.category,
    scope: entry.perimeter,
    summary: dbOverride?.summary?.trim() || entry.summary,
    prerequisites: entry.beforeApplying.join(" · "),
    steps,
    tags: entry.code,
    relevanceScore: usage.successPct / 100,
    usageCount: usage.matchedTickets,
    lastUsedAt: usage.lastUsedAt,
    beforeApplying: entry.beforeApplying,
    ifFailed: entry.ifFailed,
    successRatePct: usage.successPct,
    estimatedMinutes: entry.estimatedMinutes,
    successfulCount: usage.successfulCount,
    escalatedAfterCount: usage.escalatedAfterCount,
    waitingCount: usage.waitingCount,
  }
}

export type AgentProceduresBundle = {
  summary: KmUsageSummary
  items: AgentProcedureRow[]
  analytics: KmUsageAnalytics
}

/** Operational KM library with unified ticket-level usage analytics. */
export async function getAgentProceduresBundle(): Promise<AgentProceduresBundle> {
  const db = getDb()
  const [queue, agentActions, dbRows] = await Promise.all([
    buildAgentOperationalQueue(),
    loadLatestAgentActions(),
    db.select().from(cpAgentKmReferences),
  ])

  const analytics = await loadKmUsageAnalytics(queue, agentActions.keys())
  const dbByCode = new Map(dbRows.map((r) => [r.code, r]))

  const items = analytics.procedures.map((usage) => {
    const entry = catalogEntryForKmCode(usage.code) ?? KM_PROCEDURE_CATALOG.find((k) => k.code === usage.code)!
    const synced = dbByCode.get(entry.code)
    return rowFromCatalog(
      entry,
      {
        matchedTickets: usage.matchedTickets,
        successPct: usage.successPct,
        escalatedAfterCount: usage.escalatedAfterCount,
        successfulCount: usage.successfulCount,
        waitingCount: usage.waitingCount,
        lastUsedAt: usage.lastUsedAt,
      },
      synced
        ? {
            summary: synced.summary,
            steps: stepsFromJson(synced.procedureSteps),
          }
        : undefined,
    )
  })

  return {
    summary: analytics.summary,
    items,
    analytics,
  }
}

/** @deprecated Use getAgentProceduresBundle */
export async function getAgentProceduresFromKm(): Promise<AgentProcedureRow[]> {
  const bundle = await getAgentProceduresBundle()
  return bundle.items
}
