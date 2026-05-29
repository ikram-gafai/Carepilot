import type { AgentQueueRow } from "@/lib/carepilot-api/agent-dashboard-data"
import {
  KM_PROCEDURE_BY_CODE,
  KM_PROCEDURE_CATALOG,
  type KmProcedureCatalogEntry,
} from "@/lib/care-operational/km-procedure-catalog"

export type KmProcedureUsageRow = {
  code: string
  title: string | null
  matchedTickets: number
  successfulCount: number
  escalatedAfterCount: number
  waitingCount: number
  successPct: number
  lastUsedAt: string | null
}

export type KmUsageSummary = {
  totalProcedures: number
  ticketsMatched: number
  ticketsTotal: number
  overallSuccessRatePct: number
  escalatedAfterKm: number
}

export type KmUsageAnalytics = {
  summary: KmUsageSummary
  procedures: KmProcedureUsageRow[]
}

export function catalogEntryForKmCode(code: string): KmProcedureCatalogEntry | undefined {
  const trimmed = code.trim()
  return (
    KM_PROCEDURE_BY_CODE.get(trimmed) ??
    KM_PROCEDURE_BY_CODE.get(trimmed.toUpperCase()) ??
    KM_PROCEDURE_CATALOG.find((entry) => entry.code.toLowerCase() === trimmed.toLowerCase())
  )
}

type UsageAccumulator = {
  code: string
  matchedTickets: number
  successfulCount: number
  escalatedAfterCount: number
  waitingCount: number
  lastUsedAt: string | null
}

function pct(successful: number, total: number, fallback = 0): number {
  if (total <= 0) return fallback
  return Math.round((successful / total) * 100)
}

function classifyTicketOutcome(
  row: AgentQueueRow,
  agentActionTicketIds: Set<number>,
): "success" | "escalated" | "waiting" {
  if (row.orchestratedDecision === "ESCALATE_N3") return "escalated"
  if (row.orchestratedDecision === "RESOLVE") return "success"
  if (row.orchestratedDecision === "REQUEST_INFORMATION" || row.orchestratedDecision === "SUSPEND") {
    return "waiting"
  }
  if (!agentActionTicketIds.has(row.ticketId)) return "waiting"
  return "waiting"
}

function accumulateUsage(
  queue: AgentQueueRow[],
  agentActionTicketIds: Iterable<number>,
): Map<string, UsageAccumulator> {
  const acted = new Set(agentActionTicketIds)
  const byCode = new Map<string, UsageAccumulator>()

  for (const row of queue) {
    const code = row.kmCode?.trim()
    if (!code || !row.hasKmRecommendation) continue

    const cur =
      byCode.get(code) ??
      ({
        code,
        matchedTickets: 0,
        successfulCount: 0,
        escalatedAfterCount: 0,
        waitingCount: 0,
        lastUsedAt: null,
      } satisfies UsageAccumulator)

    cur.matchedTickets += 1
    const outcome = classifyTicketOutcome(row, acted)
    if (outcome === "success") cur.successfulCount += 1
    else if (outcome === "escalated") cur.escalatedAfterCount += 1
    else cur.waitingCount += 1

    if (row.updatedAt && (!cur.lastUsedAt || row.updatedAt > cur.lastUsedAt)) {
      cur.lastUsedAt = row.updatedAt
    }

    byCode.set(code, cur)
  }

  return byCode
}

function toProcedureRows(byCode: Map<string, UsageAccumulator>): KmProcedureUsageRow[] {
  const codes = new Set([...KM_PROCEDURE_CATALOG.map((entry) => entry.code), ...byCode.keys()])

  return [...codes]
    .map((code) => {
      const usage = byCode.get(code)
      const entry = catalogEntryForKmCode(code)
      const matchedTickets = usage?.matchedTickets ?? 0
      const successfulCount = usage?.successfulCount ?? 0
      const escalatedAfterCount = usage?.escalatedAfterCount ?? 0
      const waitingCount = usage?.waitingCount ?? 0
      const fallbackPct = entry?.baselineSuccessPct ?? 0

      return {
        code,
        title: entry?.title ?? null,
        matchedTickets,
        successfulCount,
        escalatedAfterCount,
        waitingCount,
        successPct: pct(successfulCount, matchedTickets, matchedTickets > 0 ? fallbackPct : 0),
        lastUsedAt: usage?.lastUsedAt ?? null,
      }
    })
    .sort((a, b) => b.matchedTickets - a.matchedTickets || a.code.localeCompare(b.code))
}

/**
 * Unified KM usage analytics for agent procedures and admin supervision.
 */
export async function loadKmUsageAnalytics(
  queue: AgentQueueRow[],
  agentActionTicketIds: Iterable<number>,
  synchronizedTotal?: number,
): Promise<KmUsageAnalytics> {
  const byCode = accumulateUsage(queue, agentActionTicketIds)
  const procedures = toProcedureRows(byCode)

  const ticketsMatched = queue.filter((row) => row.hasKmRecommendation && row.kmCode).length
  const successfulTotal = procedures.reduce((sum, row) => sum + row.successfulCount, 0)
  const escalatedAfterKm = procedures.reduce((sum, row) => sum + row.escalatedAfterCount, 0)
  const ticketsTotal = synchronizedTotal ?? queue.length

  return {
    summary: {
      totalProcedures: KM_PROCEDURE_CATALOG.length,
      ticketsMatched,
      ticketsTotal,
      overallSuccessRatePct: pct(successfulTotal, ticketsMatched, 0),
      escalatedAfterKm,
    },
    procedures,
  }
}
