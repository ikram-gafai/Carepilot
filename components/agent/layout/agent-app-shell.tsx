import { Suspense } from "react"

import { AgentShellHeader } from "@/components/agent/layout/agent-header-context"
import { AgentSidebar } from "@/components/agent/layout/agent-sidebar"
import type { CarePilotSessionUser } from "@/lib/auth/session"
import type { AgentSidebarSnapshot } from "@/lib/agent-sidebar"

export function AgentAppShell({
  pathname,
  sidebar,
  sessionUser,
  children,
}: {
  pathname: string
  sidebar: AgentSidebarSnapshot | null
  sessionUser?: CarePilotSessionUser | null
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-50/90 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <Suspense fallback={<div className="w-[13.5rem] shrink-0 border-r border-zinc-200/90 bg-zinc-50/90" />}>
        <AgentSidebar pathname={pathname} snapshot={sidebar} sessionUser={sessionUser} />
      </Suspense>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-primary/[0.07] bg-background dark:border-primary/10 dark:bg-zinc-950">
        <AgentShellHeader />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
