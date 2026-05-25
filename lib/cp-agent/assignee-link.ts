import { eq } from "drizzle-orm"

import {
  authEmailFromCpAgent,
  cpAgentEmailFromAuth,
  SUPPORT_AGENTS,
} from "@/lib/data/support-agents"
import type { Db } from "@/lib/db"
import { cpAgentTickets, cpAgentUsers } from "@/lib/db/schema/cp-agent"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** In-memory lookup: CARE `assigned_agent` email → `cp_agent.users.id`. */
export async function buildAssigneeLookup(db: Db) {
  const users = await db.select().from(cpAgentUsers)
  const byEmail = new Map<string, number>()

  for (const user of users) {
    const raw = normalizeEmail(user.email)
    byEmail.set(raw, user.id)
    byEmail.set(normalizeEmail(authEmailFromCpAgent(raw)), user.id)
    byEmail.set(normalizeEmail(cpAgentEmailFromAuth(raw)), user.id)
  }

  for (const agent of SUPPORT_AGENTS) {
    const carrefour = normalizeEmail(agent.email)
    const internal = normalizeEmail(cpAgentEmailFromAuth(carrefour))
    const id = byEmail.get(internal) ?? byEmail.get(carrefour)
    if (id != null) {
      byEmail.set(carrefour, id)
      byEmail.set(internal, id)
    }
  }

  function resolveLegacyAgentEmail(email: string): number | null {
    const match = /^agent\.(\d+)@/.exec(email)
    if (!match) return null
    const idx = (Number(match[1]) - 1) % SUPPORT_AGENTS.length
    const seedEmail = normalizeEmail(SUPPORT_AGENTS[idx]!.email)
    return byEmail.get(seedEmail) ?? null
  }

  return {
    resolve(assignedAgent: string | null | undefined): number | null {
      if (!assignedAgent?.trim()) return null
      const key = normalizeEmail(assignedAgent)
      return byEmail.get(key) ?? resolveLegacyAgentEmail(key)
    },
  }
}

/** Backfill `assigned_user_id` from `assigned_agent` for all CARE tickets. */
export async function linkAllTicketAssignees(db: Db): Promise<number> {
  const lookup = await buildAssigneeLookup(db)
  const rows = await db
    .select({
      id: cpAgentTickets.id,
      assignedAgent: cpAgentTickets.assignedAgent,
      assignedUserId: cpAgentTickets.assignedUserId,
    })
    .from(cpAgentTickets)
    .where(eq(cpAgentTickets.source, "CARE"))

  let linked = 0
  for (const row of rows) {
    const userId = lookup.resolve(row.assignedAgent)
    if (userId == null || row.assignedUserId === userId) continue
    await db
      .update(cpAgentTickets)
      .set({ assignedUserId: userId, updatedAt: new Date() })
      .where(eq(cpAgentTickets.id, row.id))
    linked++
  }
  return linked
}
