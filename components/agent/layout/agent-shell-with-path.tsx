"use client"

import { usePathname } from "next/navigation"

import { AgentHeaderProvider } from "@/components/agent/layout/agent-header-context"
import { AgentPreferencesProvider } from "@/components/agent/layout/agent-preferences-context"
import { AgentAppShell } from "@/components/agent/layout/agent-app-shell"
import { Toaster } from "@/components/ui/sonner"
import type { CarePilotSessionUser } from "@/lib/auth/session"
import type { AgentSidebarSnapshot } from "@/lib/agent-sidebar"

export function AgentShellWithPath({
  sidebar,
  sessionUser,
  children,
}: {
  sidebar: AgentSidebarSnapshot | null
  sessionUser?: CarePilotSessionUser | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <AgentPreferencesProvider>
      <AgentHeaderProvider>
        <AgentAppShell pathname={pathname} sidebar={sidebar} sessionUser={sessionUser}>
          {children}
        </AgentAppShell>
      </AgentHeaderProvider>
      <Toaster />
    </AgentPreferencesProvider>
  )
}
