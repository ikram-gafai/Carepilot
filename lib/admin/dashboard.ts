import { loadOrchestratedAdminContext } from "@/lib/admin/orchestrated-supervision"
import { loadAiPipelineHealth } from "@/lib/admin/ai-pipeline-health"
import { adminLatestSync } from "@/lib/admin/sync"
import { adminSlaEscalationTrend7d } from "@/lib/admin/chart-data"
import { adminRecentSynchronizedTickets, adminTopMagasins } from "@/lib/admin/store-metrics"
import { buildSyncSupervisionRows, adminSyncStatusCompact } from "@/lib/admin/dashboard-detail"

export type AdminKpiStatus = "healthy" | "watch" | "critical"

export type AdminDashboardKpi = {
  value: string
  subtitle: string
  status: AdminKpiStatus
}

export type DashboardPressureRow = {
  name: string
  open: number
  slaRisk: number
}

function healthyKpi(value: string, subtitle = ""): AdminDashboardKpi {
  return { value, subtitle, status: "healthy" }
}

function kpiStatusForCount(n: number, warnAt: number, criticalAt: number): AdminKpiStatus {
  if (n >= criticalAt) return "critical"
  if (n >= warnAt) return "watch"
  return "healthy"
}

/** Admin dashboard — même orchestration et KPIs que l'espace agent. */
export async function adminDashboardBundle() {
  const ctx = await loadOrchestratedAdminContext()
  const { kpis, decisionFeedback, diagnostics, decisionDistribution, transferByTarget } =
    ctx

  const [topMagasins, recentTickets, latestSync, syncSources, slaEscalationTrend] = await Promise.all([
    adminTopMagasins(8),
    adminRecentSynchronizedTickets(10),
    adminLatestSync(),
    adminSyncStatusCompact(),
    adminSlaEscalationTrend7d(),
  ])

  const syncRunning = latestSync?.status === "running"
  const syncHealthLabel = syncRunning
    ? "Synchronisation en cours"
    : ctx.synchronizedTickets > 0
      ? "Sain"
      : "En attente"

  const syncSupervision = buildSyncSupervisionRows(
    syncHealthLabel,
    syncRunning,
    latestSync?.syncFinishedAt ?? null,
    syncSources.map((s) => ({ label: s.label, state: s.state })),
  )

  const { summary: kmSummary, procedures: kmProcedures } = ctx.kmUsage
  const kmWaiting = kmProcedures.reduce((sum, row) => sum + row.waitingCount, 0)

  const aiPipelineHealth = await loadAiPipelineHealth(
    ctx.synchronizedTickets,
    diagnostics.withAgentAction,
    { kmAnalysisCompleted: ctx.kmUsage.summary.ticketsMatched },
  )

  return {
    kpiStrip: {
      openTickets: healthyKpi(String(kpis.openTickets)),
      slaRisk: {
        value: String(kpis.slaAttention),
        subtitle: "",
        status: kpiStatusForCount(kpis.slaAttention, 3, 8),
      },
      transfers: {
        value: String(kpis.transfer),
        subtitle: "",
        status: kpiStatusForCount(kpis.transfer, 2, 6),
      },
      escalateN3: {
        value: String(kpis.escalation),
        subtitle: "",
        status: kpiStatusForCount(kpis.escalation, 1, 4),
      },
      suspend: {
        value: String(kpis.suspend),
        subtitle: "",
        status: kpiStatusForCount(kpis.suspend, 2, 5),
      },
      syncHealth: {
        value: syncHealthLabel,
        subtitle: latestSync?.syncFinishedAt
          ? new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(latestSync.syncFinishedAt)
          : "",
        status: (syncHealthLabel === "Sain" ? "healthy" : syncRunning ? "watch" : "critical") as AdminKpiStatus,
      },
      aiStatus: {
        value: String(decisionFeedback.actionsCompleted),
        subtitle: "",
        status:
          decisionFeedback.adjustedDecisions > 0
            ? ("watch" as const)
            : ("healthy" as const),
      },
    },
    decisionFeedback,
    supervision: {
      decisionAlignment: {
        tone: decisionFeedback.adjustedDecisions > 0 ? ("critical" as const) : ("primary" as const),
      },
      transfers: {
        rows: transferByTarget.slice(0, 4).map((t) => ({
          label: t.target,
          value: String(t.count),
        })),
        tone: "neutral" as const,
      },
      kmEffectiveness: {
        rows: [
          { label: "Tickets avec KM", value: String(kmSummary.ticketsMatched) },
          { label: "Taux de succès", value: `${kmSummary.overallSuccessRatePct}%` },
          { label: "Escalade après KM", value: String(kmSummary.escalatedAfterKm) },
          { label: "En attente", value: String(kmWaiting) },
        ],
        tone: kmSummary.escalatedAfterKm > 0 ? ("critical" as const) : ("primary" as const),
      },
    },
    decisionDistribution,
    slaExposure: ctx.slaExposure,
    transferByTarget: ctx.transferByTarget,
    diagnostics,
    aiPipelineHealth,
    systemHealth: {
      sync: {
        rows: syncSupervision.rows.map((r) => ({ label: r.label, value: r.value })),
        tone: syncSupervision.tone,
      },
    },
    slaEscalationTrend,
    topMagasins,
    recentTickets,
    lastSyncAt: latestSync?.syncFinishedAt ?? null,
    synchronizedTotal: ctx.synchronizedTickets,
  }
}
