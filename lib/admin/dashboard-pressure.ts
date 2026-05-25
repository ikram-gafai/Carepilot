import { and, count, desc, eq, gt, inArray, isNotNull, lt, lte } from "drizzle-orm"

import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import { TRANSFER_TICKET_STATUSES } from "@/lib/care-operational-actions"
import { getDb } from "@/lib/db"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"

import { hoursAgo, OPEN_FILTER } from "./shared"

export async function adminOperationalPressure() {
  const db = getDb()
  const now = new Date()
  const soon = new Date(now.getTime() + 8 * 3600 * 1000)

  const byCategory = await db
    .select({ category: cpAgentTickets.category, c: count() })
    .from(cpAgentTickets)
    .where(OPEN_FILTER)
    .groupBy(cpAgentTickets.category)
    .orderBy(desc(count()))

  const byStore = await db
    .select({ store: cpAgentTickets.storeCode, c: count() })
    .from(cpAgentTickets)
    .where(and(OPEN_FILTER, isNotNull(cpAgentTickets.storeCode))!)
    .groupBy(cpAgentTickets.storeCode)
    .orderBy(desc(count()))
    .limit(5)

  const [escalated] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(eq(cpAgentTickets.status, "ESCALATED_N3"))

  const [transfers] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(inArray(cpAgentTickets.status, [...TRANSFER_TICKET_STATUSES]))

  const aging24 = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(and(OPEN_FILTER, lt(cpAgentTickets.createdAt, hoursAgo(24)))!)

  const aging48 = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(and(OPEN_FILTER, lt(cpAgentTickets.createdAt, hoursAgo(48)))!)

  const [slaRisk] = await db
    .select({ c: count() })
    .from(cpAgentTickets)
    .where(
      and(
        OPEN_FILTER,
        isNotNull(cpAgentTickets.slaDueAt),
        lte(cpAgentTickets.slaDueAt, soon),
        gt(cpAgentTickets.slaDueAt, now),
      )!,
    )

  return {
    overloadedCategories: byCategory.slice(0, 4).map((r) => ({
      label: cpAgentCategoryLabel(r.category),
      count: Number(r.c),
    })),
    busiestStores: byStore.map((r) => ({
      store: r.store ?? "—",
      count: Number(r.c),
    })),
    escalationSpike: Number(escalated?.c ?? 0),
    transferSpike: Number(transfers?.c ?? 0),
    agingQueues: {
      over24h: Number(aging24[0]?.c ?? 0),
      over48h: Number(aging48[0]?.c ?? 0),
      slaAtRisk: Number(slaRisk?.c ?? 0),
    },
  }
}
