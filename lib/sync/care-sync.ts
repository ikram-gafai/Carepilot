import { eq, gt, isNull, or } from "drizzle-orm"

import type { Db } from "@/lib/db"
import {
  careSourceTickets,
  ticketActions,
  ticketComments,
} from "@/lib/db/schema/care-source"
import { carepilotTickets, syncLogs } from "@/lib/db/schema/carepilot"
import { appendTimelineEvent } from "@/lib/pipeline/timeline"
import { runAiPipelineForTicket } from "@/lib/pipeline/processTicket"
import { ensureKmEmbeddings } from "@/lib/sync/embed-km-catalog"

async function buildRawText(
  db: Db,
  src: typeof careSourceTickets.$inferSelect,
): Promise<string> {
  const comments = await db
    .select()
    .from(ticketComments)
    .where(eq(ticketComments.ticketId, src.id))
    .orderBy(ticketComments.createdAt)

  const actions = await db
    .select()
    .from(ticketActions)
    .where(eq(ticketActions.ticketId, src.id))
    .orderBy(ticketActions.createdAt)

  const cBlock =
    comments.length > 0
      ? comments.map((c) => `- [${c.authorRole}] ${c.content}`).join("\n")
      : "(no comments)"

  const aBlock =
    actions.length > 0
      ? actions.map((a) => `- ${a.actionType}: ${a.description} (${a.result ?? "—"})`).join("\n")
      : "(no actions)"

  return [
    `TITLE: ${src.title}`,
    `DESCRIPTION:\n${src.description}`,
    `STORE_CODE: ${src.storeCode ?? ""}`,
    `REGISTER_CODE: ${src.cashRegisterCode ?? ""}`,
    `PERIMETER: ${src.perimeter}`,
    `CATEGORY: ${src.category ?? ""}`,
    `ERROR: ${src.errorMessage ?? ""}`,
    `CHANNEL: ${src.channel}`,
    `COMMENTS:\n${cBlock}`,
    `ACTIONS:\n${aBlock}`,
  ].join("\n\n")
}

export async function runCareSync(db: Db) {
  const started = new Date()
  const insertedLog = await db
    .insert(syncLogs)
    .values({
      syncStartedAt: started,
      status: "running",
      ticketsImported: 0,
      ticketsUpdated: 0,
    })
    .returning({ id: syncLogs.id })

  const logId = insertedLog[0]?.id
  if (!logId) {
    throw new Error("Could not create sync_logs row")
  }

  let imported = 0
  let updated = 0

  try {
    await ensureKmEmbeddings(db)

    type PendingRow = { sourceId: number; cpId: number | null }

    const pending = (await db
      .select({
        sourceId: careSourceTickets.id,
        cpId: carepilotTickets.id,
      })
      .from(careSourceTickets)
      .leftJoin(carepilotTickets, eq(carepilotTickets.sourceTicketId, careSourceTickets.id))
      .where(
        or(
          isNull(carepilotTickets.id),
          gt(careSourceTickets.updatedAt, carepilotTickets.updatedAt),
        ),
      )) as PendingRow[]

    const batchLimit = Number(process.env.CARE_SYNC_BATCH_LIMIT ?? "80")
    const batch = pending.slice(0, Math.max(1, batchLimit))

    for (const row of batch) {
      const srcRows = await db
        .select()
        .from(careSourceTickets)
        .where(eq(careSourceTickets.id, row.sourceId))
        .limit(1)

      const src = srcRows[0]
      if (!src) continue

      const rawText = await buildRawText(db, src)

      let cpTicketId: number

      if (row.cpId) {
        cpTicketId = row.cpId
        await db
          .update(carepilotTickets)
          .set({
            rawText,
            perimeter: src.perimeter,
            status: src.status,
            priority: src.priority,
            storeCode: src.storeCode,
            cashRegisterCode: src.cashRegisterCode,
            category: src.category,
            errorMessage: src.errorMessage,
            updatedAt: src.updatedAt,
            createdAt: src.createdAt,
            lastSyncedAt: new Date(),
          })
          .where(eq(carepilotTickets.id, cpTicketId))

        updated++

        await appendTimelineEvent(db, {
          ticketId: cpTicketId,
          eventType: "sync_update",
          summary: "Ticket updated from CARE Simulator",
          occurredAt: new Date(),
        })
      } else {
        const ins = await db
          .insert(carepilotTickets)
          .values({
            sourceTicketId: src.id,
            rawText,
            summary: null,
            perimeter: src.perimeter,
            status: src.status,
            priority: src.priority,
            storeCode: src.storeCode,
            cashRegisterCode: src.cashRegisterCode,
            category: src.category,
            errorMessage: src.errorMessage,
            createdAt: src.createdAt,
            updatedAt: src.updatedAt,
            lastSyncedAt: new Date(),
          })
          .returning({ id: carepilotTickets.id })

        cpTicketId = ins[0]!.id
        imported++

        await appendTimelineEvent(db, {
          ticketId: cpTicketId,
          eventType: "ticket_created",
          summary: "Ticket created (CARE Simulator import)",
          occurredAt: src.createdAt,
        })

        await appendTimelineEvent(db, {
          ticketId: cpTicketId,
          eventType: "sync_import",
          summary: "Initial CARE Simulator → CAREPILOT sync",
          occurredAt: new Date(),
        })
      }

      await runAiPipelineForTicket(db, cpTicketId)
    }

    await db
      .update(syncLogs)
      .set({
        syncFinishedAt: new Date(),
        ticketsImported: imported,
        ticketsUpdated: updated,
        status: "success",
        errorMessage: null,
      })
      .where(eq(syncLogs.id, logId))

    return {
      ok: true as const,
      imported,
      updated,
      syncLogId: logId,
      pendingRemaining: Math.max(0, pending.length - batch.length),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await db
      .update(syncLogs)
      .set({
        syncFinishedAt: new Date(),
        ticketsImported: imported,
        ticketsUpdated: updated,
        status: "error",
        errorMessage: msg,
      })
      .where(eq(syncLogs.id, logId))

    return {
      ok: false as const,
      imported,
      updated,
      error: msg,
      pendingRemaining: null as number | null,
    }
  }
}
