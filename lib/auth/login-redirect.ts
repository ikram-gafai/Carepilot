import {
  defaultPathForWorkspace,
  fromPathMatchesWorkspace,
  workspaceFromRole,
} from "@/lib/auth/access"

export function resolvePostLoginPath(opts: {
  role: string
  fromParam: string | null
  fallback?: string
}): string {
  const { role, fromParam, fallback = "/agent/dashboard" } = opts
  const workspace = workspaceFromRole(role)
  const home = defaultPathForWorkspace(workspace)

  if (fromParam?.startsWith("/") && fromPathMatchesWorkspace(fromParam, workspace)) {
    return fromParam
  }

  if (workspace === "agent" && fallback.startsWith("/agent")) {
    return fallback
  }

  return home
}
