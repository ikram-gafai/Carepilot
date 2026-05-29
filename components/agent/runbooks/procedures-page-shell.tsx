"use client"

import { RunbooksWorkspace } from "@/components/agent/runbooks/runbooks-workspace"
import { AgentPageBody } from "@/components/agent/layout/agent-header"
import type { EnrichedRunbook } from "@/lib/agent-runbooks-catalog"

export function ProceduresPageShell({
  runbooks,
  dbBanner,
  initialKm,
}: {
  runbooks: EnrichedRunbook[]
  dbBanner?: React.ReactNode
  initialKm?: string | null
}) {
  return (
      <AgentPageBody className="mx-auto flex h-full min-h-0 max-w-[1400px] flex-col overflow-hidden p-4">
      {dbBanner}
      <RunbooksWorkspace runbooks={runbooks} className="min-h-0 flex-1" initialKm={initialKm} />
    </AgentPageBody>
  )
}
