/**
 * Runbooks derived from operational KM catalog + ticket telemetry.
 */

import type { AgentProcedureRow } from "@/lib/agent-procedures-view"

export type AgentRunbook = {
  id: string
  code: string
  procedureCode: string | null
  title: string
  category: string
  perimeter: string
  contextLine: string
  incidentContext: string
  beforeApplying: string[]
  procedureSteps: string[]
  ifFailed: string[]
  estimatedMinutes: number
  successRatePct: number
  relatedKm: string[]
}

export type EnrichedRunbook = AgentRunbook & {
  usageCount: number
  relevanceScore: number
  lastUsedAt: string | null
  successfulCount?: number
  escalatedAfterCount?: number
  waitingCount?: number
}

/** Build runbook cards from agent procedure rows. */
export function runbooksFromProcedures(procedures: AgentProcedureRow[]): EnrichedRunbook[] {
  return procedures.map((p) => {
    const beforeApplying = p.beforeApplying?.length
      ? p.beforeApplying
      : p.prerequisites
          .split(/[•\n;|·]/)
          .map((s) => s.trim())
          .filter(Boolean)
    const procedureSteps = p.steps.filter(Boolean)
    const ifFailed = p.ifFailed?.length
      ? p.ifFailed
      : [
          "Collecter logs et captures d'écran",
          "Documenter les tentatives FO",
          "Escalader N3 ou transférer selon périmètre",
        ]

    return {
      id: `km-${p.code}`,
      code: p.code,
      procedureCode: p.code,
      title: p.title,
      category: p.category,
      perimeter: p.scope,
      contextLine: p.summary.trim() || p.title,
      incidentContext: p.summary.trim() || p.title,
      beforeApplying,
      procedureSteps,
      ifFailed,
      estimatedMinutes: p.estimatedMinutes ?? 5,
      successRatePct: p.successRatePct ?? Math.round(p.relevanceScore * 100),
      relatedKm: [p.code],
      usageCount: p.usageCount,
      relevanceScore: p.relevanceScore,
      lastUsedAt: p.lastUsedAt,
      successfulCount: p.successfulCount,
      escalatedAfterCount: p.escalatedAfterCount,
      waitingCount: p.waitingCount,
    }
  })
}

export function runbookCategorySet(runbooks: EnrichedRunbook[]): string[] {
  const s = new Set(runbooks.map((r) => r.category))
  return [...s].sort((a, b) => a.localeCompare(b))
}
