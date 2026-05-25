import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AgentShellWithPath } from "@/components/agent/layout/agent-shell-with-path"
import { roleMatchesWorkspace } from "@/lib/auth/access"
import { getCarePilotSession } from "@/lib/auth/session"
import { getAgentSidebarSnapshot } from "@/lib/carepilot-api/agent-sidebar"
import { hasDatabaseUrl } from "@/lib/db"

export const metadata: Metadata = {
  title: {
    template: "%s · CAREPILOT",
    default: "CAREPILOT",
  },
}

export default async function AgentSegmentLayout({ children }: { children: React.ReactNode }) {
  if (hasDatabaseUrl()) {
    const session = await getCarePilotSession()
    if (!session) {
      redirect("/login?from=/agent/dashboard")
    }
    if (!roleMatchesWorkspace(session.role, "agent")) {
      redirect("/admin/dashboard")
    }
    const sidebar = await getAgentSidebarSnapshot(session.email)
    return (
      <AgentShellWithPath sidebar={sidebar} sessionUser={session}>
        {children}
      </AgentShellWithPath>
    )
  }

  const sidebar = await getAgentSidebarSnapshot()
  return <AgentShellWithPath sidebar={sidebar}>{children}</AgentShellWithPath>
}
