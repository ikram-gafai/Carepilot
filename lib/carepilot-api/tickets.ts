import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNotNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm"

import { CLOSED_STATUS_SQL_LIST } from "@/lib/care-operational-actions"
import { englishLegacyCopy } from "@/lib/cp-agent-legacy-copy-en"
import { getDb } from "@/lib/db"
import {
  cpAgentAiAnalyses,
  cpAgentAiFeedback,
  cpAgentKmSuggestions,
  cpAgentTicketComments,
  cpAgentTicketHistory,
  cpAgentTickets,
  cpAgentUsers,
} from "@/lib/db/schema/cp-agent"

const CLOSED_SQL = CLOSED_STATUS_SQL_LIST

export type TicketListFilters = {
  q?: string
  status?: string
  priority?: string
  category?: string
  assignedUserId?: string
  slaState?: "all" | "breached" | "at_risk" | "ok"
}

export async function listSynchronizedTickets(filters: TicketListFilters = {}) {
  const db = getDb()
  const nowDate = new Date()
  const soonDate = new Date(nowDate.getTime() + 8 * 3600 * 1000)
  const clauses = [] as ReturnType<typeof and>[]

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`
    clauses.push(
      or(
        ilike(cpAgentTickets.title, q),
        ilike(cpAgentTickets.description, q),
        ilike(cpAgentTickets.careId, q),
        ilike(cpAgentTickets.storeCode, q),
      )!,
    )
  }
  if (filters.status && filters.status !== "all") {
    clauses.push(eq(cpAgentTickets.status, filters.status))
  }
  if (filters.priority && filters.priority !== "all") {
    clauses.push(eq(cpAgentTickets.priority, filters.priority))
  }
  if (filters.category && filters.category !== "all") {
    clauses.push(eq(cpAgentTickets.category, filters.category))
  }
  if (filters.assignedUserId && filters.assignedUserId !== "all") {
    clauses.push(eq(cpAgentTickets.assignedUserId, Number(filters.assignedUserId)))
  }
  if (filters.slaState && filters.slaState !== "all") {
    if (filters.slaState === "breached") {
      clauses.push(
        and(
          isNotNull(cpAgentTickets.slaDueAt),
          lt(cpAgentTickets.slaDueAt, nowDate),
          sql`${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_SQL)})`,
        )!,
      )
    } else if (filters.slaState === "at_risk") {
      clauses.push(
        and(
          isNotNull(cpAgentTickets.slaDueAt),
          gte(cpAgentTickets.slaDueAt, nowDate),
          lte(cpAgentTickets.slaDueAt, soonDate),
          sql`${cpAgentTickets.status} NOT IN (${sql.raw(CLOSED_SQL)})`,
        )!,
      )
    } else if (filters.slaState === "ok") {
      clauses.push(
        or(
          sql`${cpAgentTickets.status} IN (${sql.raw(CLOSED_SQL)})`,
          sql`${cpAgentTickets.slaDueAt} IS NULL`,
          gt(cpAgentTickets.slaDueAt, soonDate),
        )!,
      )
    }
  }

  const where = clauses.length ? and(...clauses) : undefined

  const careOnly = eq(cpAgentTickets.source, "CARE")
  const whereClause = where ? and(careOnly, where) : careOnly

  const rows = await db
    .select({
      ticket: cpAgentTickets,
      assigneeName: cpAgentUsers.displayName,
    })
    .from(cpAgentTickets)
    .leftJoin(cpAgentUsers, eq(cpAgentTickets.assignedUserId, cpAgentUsers.id))
    .where(whereClause)
    .orderBy(desc(cpAgentTickets.updatedAt))

  return {
    items: rows.map((r) => ({
      ...r.ticket,
      title: englishLegacyCopy(r.ticket.title),
      description: englishLegacyCopy(r.ticket.description),
      assigneeName: r.assigneeName,
    })),
    total: rows.length,
  }
}

export async function getSynchronizedTicket(id: number) {
  const db = getDb()
  const [row] = await db
    .select({
      ticket: cpAgentTickets,
      assigneeName: cpAgentUsers.displayName,
      assigneeEmail: cpAgentUsers.email,
    })
    .from(cpAgentTickets)
    .leftJoin(cpAgentUsers, eq(cpAgentTickets.assignedUserId, cpAgentUsers.id))
    .where(eq(cpAgentTickets.id, id))
    .limit(1)

  if (!row) return null

  return {
    ...row.ticket,
    title: englishLegacyCopy(row.ticket.title),
    description: englishLegacyCopy(row.ticket.description),
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
  }
}

export async function getSynchronizedTicketHistory(ticketId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(cpAgentTicketHistory)
    .where(eq(cpAgentTicketHistory.ticketId, ticketId))
    .orderBy(desc(cpAgentTicketHistory.occurredAt))

  return { items: rows, total: rows.length }
}

export async function getSynchronizedTicketComments(ticketId: number) {
  const db = getDb()
  const rows = await db
    .select()
    .from(cpAgentTicketComments)
    .where(eq(cpAgentTicketComments.ticketId, ticketId))
    .orderBy(asc(cpAgentTicketComments.createdAt))

  return { items: rows, total: rows.length }
}
