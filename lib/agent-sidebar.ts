import { fetchCarepilotPage } from "@/lib/carepilot-api/fetch-page"
import type { AgentSidebarSnapshot } from "@/lib/carepilot-api/agent-sidebar"

export type { AgentSidebarSnapshot } from "@/lib/carepilot-api/agent-sidebar"

export async function buildAgentSidebarSnapshot(): Promise<AgentSidebarSnapshot | null> {
  const res = await fetchCarepilotPage<AgentSidebarSnapshot>("/api/agent/sidebar")
  if (!res.ok) return null
  return res.data
}
