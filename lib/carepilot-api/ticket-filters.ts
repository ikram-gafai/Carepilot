import { asc } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { cpAgentTickets, cpAgentUsers } from "@/lib/db/schema/cp-agent"

export async function getTicketFilterOptions() {
  const db = getDb()
  const [statuses, priorities, categories, agents] = await Promise.all([
    db.selectDistinct({ v: cpAgentTickets.status }).from(cpAgentTickets).orderBy(asc(cpAgentTickets.status)),
    db.selectDistinct({ v: cpAgentTickets.priority }).from(cpAgentTickets).orderBy(asc(cpAgentTickets.priority)),
    db.selectDistinct({ v: cpAgentTickets.category }).from(cpAgentTickets).orderBy(asc(cpAgentTickets.category)),
    db
      .select({ id: cpAgentUsers.id, name: cpAgentUsers.displayName })
      .from(cpAgentUsers)
      .orderBy(asc(cpAgentUsers.displayName)),
  ])

  return {
    statuses: statuses.map((x) => x.v),
    priorities: priorities.map((x) => x.v),
    categories: categories.map((x) => x.v),
    agents,
  }
}
