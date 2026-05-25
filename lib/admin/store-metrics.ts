import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm"

import { CLOSED_STATUS_SQL_LIST } from "@/lib/care-operational-actions"
import { SLA_RISK_FILTER } from "@/lib/carepilot-api/metrics"
import { getDb } from "@/lib/db"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

import { OPEN_FILTER } from "./shared"

const CARE_SOURCE = eq(cpAgentTickets.source, "CARE")
const CARE_OPEN = and(CARE_SOURCE, OPEN_FILTER, isNotNull(cpAgentTickets.storeCode))!

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
      openCount: sql<number>`count(*) FILTER (WHERE ${cpAgentTickets.source} = 'CARE' AND ${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_STATUS_SQL_LIST)}))`,
      slaRisk: sql<number>`count(*) FILTER (WHERE ${SLA_RISK_FILTER})`,
    })
    .from(cpAgentTickets)
    .where(and(CARE_SOURCE, isNotNull(cpAgentTickets.storeName))!)
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
    .where(and(CARE_SOURCE, isNotNull(cpAgentTickets.storeName))!)
    .orderBy(desc(cpAgentTickets.updatedAt))
    .limit(limit)

  return rows.map((r) => ({
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
      slaRisk: sql<number>`count(*) FILTER (WHERE ${SLA_RISK_FILTER})`,
    })
    .from(cpAgentTickets)
    .where(CARE_OPEN)
    .groupBy(cpAgentTickets.storeName, cpAgentTickets.storeCity)
    .orderBy(desc(count()))

  return grouped.map((r) => ({
    storeName: r.storeName ?? "",
    city: r.city ?? "",
    open: Number(r.open),
    slaRisk: Number(r.slaRisk),
  }))
}
