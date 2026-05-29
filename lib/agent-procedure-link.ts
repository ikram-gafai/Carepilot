import type { EnrichedRunbook } from "@/lib/agent-runbooks-catalog"

export function normalizeKmCode(value: string): string {
  return value.trim().toUpperCase()
}

/** Deep-link to a KM row on the agent procedures page. */
export function buildAgentProcedureUrl(kmCode: string): string {
  return `/agent/procedures?km=${encodeURIComponent(kmCode.trim())}`
}

export function findRunbookByKmCode(
  runbooks: EnrichedRunbook[],
  kmCode: string,
): EnrichedRunbook | undefined {
  const target = normalizeKmCode(kmCode)
  if (!target) return undefined

  return runbooks.find((r) => {
    if (normalizeKmCode(r.procedureCode ?? "") === target) return true
    if (normalizeKmCode(r.code) === target) return true
    if (normalizeKmCode(r.code.replace(/^RB-/i, "")) === target) return true
    return r.relatedKm.some((km) => normalizeKmCode(km) === target)
  })
}

/** Avoid "KM KM-OP-002" when the id already carries the KM- prefix. */
export function formatKmSelectionReason(text: string, kmId: string): string {
  const trimmed = text.trim()
  if (!trimmed || !kmId) return trimmed
  const escaped = kmId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return trimmed.replace(new RegExp(`^KM\\s+(${escaped})`, "i"), "$1")
}
