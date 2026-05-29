export type AgentPageMeta = {
  title: string
}

export const AGENT_PAGE_META: Record<string, AgentPageMeta> = {
  "/agent/dashboard": { title: "Tableau de bord" },
  "/agent/tickets": { title: "Backlog" },
  "/agent/actions": { title: "Actions" },
  "/agent/procedures": { title: "Procédures" },
}

export function getAgentPageMeta(
  pathname: string,
  searchParams?: Pick<URLSearchParams, "get"> | null,
): AgentPageMeta | null {
  if (pathname.startsWith("/agent/tickets/") && pathname !== "/agent/tickets") {
    return null
  }

  if (pathname === "/agent/tickets" && searchParams?.get("mine") === "1") {
    return { title: "Affectation" }
  }

  return AGENT_PAGE_META[pathname] ?? null
}
