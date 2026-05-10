import { desc, eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { careSourceTickets } from "@/lib/db/schema/care-source"
import { carepilotTickets } from "@/lib/db/schema/carepilot"

export async function listRecentTickets(db: Db, limit = 120) {
  return db
    .select({
      id: carepilotTickets.id,
      careTicketId: careSourceTickets.careTicketId,
      title: careSourceTickets.title,
      status: carepilotTickets.status,
      priority: carepilotTickets.priority,
      perimeter: carepilotTickets.perimeter,
      updatedAt: carepilotTickets.updatedAt,
    })
    .from(carepilotTickets)
    .innerJoin(careSourceTickets, eq(carepilotTickets.sourceTicketId, careSourceTickets.id))
    .orderBy(desc(carepilotTickets.updatedAt))
    .limit(limit)
}
