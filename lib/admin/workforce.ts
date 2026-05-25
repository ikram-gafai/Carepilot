import { SUPPORT_AGENT_DEPARTMENT } from "@/lib/data/support-agents"
import { normalizeAgentEmail } from "@/lib/cp-agent/user-match"
import { getDb } from "@/lib/db"
import { cpAgentTickets, cpAgentUsers } from "@/lib/db/schema/cp-agent"
import { carepilotUsers } from "@/lib/db/schema/carepilot"

import { OPEN_FILTER } from "./shared"

export type SupportAgentRow = {
  id: number
  name: string
  email: string
  department: string
  status: string
  lastSignIn: Date | null
}

export async function adminWorkforceSupervision() {
  const db = getDb()

  const [roster, openTickets, careProfiles] = await Promise.all([
    db.select().from(cpAgentUsers).orderBy(cpAgentUsers.displayName),
    db.select({ ticket: cpAgentTickets }).from(cpAgentTickets).where(OPEN_FILTER),
    db.select().from(carepilotUsers).orderBy(carepilotUsers.lastName, carepilotUsers.firstName),
  ])

  const profileByEmail = new Map(
    careProfiles.map((u) => [u.email.toLowerCase(), u]),
  )

  let totalOpen = 0
  const workloadByAgent: { name: string; value: number }[] = []

  for (const agent of roster) {
    const open = openTickets.filter((t) => t.ticket.assignedUserId === agent.id).length
    totalOpen += open
    workloadByAgent.push({
      name: agent.displayName.split(/\s+/)[0] ?? agent.displayName,
      value: open,
    })
  }

  const supportAgents: SupportAgentRow[] = roster.map((agent) => {
    const profile =
      profileByEmail.get(agent.email.toLowerCase()) ??
      profileByEmail.get(normalizeAgentEmail(agent.email))

    return {
      id: agent.id,
      name: agent.displayName,
      email: profile?.email ?? agent.email,
      department: profile?.department ?? SUPPORT_AGENT_DEPARTMENT,
      status: profile?.status ?? "active",
      lastSignIn: profile?.lastLoginAt ?? null,
    }
  })

  const activeAgents = supportAgents.filter((a) => a.status === "active").length

  return {
    activeAgents,
    openAssignments: totalOpen,
    workloadByAgent,
    supportAgents,
  }
}

/** @deprecated Use adminWorkforceSupervision */
export const adminUsers = adminWorkforceSupervision
