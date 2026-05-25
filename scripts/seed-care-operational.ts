import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import {
  buildOperationalTicketSeeds,
  CARREFOUR_OPERATIONAL_STORES,
  OPERATIONAL_KM_SEED,
} from "@/lib/care-operational/seed-data"
import { getDb, getSql } from "@/lib/db"
import {
  careSourceTickets,
  kmProcedures,
  stores,
  ticketActions,
  ticketComments,
} from "@/lib/db/schema/care-source"

async function main() {
  const sql = getSql()
  const db = getDb()

  const patch = readFileSync(
    join(process.cwd(), "sql", "patches", "010_stores_operational.sql"),
    "utf8",
  )
  await sql.unsafe(patch)

  await sql`TRUNCATE care_source.ticket_actions, care_source.ticket_comments, care_source.tickets, care_source.km_procedures, care_source.cash_registers, care_source.stores RESTART IDENTITY CASCADE`

  const storeRows = await db
    .insert(stores)
    .values(
      CARREFOUR_OPERATIONAL_STORES.map((s) => ({
        storeCode: s.storeCode,
        storeName: s.storeName,
        city: s.city,
        region: s.region,
        storeType: s.storeType,
      })),
    )
    .returning({
      id: stores.id,
      storeCode: stores.storeCode,
    })

  const storeIdByCode = new Map(storeRows.map((r) => [r.storeCode, r.id]))

  for (const km of OPERATIONAL_KM_SEED) {
    await db.insert(kmProcedures).values({
      kmCode: km.kmCode,
      title: km.title,
      perimeter: km.perimeter,
      category: km.category,
      content: km.content,
      steps: km.content,
      prerequisites: "Store context confirmed",
      tags: km.tags,
    })
  }

  const seeds = buildOperationalTicketSeeds()
  const now = Date.now()

  for (let idx = 0; idx < seeds.length; idx++) {
    const t = seeds[idx]!
    const storeId = storeIdByCode.get(t.storeCode)
    if (storeId == null) {
      throw new Error(`Store not found for ticket seed: ${t.storeCode}`)
    }

    const created = new Date(now - (70 - Number(t.careTicketId.slice(-5))) * 3600_000)
    const updated = new Date(created.getTime() + 1800_000)
    const slaDue = new Date(now + t.slaHoursFromNow * 3600_000)

    const [row] = await db
      .insert(careSourceTickets)
      .values({
        careTicketId: t.careTicketId,
        reference: t.reference,
        title: t.title,
        description: t.description,
        perimeter: t.perimeter,
        status: t.status,
        priority: t.priority,
        category: t.category,
        subCategory: t.subCategory,
        storeId,
        storeCode: t.storeCode,
        assignedGroup: t.assignedGroup,
        assignedAgent: t.assignedAgent,
        syncBatch: t.syncBatch,
        escalationRequired: t.escalationRequired,
        transferRequired: t.transferRequired,
        targetPerimeter: t.targetPerimeter,
        kmApplicable: t.kmApplicable,
        aiRecommendedAction: t.aiRecommendedAction,
        aiConfidence: t.aiConfidence,
        aiReason: t.aiReason,
        aiStatus: "active",
        createdAt: created,
        updatedAt: updated,
        slaDueAt: slaDue,
        closedAt: t.status === "RESOLVED" ? updated : null,
      })
      .returning({ id: careSourceTickets.id })

    const ticketId = row!.id

    await db.insert(ticketActions).values([
      {
        ticketId,
        actionType: "CREATED",
        description: "Ticket opened in CARE source",
        result: "OPEN",
        performedBy: "CARE_SYSTEM",
        createdAt: created,
      },
      {
        ticketId,
        actionType: "UPDATED",
        description: `Status set to ${t.status.replace(/_/g, " ")} — ${t.title}`,
        result: t.status,
        performedBy: t.assignedAgent ?? "CARE_SYSTEM",
        createdAt: updated,
      },
    ])

    if (idx % 3 !== 0) {
      await db.insert(ticketComments).values({
        ticketId,
        authorRole: "N1_AGENT",
        content: `N1 update: ${t.title}. ${t.description.slice(0, 220)}${t.description.length > 220 ? "…" : ""}`,
        createdAt: new Date(updated.getTime() + 600_000),
      })
    }
  }

  await sql`
    TRUNCATE cp_agent.audit_logs, cp_agent.sync_logs, cp_agent.tickets RESTART IDENTITY CASCADE
  `

  console.log(
    `CARE France seeded: ${CARREFOUR_OPERATIONAL_STORES.length} stores, ${seeds.length} tickets (France only).`,
  )
  console.log("Cleared cp_agent tickets — run: bun run db:sync")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
