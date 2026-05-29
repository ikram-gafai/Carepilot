import { loadOrchestratedAdminContext } from "@/lib/admin/orchestrated-supervision"
import {
  classifyEscalationReason,
  escalationCategoryLabel,
  escalationContext,
  escalationReasonDetail,
  escalationReasonLabel,
  ESCALATION_REASON_LABELS,
  ESCALATION_REQUIRED_ACTION,
  isFoN3Escalation,
  type EscalationReasonCategory,
} from "@/lib/admin/escalation-reason"
import { getDb } from "@/lib/db"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { inArray } from "drizzle-orm"

export type AdminEscalationFrequentReason = {
  label: string
  count: number
}

export type AdminEscalationOperationalSummary = {
  n3Total: number
  primaryCause: string
  slaAtRisk: number
}

export type AdminEscalationSupervisionRow = {
  ticketId: number
  careId: string
  incident: string
  category: string
  reason: string
  reasonCategory: EscalationReasonCategory
  kmAttempted: string | null
  slaLabel: string
  slaAtRisk: boolean
  priority: string
  createdAt: Date
  analysis: {
    decision: string
    reasonDetail: string
    context: string
    requiredAction: string
  }
}

/** @deprecated Legacy chart types — kept for unused ML chart components */
export type AdminEscalationPerimeterBar = { name: string; value: number }
export type AdminEscalationConfidenceBar = { name: string; value: number }
export type EscalationTrendPoint = { label: string; escalations: number }

function isSlaAtRisk(slaTone: string, slaRiskLevel: string | null): boolean {
  if (slaTone === "critical" || slaTone === "warning") return true
  const level = (slaRiskLevel ?? "").toUpperCase()
  return level === "HIGH" || level === "MEDIUM"
}

function topReason(
  reasonCounts: Map<EscalationReasonCategory, number>,
): string {
  let best: EscalationReasonCategory | null = null
  let max = 0
  for (const [key, count] of reasonCounts) {
    if (count > max) {
      max = count
      best = key
    }
  }
  return best ? ESCALATION_REASON_LABELS[best] : "—"
}

/** Escalades FO N3 — revue opérationnelle (hors transferts inter-périmètres). */
export async function adminEscalations() {
  const ctx = await loadOrchestratedAdminContext()
  const { queue } = ctx

  const foEscalationCandidates = queue.filter((r) => r.orchestratedDecision === "ESCALATE_N3")
  const ticketIds = foEscalationCandidates.map((r) => r.ticketId)

  const db = getDb()
  const ticketDetails =
    ticketIds.length > 0
      ? await db
          .select({
            id: cpAgentTickets.id,
            description: cpAgentTickets.description,
            category: cpAgentTickets.category,
            priority: cpAgentTickets.priority,
            createdAt: cpAgentTickets.createdAt,
          })
          .from(cpAgentTickets)
          .where(inArray(cpAgentTickets.id, ticketIds))
      : []

  const detailById = new Map(ticketDetails.map((t) => [t.id, t]))

  const foEscalationRows = foEscalationCandidates.filter((r) => {
    const detail = detailById.get(r.ticketId)
    return isFoN3Escalation(r, detail?.category ?? null)
  })

  const reasonCounts = new Map<EscalationReasonCategory, number>()
  for (const key of Object.keys(ESCALATION_REASON_LABELS) as EscalationReasonCategory[]) {
    reasonCounts.set(key, 0)
  }

  const rows: AdminEscalationSupervisionRow[] = foEscalationRows.map((r) => {
    const detail = detailById.get(r.ticketId)
    const description = detail?.description ?? ""
    const reasonCategory = classifyEscalationReason(r, description)
    reasonCounts.set(reasonCategory, (reasonCounts.get(reasonCategory) ?? 0) + 1)

    return {
      ticketId: r.ticketId,
      careId: r.careId,
      incident: r.title,
      category: escalationCategoryLabel(detail?.category ?? null, r.perimeterLabel),
      reason: escalationReasonLabel(reasonCategory),
      reasonCategory,
      kmAttempted: r.kmCode,
      slaLabel: r.slaLabel,
      slaAtRisk: isSlaAtRisk(r.slaTone, r.slaRiskLevel),
      priority: detail?.priority ?? r.priority,
      createdAt: detail?.createdAt ?? new Date(r.createdAt),
      analysis: {
        decision: "Escalade N3",
        reasonDetail: escalationReasonDetail(reasonCategory),
        context: escalationContext(reasonCategory),
        requiredAction: ESCALATION_REQUIRED_ACTION,
      },
    }
  })

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const frequentReasons: AdminEscalationFrequentReason[] = (
    Object.keys(ESCALATION_REASON_LABELS) as EscalationReasonCategory[]
  )
    .map((key) => ({
      label: ESCALATION_REASON_LABELS[key],
      count: reasonCounts.get(key) ?? 0,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)

  const summary: AdminEscalationOperationalSummary = {
    n3Total: rows.length,
    primaryCause: topReason(reasonCounts),
    slaAtRisk: rows.filter((r) => r.slaAtRisk).length,
  }

  return {
    summary,
    frequentReasons,
    rows,
  }
}
