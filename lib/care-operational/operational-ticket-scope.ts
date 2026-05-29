/**
 * Agent operational UI scope — synchronized CARE tickets only (no PFE demo scenarios).
 * Demo IDs (CARE-DEMO-*) remain in DB for benchmarks, notebooks, and seed validation.
 */

import { and, eq, sql, type SQL } from "drizzle-orm"

import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

export const DEMO_CARE_ID_PREFIX = "CARE-DEMO-"

export function isDemoCareTicketId(careId: string | null | undefined): boolean {
  if (!careId?.trim()) return false
  return careId.trim().toUpperCase().startsWith(DEMO_CARE_ID_PREFIX)
}

export function isOperationalCareTicketId(careId: string | null | undefined): boolean {
  if (!careId?.trim()) return false
  return !isDemoCareTicketId(careId)
}

/** SQL fragment: exclude demo scenario care IDs. */
export const excludeDemoCareTicketsSql = sql`${cpAgentTickets.careId} NOT ILIKE 'CARE-DEMO-%'`

/** Synchronized CARE tickets visible in agent operational UI. */
export function operationalCareTicketScope(...extra: (SQL | undefined)[]): SQL | undefined {
  return and(eq(cpAgentTickets.source, "CARE"), excludeDemoCareTicketsSql, ...extra.filter(Boolean))
}

export function operationalOpenCareTicketScope(
  closedStatusSqlList: string,
  ...extra: (SQL | undefined)[]
): SQL | undefined {
  return operationalCareTicketScope(
    sql`${cpAgentTickets.status} NOT IN (${sql.raw(closedStatusSqlList)})`,
    ...extra,
  )
}
