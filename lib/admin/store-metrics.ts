import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm"

import { CLOSED_STATUS_SQL_LIST } from "@/lib/care-operational-actions"
import { SLA_PREDICTION_ENABLED } from "@/lib/ai-phase"
import { SLA_RISK_FILTER } from "@/lib/carepilot-api/metrics"
import { getDb } from "@/lib/db"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

import { OPERATIONAL_OPEN_SCOPE, OPERATIONAL_TICKET_SCOPE } from "./shared"

export type TopMagasinRow = {
  storeCode: string
  storeName: string
  city: string
  region: string
  storeType: string
  ticketCount: number
  openCount: number
  slaRisk: number
  pressureScore: number
}

export type RecentSynchronizedTicketRow = {
  id: number
  careId: string
  title: string
  status: string
  priority: string
  category: string
  storeName: string
  storeCity: string
  updatedAt: Date
}

/** Top Magasins — synchronized ticket volume and SLA exposure by store. */
export async function adminTopMagasins(limit = 8): Promise<TopMagasinRow[]> {
  const db = getDb()

  const grouped = await db
    .select({
      storeCode: cpAgentTickets.storeCode,
      storeName: cpAgentTickets.storeName,
      city: cpAgentTickets.storeCity,
      region: cpAgentTickets.storeRegion,
      storeType: cpAgentTickets.storeType,
      ticketCount: count(),
      openCount: sql<number>`count(*) FILTER (WHERE ${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_STATUS_SQL_LIST)}))`,
      slaRisk: SLA_PREDICTION_ENABLED
        ? sql<number>`count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM cp_agent.ai_sla_predictions sp
            WHERE sp.ticket_id = ${cpAgentTickets.id}
            AND (sp.predicted_sla_breach = true OR sp.risk_level = 'HIGH')
          ))`
        : sql<number>`count(*) FILTER (WHERE ${SLA_RISK_FILTER})`,
    })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, isNotNull(cpAgentTickets.storeName))!)
    .groupBy(
      cpAgentTickets.storeCode,
      cpAgentTickets.storeName,
      cpAgentTickets.storeCity,
      cpAgentTickets.storeRegion,
      cpAgentTickets.storeType,
    )
    .orderBy(desc(sql`count(*)`))
    .limit(limit)

  return grouped.map((r) => {
    const openCount = Number(r.openCount)
    const slaRisk = Number(r.slaRisk)
    const ticketCount = Number(r.ticketCount)
    return {
      storeCode: r.storeCode ?? "",
      storeName: r.storeName ?? "",
      city: r.city ?? "",
      region: r.region ?? "",
      storeType: r.storeType ?? "",
      ticketCount,
      openCount,
      slaRisk,
      pressureScore: openCount + slaRisk * 2,
    }
  })
}

export async function adminRecentSynchronizedTickets(
  limit = 10,
): Promise<RecentSynchronizedTicketRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: cpAgentTickets.id,
      careId: cpAgentTickets.careId,
      title: cpAgentTickets.title,
      status: cpAgentTickets.status,
      priority: cpAgentTickets.priority,
      category: cpAgentTickets.category,
      storeName: cpAgentTickets.storeName,
      storeCity: cpAgentTickets.storeCity,
      updatedAt: cpAgentTickets.updatedAt,
    })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_TICKET_SCOPE, isNotNull(cpAgentTickets.storeName))!)
    .orderBy(desc(cpAgentTickets.updatedAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    careId: r.careId,
    title: r.title,
    status: r.status,
    priority: r.priority,
    category: r.category,
    storeName: r.storeName ?? "",
    storeCity: r.storeCity ?? "",
    updatedAt: r.updatedAt,
  }))
}

/** Store-level open workload for risk detection. */
export async function adminStoreOpenWorkload(): Promise<
  { storeName: string; city: string; open: number; slaRisk: number }[]
> {
  const db = getDb()
  const grouped = await db
    .select({
      storeName: cpAgentTickets.storeName,
      city: cpAgentTickets.storeCity,
      open: count(),
      slaRisk: SLA_PREDICTION_ENABLED
        ? sql<number>`count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM cp_agent.ai_sla_predictions sp
            WHERE sp.ticket_id = ${cpAgentTickets.id}
            AND (sp.predicted_sla_breach = true OR sp.risk_level = 'HIGH')
          ))`
        : sql<number>`count(*) FILTER (WHERE ${SLA_RISK_FILTER})`,
    })
    .from(cpAgentTickets)
    .where(and(OPERATIONAL_OPEN_SCOPE, isNotNull(cpAgentTickets.storeCode))!)
    .groupBy(cpAgentTickets.storeName, cpAgentTickets.storeCity)
    .orderBy(desc(count()))

  return grouped.map((r) => ({
    storeName: r.storeName ?? "",
    city: r.city ?? "",
    open: Number(r.open),
    slaRisk: Number(r.slaRisk),
  }))
}
