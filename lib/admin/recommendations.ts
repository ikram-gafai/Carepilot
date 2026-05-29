import {
  loadOrchestratedAdminContext,
} from "@/lib/admin/orchestrated-supervision"
import {
  recommendationValidationLabel,
  type AdminRecommendationHistoryRow,
  type AdminValidationSummary,
} from "@/lib/admin/recommendation-audit-types"
import type { AgentQueueRow } from "@/lib/carepilot-api/agent-dashboard-data"

export type {
  AdminRecommendationAnalysis,
  AdminRecommendationDecisionFilter,
  AdminRecommendationHistoryRow,
  AdminRecommendationsData,
  AdminValidationSummary,
} from "@/lib/admin/recommendation-audit-types"

export { matchesRecommendationDecisionFilter, recommendationResultLabel, recommendationValidationLabel } from "@/lib/admin/recommendation-audit-types"

function buildSignals(row: AgentQueueRow): string[] {
  const signals: string[] = []
  if (row.transferRequired) signals.push("Motif réseau détecté")
  if (row.escalationRequired) signals.push("Signal escalade N3")
  if (row.hasKmRecommendation && row.kmCode) signals.push(`Procédure ${row.kmCode} disponible`)
  if (row.qualityLevel === "INCOMPLETE" || row.qualityLevel === "POOR") {
    signals.push("Contexte incomplet")
  }
  if (row.slaTone === "critical" || row.slaTone === "warning") {
    signals.push("Exposition SLA")
  }
  if (signals.length === 0) signals.push("Analyse standard")
  return signals
}

function buildReason(row: AgentQueueRow): string {
  if (row.actionReason) return row.actionReason
  switch (row.orchestratedDecision) {
    case "TRANSFER":
      return row.decisionTarget
        ? `Incident hors périmètre FO — routage ${row.decisionTarget}.`
        : "Incident hors périmètre FO — transfert inter-périmètre suggéré."
    case "ESCALATE_N3":
      return "Complexité ou échec procédural — revue spécialiste N3 requise."
    case "SUSPEND":
      return "En attente retour magasin ou dépendance externe."
    case "REQUEST_INFORMATION":
      return "Éléments manquants — compléter le contexte avant décision."
    case "RESOLVE":
      return row.kmCode
        ? `Résolution locale via procédure ${row.kmCode}.`
        : "Résolution locale selon parcours FO standard."
    default:
      return row.recommendedNextStep
  }
}

function formatRecommendationLabel(row: AgentQueueRow, aiDecision: string): string {
  if (row.orchestratedDecision === "TRANSFER" && row.decisionTarget) {
    return `${aiDecision} ${row.decisionTarget}`
  }
  return aiDecision
}

function formatAgentFeedback(helpful: boolean | null): string {
  if (helpful === true) return "Acceptée"
  if (helpful === false) return "Rejetée"
  return "Non renseigné"
}

/** Audit opérationnel des recommandations IA et validations agents. */
export async function adminRecommendations() {
  const ctx = await loadOrchestratedAdminContext()
  const queueById = new Map(ctx.queue.map((r) => [r.ticketId, r]))
  const feedbackById = new Map(ctx.feedbackRows.map((r) => [r.ticketId, r]))

  const validationSummary: AdminValidationSummary = {
    generated: ctx.recommendationRows.length,
    validated: ctx.decisionFeedback.followedAi,
    modified: ctx.decisionFeedback.adjustedDecisions,
    pending: ctx.recommendationRows.filter((row) => row.alignmentStatus === "pending").length,
  }

  const rows: AdminRecommendationHistoryRow[] = ctx.recommendationRows.map((rec) => {
    const queueRow = queueById.get(rec.ticketId)!
    const fb = feedbackById.get(rec.ticketId)
    const aiDecision = rec.suggestedDecision

    return {
      ticketId: rec.ticketId,
      careId: rec.careId,
      incident: rec.title,
      aiDecision,
      aiKmCode: rec.kmCode,
      orchestratedDecision: queueRow.orchestratedDecision,
      confidencePct: rec.confidencePct,
      signalSummary: rec.signalSummary,
      agentActionLabel: rec.agentActionLabel,
      validationLabel: recommendationValidationLabel(rec.alignmentStatus),
      alignmentStatus: rec.alignmentStatus,
      analysis: {
        recommendation: formatRecommendationLabel(queueRow, aiDecision),
        reason: buildReason(queueRow),
        confidencePct: rec.confidencePct,
        signals: buildSignals(queueRow),
        agentFeedback: formatAgentFeedback(fb?.helpful ?? null),
        comment: fb?.comment ?? null,
      },
    }
  })

  return { validationSummary, rows }
}
