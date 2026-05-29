export type SupportAgentSeed = {
  firstName: string
  lastName: string
  email: string
  department: string
  authRole: "Agent" | "Supervisor" | "Admin"
  cpAgentRole: "agent" | "supervisor"
  /** ISO timestamp for demo last sign-in (Europe/Paris working hours). */
  demoLastLoginAt: string
}

export const SUPPORT_AGENT_DEPARTMENT = "Carrefour Support"

/** Demo support roster — synced to `carepilot.users` (auth) and `cp_agent.users` (operations). */
export const SUPPORT_AGENTS: SupportAgentSeed[] = [
  {
    firstName: "Ikram",
    lastName: "Gafai",
    email: "ikram.gafai@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-29T13:58:00+02:00",
  },
  {
    firstName: "Thomas",
    lastName: "Mercier",
    email: "thomas.mercier@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Supervisor",
    cpAgentRole: "supervisor",
    demoLastLoginAt: "2026-05-29T07:50:00+02:00",
  },
  {
    firstName: "Élodie",
    lastName: "Petit",
    email: "elodie.petit@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Admin",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-29T10:12:00+02:00",
  },
  {
    firstName: "Sophie",
    lastName: "Laurent",
    email: "sophie.laurent@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-26T18:10:00+02:00",
  },
  {
    firstName: "Marc",
    lastName: "Dubois",
    email: "marc.dubois@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-29T11:05:00+02:00",
  },
  {
    firstName: "Claire",
    lastName: "Martin",
    email: "claire.martin@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-28T17:30:00+02:00",
  },
  {
    firstName: "Antoine",
    lastName: "Bernard",
    email: "antoine.bernard@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-29T09:42:00+02:00",
  },
  {
    firstName: "Camille",
    lastName: "Renard",
    email: "camille.renard@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-29T08:55:00+02:00",
  },
  {
    firstName: "Julien",
    lastName: "Moreau",
    email: "julien.moreau@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-28T14:20:00+02:00",
  },
  {
    firstName: "Fatima",
    lastName: "Benali",
    email: "fatima.benali@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
    demoLastLoginAt: "2026-05-27T16:45:00+02:00",
  },
]

export function supportAgentDisplayName(agent: Pick<SupportAgentSeed, "firstName" | "lastName">): string {
  return `${agent.firstName} ${agent.lastName}`
}

export function cpAgentEmailFromAuth(email: string): string {
  return email.toLowerCase().replace("@carrefour.internal", "@internal")
}

export function authEmailFromCpAgent(email: string): string {
  return email.replace("@internal", "@carrefour.internal").toLowerCase()
}

/** Resolve canonical demo last login for auth or cp_agent email variants. */
export function demoLastLoginForEmail(email: string): Date | null {
  const lower = email.toLowerCase()
  const carrefour = authEmailFromCpAgent(lower)
  const internal = cpAgentEmailFromAuth(lower)

  const agent = SUPPORT_AGENTS.find(
    (a) =>
      a.email.toLowerCase() === lower ||
      a.email.toLowerCase() === carrefour ||
      cpAgentEmailFromAuth(a.email) === internal,
  )

  return agent ? new Date(agent.demoLastLoginAt) : null
}
