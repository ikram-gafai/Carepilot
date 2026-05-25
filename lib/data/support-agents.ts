export type SupportAgentSeed = {
  firstName: string
  lastName: string
  email: string
  department: string
  authRole: "Agent" | "Supervisor" | "Admin"
  cpAgentRole: "agent" | "supervisor"
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
  },
  {
    firstName: "Thomas",
    lastName: "Mercier",
    email: "thomas.mercier@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Supervisor",
    cpAgentRole: "supervisor",
  },
  {
    firstName: "Élodie",
    lastName: "Petit",
    email: "elodie.petit@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Admin",
    cpAgentRole: "agent",
  },
  {
    firstName: "Sophie",
    lastName: "Laurent",
    email: "sophie.laurent@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
  },
  {
    firstName: "Marc",
    lastName: "Dubois",
    email: "marc.dubois@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
  },
  {
    firstName: "Claire",
    lastName: "Martin",
    email: "claire.martin@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
  },
  {
    firstName: "Antoine",
    lastName: "Bernard",
    email: "antoine.bernard@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
  },
  {
    firstName: "Camille",
    lastName: "Renard",
    email: "camille.renard@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
  },
  {
    firstName: "Julien",
    lastName: "Moreau",
    email: "julien.moreau@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
  },
  {
    firstName: "Fatima",
    lastName: "Benali",
    email: "fatima.benali@carrefour.internal",
    department: SUPPORT_AGENT_DEPARTMENT,
    authRole: "Agent",
    cpAgentRole: "agent",
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
