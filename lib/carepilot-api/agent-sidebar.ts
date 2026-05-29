import { and, asc, count, eq, sql } from "drizzle-orm"
import { cache } from "react"

import { operationalCareTicketScope } from "@/lib/care-operational/operational-ticket-scope"
import { CLOSED_STATUS_SQL_LIST } from "@/lib/care-operational-actions"
import { findCpAgentUserByAuthEmail } from "@/lib/cp-agent/user-match"
import { getSyncStatus } from "@/lib/carepilot-api/sync"
import { getDb } from "@/lib/db"
import { cpAgentTickets, cpAgentUsers } from "@/lib/db/schema/cp-agent"
import { cpAgentDashboardTopMetrics } from "@/lib/queries/cp-agent"

const CLOSED_SQL = CLOSED_STATUS_SQL_LIST

export type AgentSidebarSnapshot = {
  activeIncidents: number
  slaAtRisk: number
  actionRequired: number
  myOpenTickets: number
  cpAgentUserId: number | null
  syncLabel: "Healthy" | "Degraded" | "Synchronizing" | "Unknown"
  lastSyncAt: string | null
  slaPressure: "Low" | "Moderate" | "High"
  aiEngine: "Active"
  agentName: string
  agentRole: string
}

function slaPressureLevel(open: number, atRisk: number): AgentSidebarSnapshot["slaPressure"] {
  if (open <= 0) return atRisk > 0 ? "Moderate" : "Low"
  const ratio = atRisk / open
  if (atRisk >= 6 || ratio >= 0.35) return "High"
  if (atRisk >= 1 || ratio >= 0.12) return "Moderate"
  return "Low"
}

export async function getAgentSidebarSnapshot(sessionEmail?: string | null): Promise<AgentSidebarSnapshot> {
  const db = getDb()
  const [metrics, sync, matchedAgent, fallbackAgents] = await Promise.all([
    cpAgentDashboardTopMetrics(),
    getSyncStatus({ includeEntityCounts: false }),
    sessionEmail ? findCpAgentUserByAuthEmail(db, sessionEmail) : Promise.resolve(null),
    db
      .select({ displayName: cpAgentUsers.displayName, role: cpAgentUsers.role })
      .from(cpAgentUsers)
      .orderBy(asc(cpAgentUsers.id))
      .limit(1),
  ])

  const agent = matchedAgent ?? fallbackAgents[0]

  let myOpenTickets = 0
  if (matchedAgent) {
    const [mine] = await db
      .select({ c: count() })
      .from(cpAgentTickets)
      .where(
        operationalCareTicketScope(
          eq(cpAgentTickets.assignedUserId, matchedAgent.id),
          sql`${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_SQL)})`,
        )!,
      )
    myOpenTickets = Number(mine?.c ?? 0)
  }

  let syncLabel: AgentSidebarSnapshot["syncLabel"] = "Unknown"
  if (sync.running) syncLabel = "Synchronizing"
  else if (sync.health === "healthy") syncLabel = "Healthy"
  else if (sync.health === "attention") syncLabel = "Degraded"
  else if (sync.lastSync) syncLabel = "Degraded"

  const lastSyncAt =
    sync.lastIngestionAt?.toISOString() ??
    sync.lastSuccessfulSync?.finishedAt?.toISOString() ??
    sync.lastSync?.finishedAt?.toISOString() ??
    null

  return {
    activeIncidents: metrics.openTickets,
    slaAtRisk: metrics.slaAtRisk,
    actionRequired: metrics.actionRequired,
    myOpenTickets,
    cpAgentUserId: matchedAgent?.id ?? null,
    syncLabel,
    lastSyncAt,
    slaPressure: slaPressureLevel(metrics.openTickets, metrics.slaAtRisk),
    aiEngine: "Active",
    agentName: agent?.displayName ?? "Agent",
    agentRole: agent?.role === "agent" ? "Carrefour Support" : (agent?.role ?? "Support"),
  }
}

/** Per-request cache — layout + pages share one sidebar fetch. */
export const getCachedAgentSidebarSnapshot = cache(getAgentSidebarSnapshot)
