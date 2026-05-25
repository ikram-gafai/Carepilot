/**
 * Demo sign-in personas for local / pilot environments.
 * Passwords match `scripts/seed-carepilot-auth.ts` unless overridden via env at seed time.
 */
export type LoginPersona = {
  id: string
  name: string
  workspace: "agent" | "admin"
  workspaceLabel: string
  role: string
  email: string
  /** Demo password — never use in production without rotating seeds. */
  password: string
  destination: string
  badge?: string
}

export const DEMO_LOGIN_PERSONAS: LoginPersona[] = [
  {
    id: "ikram-agent",
    name: "Ikram Gafai",
    workspace: "agent",
    workspaceLabel: "Agent workspace",
    role: "Agent",
    email: "ikram.gafai@carrefour.internal",
    password: "CarePilot2026!",
    destination: "/agent/dashboard",
    badge: "Primary",
  },
  {
    id: "khalid-admin",
    name: "Khalid AS",
    workspace: "admin",
    workspaceLabel: "Admin supervision",
    role: "Admin · Owner",
    email: "khalid.as@carrefour.internal",
    password: "CarePilot2026!",
    destination: "/admin/dashboard",
    badge: "Owner",
  },
  {
    id: "thomas-supervisor",
    name: "Thomas Mercier",
    workspace: "admin",
    workspaceLabel: "Supervisor",
    role: "Supervisor",
    email: "thomas.mercier@carrefour.internal",
    password: "CarePilot2026!",
    destination: "/admin/dashboard",
  },
  {
    id: "elodie-admin",
    name: "Élodie Petit",
    workspace: "admin",
    workspaceLabel: "Platform admin",
    role: "Admin",
    email: "elodie.petit@carrefour.internal",
    password: "CarePilot2026!",
    destination: "/admin/dashboard",
  },
]

export function personasForWorkspace(workspace: "agent" | "admin" | "all") {
  if (workspace === "all") return DEMO_LOGIN_PERSONAS
  return DEMO_LOGIN_PERSONAS.filter((p) => p.workspace === workspace)
}
