/**
 * Procedure row for agent runbook telemetry merge (client-safe — no DB imports).
 */
export type AgentProcedureRow = {
  id: number
  code: string
  title: string
  category: string
  scope: string
  summary: string
  prerequisites: string
  steps: string[]
  tags: string
  relevanceScore: number
  usageCount: number
  lastUsedAt: string | null
}

export function distinctScopes(procedures: AgentProcedureRow[]): string[] {
  const s = new Set(procedures.map((p) => p.scope))
  return [...s].sort((a, b) => a.localeCompare(b))
}

export function distinctCategories(procedures: AgentProcedureRow[]): string[] {
  const s = new Set(procedures.map((p) => p.category))
  return [...s].sort((a, b) => a.localeCompare(b))
}
