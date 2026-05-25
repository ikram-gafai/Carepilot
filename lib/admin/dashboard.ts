import { getCarePilotOperationalMetrics } from "@/lib/carepilot-api/metrics"

import { PENDING_AI_TRAINING } from "@/lib/ai-phase"

import {

  adminAiSupervisionCompact,

  adminEscalationMonitoringBlock,

  adminTransferMonitoringBlock,

  adminSyncStatusCompact,

  buildSyncSupervisionRows,

} from "./dashboard-detail"

import { adminSlaEscalationTrend7d } from "./chart-data"

import {

  adminRecentSynchronizedTickets,

  adminTopMagasins,

} from "./store-metrics"



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



/** Admin dashboard — single source: cp_agent tickets + sync_logs (CARE sync MVP). */

export async function adminDashboardBundle() {

  const operational = await getCarePilotOperationalMetrics()

  const { kpis, pressure, sync, aiAcceptance, syncSummary } = operational



  const operationalPressure: DashboardPressureRow[] = pressure.map((r) => ({

    name: r.name,

    open: r.open,

    slaRisk: r.slaRisk,

  }))



  const [topMagasins, recentTickets, escalation, transfers, aiReliability, syncSources, slaEscalationTrend] =

    await Promise.all([

      adminTopMagasins(8),

      adminRecentSynchronizedTickets(10),

      adminEscalationMonitoringBlock(),

      adminTransferMonitoringBlock(),

      adminAiSupervisionCompact(),

      adminSyncStatusCompact(),

      adminSlaEscalationTrend7d(),

    ])



  const syncHealthLabel =

    sync.running

      ? "Synchronizing"

      : kpis.totalSynchronized > 0 && syncSummary.pendingCareRecords === 0

        ? "Healthy"

        : sync.label



  const syncSupervision = buildSyncSupervisionRows(

    syncHealthLabel,

    sync.running,

    sync.lastIngestionAt,

    syncSources.map((s) => ({ label: s.label, state: s.state })),

  )



  const aiAcceptancePct = aiReliability.acceptancePct ?? aiAcceptance.displayValue

  const aiRejectionPct = aiReliability.rejectionPct ?? "—"



  return {

    kpiStrip: {

      openTickets: healthyKpi(

        String(kpis.openTickets),

        `${kpis.totalSynchronized} synchronized`,

      ),

      slaRisk: {

        value: String(kpis.slaRisk),

        subtitle: "Next 4 hours",

        status: kpiStatusForCount(kpis.slaRisk, 3, 8) as AdminKpiStatus,

      },

      transfers: {

        value: String(kpis.transfers),

        subtitle: transfers.topDestination !== "—" ? `Top: ${transfers.topDestination}` : "Perimeter routing",

        status: kpiStatusForCount(kpis.transfers, 2, 6) as AdminKpiStatus,

      },

      escalateN3: {

        value: String(kpis.escalations),

        subtitle: escalation.topCategory !== "—" ? escalation.topCategory : "N3 queue",

        status: kpiStatusForCount(kpis.escalations, 1, 4) as AdminKpiStatus,

      },

      syncHealth: {

        value: syncHealthLabel,

        subtitle: sync.lastIngestionAt

          ? `Last ${new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(sync.lastIngestionAt)}`

          : "Awaiting ingestion",

        status: (syncHealthLabel === "Healthy" ? "healthy" : sync.running ? "watch" : "critical") as AdminKpiStatus,

      },

      aiStatus: healthyKpi(aiAcceptance.displayValue, PENDING_AI_TRAINING),

    },

    supervision: {

      escalation: {

        rows: [

          { label: "Open", value: String(escalation.open) },

          { label: "Top category", value: escalation.topCategory },

          { label: "Aging > 4h", value: String(escalation.agingOver4h) },

          { label: "Unresolved P1", value: String(escalation.criticalUnresolved) },

        ],

        tone: escalation.criticalUnresolved > 0 || escalation.agingOver4h > 0 ? "critical" : "primary",

      },

      transfers: {

        rows: [

          { label: "Volume", value: String(transfers.total) },

          { label: "Top destination", value: transfers.topDestination },

          { label: "Routing imbalance", value: transfers.routingImbalance },

          { label: "Repeated", value: String(transfers.repeatedWrongPerimeter) },

        ],

        tone: transfers.total > 4 ? "primary" : "neutral",

      },

      aiReliability: {

        rows: [

          {

            label: "Acceptance",

            value: typeof aiAcceptancePct === "number" ? `${aiAcceptancePct}%` : String(aiAcceptancePct),

          },

          {

            label: "Rejection",

            value: typeof aiRejectionPct === "number" ? `${aiRejectionPct}%` : String(aiRejectionPct),

          },

          {

            label: "Confidence",

            value: aiReliability.avgConfidencePct > 0 ? `${aiReliability.avgConfidencePct}%` : PENDING_AI_TRAINING,

          },

          {

            label: "Latest rejected",

            value: aiReliability.latestRejectedCategory ?? "—",

          },

        ],

        tone: "primary",

      },

      syncHealth: {

        rows: syncSupervision.rows.map((r) => ({ label: r.label, value: r.value })),

        tone: syncSupervision.tone,

      },

    },

    slaEscalationTrend,

    operationalPressure,

    topMagasins,

    recentTickets,

    lastSyncAt: sync.lastIngestionAt,

    synchronizedTotal: kpis.totalSynchronized,

  }

}


