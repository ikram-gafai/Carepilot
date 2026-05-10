import { desc, eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { ticketTimelineEvents } from "@/lib/db/schema/carepilot"

export async function appendTimelineEvent(
  db: Db,
  input: {
    ticketId: number
    eventType: string
    summary: string
    detail?: string | null
    metadata?: Record<string, unknown>
    occurredAt?: Date
  },
) {
  await db.insert(ticketTimelineEvents).values({
    ticketId: input.ticketId,
    eventType: input.eventType,
    summary: input.summary,
    detail: input.detail ?? null,
    metadata: input.metadata ?? {},
    occurredAt: input.occurredAt ?? new Date(),
  })
}

export async function listTimeline(db: Db, ticketId: number) {
  return db
    .select()
    .from(ticketTimelineEvents)
    .where(eq(ticketTimelineEvents.ticketId, ticketId))
    .orderBy(desc(ticketTimelineEvents.occurredAt))
}
