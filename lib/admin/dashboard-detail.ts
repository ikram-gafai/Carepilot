import { and, count, desc, eq, sql } from "drizzle-orm"

import { ESCALATION_PREDICTION_ENABLED, AI_PHASE_DISABLED, PENDING_AI_TRAINING, TRANSFER_PREDICTION_ENABLED } from "@/lib/ai-phase"
import { getEscalationPredictionStats } from "@/lib/ai/run-escalation-predictions"
import { getTransferPredictionStats, listTransferPredictions } from "@/lib/ai/run-transfer-predictions"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import { N3_TICKET_STATUS, TRANSFER_DESTINATIONS } from "@/lib/care-operational-actions"
import { getDb } from "@/lib/db"
import { OPERATIONAL_OPEN_SCOPE, OPERATIONAL_TICKET_SCOPE } from "@/lib/admin/shared"
import { cpAdminSourceHealth } from "@/lib/db/schema/cp-admin"
import {
  cpAgentAiAnalyses,
  cpAgentAiEscalationPredictions,
  cpAgentAiFeedback,
  cpAgentAiTransferPredictions,
  cpAgentTicketHistory,
  cpAgentTickets,
} from "@/lib/db/schema/cp-agent"

export async function adminEscalationMonitoringBlock() {
  if (ESCALATION_PREDICTION_ENABLED) {
    const db = getDb()
    const stats = await getEscalationPredictionStats()

    const topCat = await db
      .select({ category: cpAgentTickets.category, c: count() })
      .from(cpAgentAiEscalationPredictions)
      .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiEscalationPredictions.ticketId))
      .where(
        and(
          OPERATIONAL_TICKET_SCOPE,
          eq(cpAgentAiEscalationPredictions.predictedEscalationRequired, true),
        )!,
      )
      .groupBy(cpAgentTickets.category)
      .orderBy(desc(count()))
      .limit(1)

    const [highConfidence] = await db
      .select({ c: count() })
      .from(cpAgentAiEscalationPredictions)
      .where(
        and(
          eq(cpAgentAiEscalationPredictions.predictedEscalationRequired, true),
          sql`${cpAgentAiEscalationPredictions.confidenceScore} >= 0.75`,
        )!,
      )

    const [critical] = await db
      .select({ c: count() })
      .from(cpAgentAiEscalationPredictions)
      .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiEscalationPredictions.ticketId))
      .where(
        and(
          eq(cpAgentAiEscalationPredictions.predictedEscalationRequired, true),
          OPERATIONAL_TICKET_SCOPE,
          eq(cpAgentTickets.priority, "P1"),
        )!,
      )

    return {
      n3Volume: stats.escalationCount,
      open: stats.escalationCount,
      topCategory: topCat[0] ? cpAgentCategoryLabel(topCat[0].category) : "—",
      avgAgingHours: 0,
      agingOver4h: Number(highConfidence?.c ?? 0),
      criticalUnresolved: Number(critical?.c ?? 0),
    }
  }

  const db = getDb()
  const [n3Vol] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, N3_TICKET_STATUS))!)

  const topCat = await db
    .select({ category: cpAgentTickets.category, c: count() })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, N3_TICKET_STATUS))!)
    .groupBy(cpAgentTickets.category)
    .orderBy(desc(count()))
    .limit(1)

  const [ageRow] = await db
    .select({
      avgH: sql<number>`coalesce(avg(extract(epoch from (now() - ${cpAgentTickets.updatedAt})) / 3600.0), 0)`,
    })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, N3_TICKET_STATUS))!)

  const [critical] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, N3_TICKET_STATUS), eq(cpAgentTickets.priority, "P1"))!)

  const [agingOver4h] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(
      and(
        OPERATIONAL_TICKET_SCOPE,
        eq(cpAgentTickets.status, N3_TICKET_STATUS),
        OPERATIONAL_OPEN_SCOPE,
        sql`${cpAgentTickets.updatedAt} <= now() - interval '4 hours'`,
      )!,
    )

  const [openEscalated] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, N3_TICKET_STATUS), OPERATIONAL_OPEN_SCOPE)!)

  return {
    n3Volume: Number(n3Vol?.c ?? 0),
    open: Number(openEscalated?.c ?? 0),
    topCategory: topCat[0] ? cpAgentCategoryLabel(topCat[0].category) : "—",
    avgAgingHours: Math.round(Number(ageRow?.avgH ?? 0) * 10) / 10,
    agingOver4h: Number(agingOver4h?.c ?? 0),
    criticalUnresolved: Number(critical?.c ?? 0),
  }
}

export async function adminTransferMonitoringBlock() {
  if (TRANSFER_PREDICTION_ENABLED) {
    const stats = await getTransferPredictionStats()
    const predictions = await listTransferPredictions()
    const transferRows = predictions.filter((p) => p.predictedTransferRequired)

    const volumes: Record<string, number> = {}
    for (const row of transferRows) {
      volumes[row.targetPerimeter] = (volumes[row.targetPerimeter] ?? 0) + 1
    }

    const topEntry = Object.entries(volumes).sort((a, b) => b[1] - a[1])[0]
    const topDestination = topEntry && topEntry[1] > 0 ? topEntry[0] : "—"
    const total = stats.transferCount
    const imbalance =
      total === 0 || !topEntry
        ? "—"
        : `${Math.round((topEntry[1] / total) * 100)}% via ${topDestination}`

    return {
      volumes,
      total,
      topDestination,
      routingImbalance: imbalance,
      repeatedWrongPerimeter: 0,
    }
  }

  if (AI_PHASE_DISABLED) {
    return {
      volumes: {} as Record<string, number>,
      total: 0,
      topDestination: PENDING_AI_TRAINING,
      routingImbalance: PENDING_AI_TRAINING,
      repeatedWrongPerimeter: 0,
    }
  }

  const db = getDb()
  const volumes: Record<string, number> = {}
  let total = 0
  for (const dest of TRANSFER_DESTINATIONS) {
    const [row] = await db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, dest.status))!)
    const n = Number(row?.c ?? 0)
    volumes[dest.label] = n
    total += n
  }

  const topEntry = Object.entries(volumes).sort((a, b) => b[1] - a[1])[0]
  const topDestination = topEntry && topEntry[1] > 0 ? topEntry[0] : "—"
  const imbalance =
    total === 0 || !topEntry
      ? "—"
      : `${Math.round((topEntry[1] / total) * 100)}% via ${topDestination}`

  let repeatedWrongPerimeter = 0
  try {
    const [dupRow] = await db
      .select({
        c: sql<number>`(
          select count(*)::int from (
            select ${cpAgentTicketHistory.ticketId} as tid
            from ${cpAgentTicketHistory}
            where (
              ${cpAgentTicketHistory.eventType} ilike '%transfer%'
              or ${cpAgentTicketHistory.summary} ilike '%transfer%'
            )
            and ${cpAgentTicketHistory.occurredAt} >= now() - interval '30 days'
            group by tid
            having count(*) >= 2
          ) x
        )`,
      })
      .from(cpAgentTickets)
      .limit(1)
    repeatedWrongPerimeter = Number(dupRow?.c ?? 0)
  } catch {
    repeatedWrongPerimeter = 0
  }

  return {
    volumes,
    total,
    topDestination,
    routingImbalance: imbalance,
    repeatedWrongPerimeter,
  }
}

export async function adminAiSupervisionCompact() {
  const db = getDb()
  try {
    const [avgC] = await db
      .select({ avg: sql<number>`coalesce(avg(${cpAgentAiAnalyses.confidence}), 0)` })
      .from(cpAgentAiAnalyses)

    const [rejRecent] = await db
      .select({ c: count() })
      .from(cpAgentAiFeedback)
      .where(
        and(eq(cpAgentAiFeedback.helpful, false), sql`${cpAgentAiFeedback.createdAt} >= now() - interval '7 days'`)!,
      )
    const [rejPrior] = await db
      .select({ c: count() })
      .from(cpAgentAiFeedback)
      .where(
        and(
          eq(cpAgentAiFeedback.helpful, false),
          sql`${cpAgentAiFeedback.createdAt} >= now() - interval '14 days'`,
          sql`${cpAgentAiFeedback.createdAt} < now() - interval '7 days'`,
        )!,
      )

    const r = Number(rejRecent?.c ?? 0)
    const p = Number(rejPrior?.c ?? 0)
    let rejectionTrend: "up" | "down" | "flat" = "flat"
    if (p === 0 && r > 0) rejectionTrend = "up"
    else if (p > 0) {
      if (r > p * 1.15) rejectionTrend = "up"
      else if (r < p * 0.85) rejectionTrend = "down"
    }

    const [row] = await db
      .select({
        category: cpAgentTickets.category,
      })
      .from(cpAgentAiFeedback)
      .innerJoin(cpAgentTickets, eq(cpAgentTickets.id, cpAgentAiFeedback.ticketId))
      .where(eq(cpAgentAiFeedback.helpful, false))
      .orderBy(desc(cpAgentAiFeedback.createdAt))
      .limit(1)

    const [helpful] = await db
      .select({ c: count() })
      .from(cpAgentAiFeedback)
      .where(eq(cpAgentAiFeedback.helpful, true))
    const [notHelpful] = await db
      .select({ c: count() })
      .from(cpAgentAiFeedback)
      .where(eq(cpAgentAiFeedback.helpful, false))
    const rated = Number(helpful?.c ?? 0) + Number(notHelpful?.c ?? 0)
    const acceptancePct = rated ? Math.round((100 * Number(helpful?.c ?? 0)) / rated) : null
    const rejectionPct = rated ? Math.round((100 * Number(notHelpful?.c ?? 0)) / rated) : null

    return {
      avgConfidencePct: Math.round(Number(avgC?.avg ?? 0) * 100),
      acceptancePct,
      rejectionPct,
      rejectionTrend,
      latestRejectedCategory: row != null ? cpAgentCategoryLabel(row.category) : null,
    }
  } catch {
    return {
      avgConfidencePct: 0,
      acceptancePct: null,
      rejectionPct: null,
      rejectionTrend: "flat" as const,
      latestRejectedCategory: null,
    }
  }
}

export type AdminSyncSupervisionRow = { label: string; value: string; health: "healthy" | "degraded" | "critical" }

export function buildSyncSupervisionRows(
  syncLabel: string,
  running: boolean,
  lastIngestionAt: Date | null,
  sourceRows: { label: string; state: string }[],
): { rows: AdminSyncSupervisionRow[]; tone: "success" | "primary" | "critical" } {
  const latencyMin =
    lastIngestionAt != null
      ? Math.max(0, Math.round((Date.now() - lastIngestionAt.getTime()) / 60_000))
      : null

  const ingestion = running ? "Synchronisation en cours" : syncLabel
  const ingestionHealth: AdminSyncSupervisionRow["health"] = running
    ? "degraded"
    : syncLabel === "Sain"
      ? "healthy"
      : "degraded"

  if (sourceRows.length >= 3) {
    return {
      rows: [
        ...sourceRows.slice(0, 3).map((s) => ({
          label: s.label,
          value: s.state,
          health: (s.state.toLowerCase().includes("health") ? "healthy" : "degraded") as AdminSyncSupervisionRow["health"],
        })),
        {
          label: "Latence",
          value: latencyMin != null ? `${latencyMin}m` : "—",
          health: latencyMin != null && latencyMin > 30 ? "degraded" : "healthy",
        },
      ],
      tone: ingestionHealth === "healthy" ? "success" : running ? "primary" : "critical",
    }
  }

  const careHealth: AdminSyncSupervisionRow["health"] =
    syncLabel === "Sain" ? "healthy" : running || syncLabel === "Synchronisation en cours" ? "degraded" : "degraded"

  return {
    rows: [
      { label: "Source CARE", value: syncLabel, health: careHealth },
      { label: "Parseur", value: "Sain", health: "healthy" },
      { label: "Ingestion", value: ingestion, health: ingestionHealth },
      {
        label: "Latency",
        value: latencyMin != null ? `${latencyMin}m` : "—",
        health: latencyMin != null && latencyMin > 30 ? "degraded" : "healthy",
      },
    ],
    tone:
      careHealth === "healthy" && ingestionHealth === "healthy"
        ? "success"
        : running || syncLabel !== "Sain"
          ? "primary"
          : "success",
  }
}

export async function adminSyncStatusCompact() {
  const db = getDb()
  try {
    const rows = await db.select().from(cpAdminSourceHealth).orderBy(cpAdminSourceHealth.sourceKey)
    return rows.map((r) => ({
      key: r.sourceKey,
      label: r.label,
      state: r.state,
      detail: r.detail,
    }))
  } catch {
    return []
  }
}

export async function adminOpenN3Count() {
  const db = getDb()
  const [r] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, eq(cpAgentTickets.status, N3_TICKET_STATUS))!)
  return Number(r?.c ?? 0)
}
