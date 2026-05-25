import { eq } from "drizzle-orm"

import { buildAssigneeLookup } from "@/lib/cp-agent/assignee-link"
import type { Db } from "@/lib/db"
import { cpAgentTickets } from "@/lib/db/schema/cp-agent"
import type { CareClient } from "@/lib/integrations/care/care-client"
import { ticketToSyncRow } from "@/lib/integrations/care/normalizers"
import type { SyncCounters } from "./sync-logger"

function isNewer(careUpdated: Date, localUpdated: Date | null) {
  if (!localUpdated) return true
  return careUpdated.getTime() > localUpdated.getTime()
}

function operationalFieldsChanged(
  existing: typeof cpAgentTickets.$inferSelect,
  row: ReturnType<typeof ticketToSyncRow>,
) {
  return (
    existing.status !== row.status ||
    existing.priority !== row.priority ||
    existing.title !== row.title ||
    existing.description !== row.description ||
    existing.perimeter !== row.perimeter ||
    existing.storeId !== row.storeId ||
    existing.storeCode !== row.storeCode ||
    existing.storeName !== row.storeName ||
    existing.storeCity !== row.storeCity ||
    existing.storeRegion !== row.storeRegion ||
    existing.storeType !== row.storeType ||
    existing.category !== row.category ||
    existing.assignedGroup !== row.assignedGroup ||
    existing.assignedAgent !== row.assignedAgent
  )
}

export async function syncTicketsFromCare(
  db: Db,
  client: CareClient,
  counters: SyncCounters,
  errors: { entity: string; id: string; message: string }[],
): Promise<{
  ticketIdByExternal: Map<string, number>
  changedExternalIds: string[]
  careSourceTotal: number
}> {
  const ticketIdByExternal = new Map<string, number>()
  const changedExternalIds: string[] = []
  const now = new Date()

  let list
  try {
    list = await client.getAllTickets()
  } catch (e) {
    errors.push({
      entity: "tickets",
      id: "list",
      message: e instanceof Error ? e.message : String(e),
    })
    return { ticketIdByExternal, changedExternalIds, careSourceTotal: 0 }
  }

  const careSourceTotal = list.total
  const assignees = await buildAssigneeLookup(db)

  for (const careTicket of list.items) {
    try {
      const row = ticketToSyncRow(careTicket)
      const [byExternal] = await db
        .select()
        .from(cpAgentTickets)
        .where(eq(cpAgentTickets.externalId, row.externalId))
        .limit(1)

      let existing = byExternal
      if (!existing) {
        const [byCareId] = await db
          .select()
          .from(cpAgentTickets)
          .where(eq(cpAgentTickets.careId, row.careId))
          .limit(1)
        existing = byCareId
      }

      const assignedUserId = assignees.resolve(row.assignedAgent)

      const ticketValues = {
        externalId: row.externalId,
        careId: row.careId,
        reference: row.reference,
        title: row.title,
        description: row.description,
        perimeter: row.perimeter,
        storeId: row.storeId,
        storeCode: row.storeCode,
        storeName: row.storeName,
        storeCity: row.storeCity,
        storeRegion: row.storeRegion,
        storeType: row.storeType,
        category: row.category,
        subCategory: row.subCategory,
        status: row.status,
        priority: row.priority,
        assignedGroup: row.assignedGroup,
        assignedAgent: row.assignedAgent,
        assignedUserId,
        slaDueAt: row.slaDueAt,
        resolutionDate: row.resolutionDate,
        externalCreatedAt: row.externalCreatedAt,
        externalUpdatedAt: row.externalUpdatedAt,
        lastSyncedAt: now,
        source: row.source,
        aiRecommendedAction: null,
        aiConfidence: null,
        aiReason: null,
        aiStatus: null,
        updatedAt: now,
      }

      if (!existing) {
        const [ins] = await db
          .insert(cpAgentTickets)
          .values(ticketValues)
          .returning({ id: cpAgentTickets.id })

        if (ins) {
          ticketIdByExternal.set(row.externalId, ins.id)
          changedExternalIds.push(row.externalId)
          counters.inserted++
        }
        continue
      }

      ticketIdByExternal.set(row.externalId, existing.id)

      const storeStale =
        existing.storeName !== row.storeName ||
        existing.storeCity !== row.storeCity ||
        existing.storeRegion !== row.storeRegion ||
        existing.storeType !== row.storeType ||
        existing.storeCode !== row.storeCode ||
        existing.storeId !== row.storeId

      const contentStale =
        existing.title !== row.title ||
        existing.description !== row.description ||
        existing.assignedUserId !== assignedUserId

      if (
        !isNewer(row.externalUpdatedAt, existing.externalUpdatedAt) &&
        !operationalFieldsChanged(existing, row) &&
        existing.assignedUserId === assignedUserId
      ) {
        if (storeStale || contentStale) {
          await db
            .update(cpAgentTickets)
            .set({
              ...(storeStale
                ? {
                    storeId: row.storeId,
                    storeCode: row.storeCode,
                    storeName: row.storeName,
                    storeCity: row.storeCity,
                    storeRegion: row.storeRegion,
                    storeType: row.storeType,
                  }
                : {}),
              ...(contentStale
                ? {
                    title: row.title,
                    description: row.description,
                    assignedUserId,
                    assignedAgent: row.assignedAgent,
                    assignedGroup: row.assignedGroup,
                  }
                : {}),
              lastSyncedAt: now,
              updatedAt: now,
            })
            .where(eq(cpAgentTickets.id, existing.id))
          counters.updated++
        } else {
          counters.skipped++
        }
        continue
      }

      await db
        .update(cpAgentTickets)
        .set({
          ...ticketValues,
          externalId: existing.externalId ?? row.externalId,
        })
        .where(eq(cpAgentTickets.id, existing.id))

      changedExternalIds.push(row.externalId)
      counters.updated++
    } catch (e) {
      counters.failed++
      errors.push({
        entity: "ticket",
        id: careTicket.id,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return { ticketIdByExternal, changedExternalIds, careSourceTotal }
}
