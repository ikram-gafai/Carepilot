/**
 * Runbooks derived from synchronized CARE KM procedures (no static catalog).
 */

import type { AgentProcedureRow } from "@/lib/agent-procedures-view"

export type AgentRunbook = {
  id: string
  code: string
  procedureCode: string | null
  title: string
  category: string
  contextLine: string
  frequencyLabel: string
  severity: "critical" | "elevated" | "standard"
  incidentContext: string
  firstChecks: string[]
  escalateWhen: string[]
  transferMatWhen: string[]
  requiredEvidence: string[]
  relatedKm: string[]
  operationalNotes: string
  baselineWeight: number
}

export type EnrichedRunbook = AgentRunbook & {
  usageCount: number
  relevanceScore: number
  lastUsedAt: string | null
}

function severityFromScore(score: number): AgentRunbook["severity"] {
  if (score >= 0.9) return "critical"
  if (score >= 0.75) return "elevated"
  return "standard"
}

function tagsToRelatedKm(tags: string, code: string): string[] {
  const fromTags = tags
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter((t) => /^KM-/i.test(t))
  return fromTags.length > 0 ? fromTags : [code]
}

/** Build runbook cards from synchronized KM rows returned by `/api/agent/procedures`. */
export function runbooksFromProcedures(procedures: AgentProcedureRow[]): EnrichedRunbook[] {
  return procedures.map((p) => {
    const checks = p.steps.filter(Boolean)
    const score = p.relevanceScore > 0 ? p.relevanceScore : 0.8
    return {
      id: `km-${p.id}`,
      code: `RB-${p.code}`,
      procedureCode: p.code,
      title: p.title,
      category: p.category,
      contextLine: p.summary.trim() || p.title,
      frequencyLabel: p.usageCount > 0 ? `${p.usageCount} uses` : "Synchronized",
      severity: severityFromScore(score),
      incidentContext: p.summary.trim() || `${p.title} — ${p.scope}`,
      firstChecks:
        checks.length > 0 ? checks.slice(0, 6) : [`Open ${p.code} and follow synchronized steps.`],
      escalateWhen: [],
      transferMatWhen: [],
      requiredEvidence: p.prerequisites ? [p.prerequisites] : [],
      relatedKm: tagsToRelatedKm(p.tags, p.code),
      operationalNotes: p.prerequisites.trim() || p.scope,
      baselineWeight: score,
      usageCount: p.usageCount,
      relevanceScore: score,
      lastUsedAt: p.lastUsedAt,
    }
  })
}

export function runbookCategorySet(runbooks: EnrichedRunbook[]): string[] {
  const s = new Set(runbooks.map((r) => r.category))
  return [...s].sort((a, b) => a.localeCompare(b))
}
