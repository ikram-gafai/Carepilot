import { eq } from "drizzle-orm"

import type { Db } from "@/lib/db"
import { cpAgentKmReferences } from "@/lib/db/schema/cp-agent"
import type { CareClient } from "@/lib/integrations/care/care-client"
import { kmToSyncRow } from "@/lib/integrations/care/normalizers"
import type { SyncCounters } from "./sync-logger"

function isNewer(careUpdated: Date, localUpdated: Date | null) {
  if (!localUpdated) return true
  return careUpdated.getTime() > localUpdated.getTime()
}

export async function syncKmFromCare(
  db: Db,
  client: CareClient,
  counters: SyncCounters,
  errors: { entity: string; id: string; message: string }[],
) {
  const now = new Date()
  let list
  try {
    list = await client.getKmList()
  } catch (e) {
    errors.push({
      entity: "km",
      id: "list",
      message: e instanceof Error ? e.message : String(e),
    })
    counters.failed++
    return
  }

  for (const km of list.items) {
    try {
      const row = kmToSyncRow(km)
      const [existing] = await db
        .select({ id: cpAgentKmReferences.id, externalUpdatedAt: cpAgentKmReferences.externalUpdatedAt })
        .from(cpAgentKmReferences)
        .where(eq(cpAgentKmReferences.externalId, row.externalId))
        .limit(1)

      if (!existing) {
        await db.insert(cpAgentKmReferences).values({
          ...row,
          lastSyncedAt: now,
          updatedAt: now,
        })
        counters.inserted++
        continue
      }

      if (!isNewer(row.externalUpdatedAt, existing.externalUpdatedAt)) {
        counters.skipped++
        continue
      }

      await db
        .update(cpAgentKmReferences)
        .set({ ...row, lastSyncedAt: now, updatedAt: now })
        .where(eq(cpAgentKmReferences.id, existing.id))
      counters.updated++
    } catch (e) {
      counters.failed++
      errors.push({
        entity: "km",
        id: km.id,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }
}
