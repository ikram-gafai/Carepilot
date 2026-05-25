import { ADMIN_ROLES } from "@/lib/admin-nav"

export type Workspace = "agent" | "admin"

export function isWorkspace(v: unknown): v is Workspace {
  return v === "agent" || v === "admin"
}

export function roleMatchesWorkspace(role: string, workspace: Workspace): boolean {
  const isAdmin = ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
  return workspace === "admin" ? isAdmin : !isAdmin
}

export function defaultPathForWorkspace(workspace: Workspace): string {
  return workspace === "admin" ? "/admin/dashboard" : "/agent/dashboard"
}

export function fromPathMatchesWorkspace(path: string, workspace: Workspace): boolean {
  return workspace === "admin" ? path.startsWith("/admin") : path.startsWith("/agent")
}

export function workspaceFromRole(role: string): Workspace {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]) ? "admin" : "agent"
}
