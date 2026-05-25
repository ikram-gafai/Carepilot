import { asc, count, desc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import {
  careSourceTickets,
  kmProcedures,
  stores,
  ticketActions,
  ticketComments,
} from "@/lib/db/schema/care-source"

import {
  mapCareSourceAction,
  mapCareSourceComment,
  mapCareSourceKm,
  mapCareSourceTicket,
} from "./mappers"

const DEFAULT_PAGE_SIZE = Number(process.env.CARE_API_LIST_LIMIT ?? "100")

function carePageSize(limit?: number) {
  if (limit != null && limit > 0) return Math.min(limit, 500)
  const env = DEFAULT_PAGE_SIZE
  if (env <= 0) return 500
  return Math.max(1, Math.min(env, 500))
}

export async function careListTickets(opts?: {
  limit?: number
  offset?: number
  /** @deprecated Ignored — all CARE source tickets are always returned. */
  syncWindow?: "initial" | "full"
}) {
  const db = getDb()
  const limit = carePageSize(opts?.limit)
  const offset = Math.max(0, opts?.offset ?? 0)

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(careSourceTickets),
    db
      .select({ ticket: careSourceTickets, store: stores })
      .from(careSourceTickets)
      .innerJoin(stores, eq(careSourceTickets.storeId, stores.id))
      .orderBy(desc(careSourceTickets.updatedAt))
      .limit(limit)
      .offset(offset),
  ])

  const items = rows.map(({ ticket, store }) => mapCareSourceTicket(ticket, store))
  const total = Number(totalRow?.total ?? items.length)
  return { items, total }
}

export async function careGetTicketById(careTicketId: string) {
  const db = getDb()
  const [row] = await db
    .select({ ticket: careSourceTickets, store: stores })
    .from(careSourceTickets)
    .innerJoin(stores, eq(careSourceTickets.storeId, stores.id))
    .where(eq(careSourceTickets.careTicketId, careTicketId))
    .limit(1)

  return row ? mapCareSourceTicket(row.ticket, row.store) : null
}

export async function careGetTicketHistory(careTicketId: string) {
  const db = getDb()
  const [ticket] = await db
    .select({ id: careSourceTickets.id })
    .from(careSourceTickets)
    .where(eq(careSourceTickets.careTicketId, careTicketId))
    .limit(1)

  if (!ticket) return { items: [], total: 0 }

  const rows = await db
    .select()
    .from(ticketActions)
    .where(eq(ticketActions.ticketId, ticket.id))
    .orderBy(asc(ticketActions.createdAt))

  const items = rows.map((r) => mapCareSourceAction(careTicketId, r))
  return { items, total: items.length }
}

export async function careGetTicketComments(careTicketId: string) {
  const db = getDb()
  const [ticket] = await db
    .select({ id: careSourceTickets.id })
    .from(careSourceTickets)
    .where(eq(careSourceTickets.careTicketId, careTicketId))
    .limit(1)

  if (!ticket) return { items: [], total: 0 }

  const rows = await db
    .select()
    .from(ticketComments)
    .where(eq(ticketComments.ticketId, ticket.id))
    .orderBy(asc(ticketComments.createdAt))

  const items = rows.map((r, i) => mapCareSourceComment(careTicketId, r, i))
  return { items, total: items.length }
}

export async function careListKm() {
  const db = getDb()
  const rows = await db.select().from(kmProcedures).orderBy(kmProcedures.kmCode)
  const items = rows.map(mapCareSourceKm)
  return { items, total: items.length }
}

export async function careGetKmById(kmId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(kmProcedures)
    .where(eq(kmProcedures.kmCode, kmId))
    .limit(1)

  return row ? mapCareSourceKm(row) : null
}

export async function careListStores() {
  const db = getDb()
  const rows = await db.select().from(stores).orderBy(stores.storeName)
  return { items: rows, total: rows.length }
}
