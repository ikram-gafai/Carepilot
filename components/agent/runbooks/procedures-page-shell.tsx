"use client"

import { AgentHeader, AgentPageBody } from "@/components/agent/layout/agent-header"
import { RunbooksWorkspace } from "@/components/agent/runbooks/runbooks-workspace"
import type { EnrichedRunbook } from "@/lib/agent-runbooks-catalog"

export function ProceduresPageShell({
  runbooks,
  dbBanner,
}: {
  runbooks: EnrichedRunbook[]
  dbBanner?: React.ReactNode
}) {
  return (
    <>
      <AgentHeader title="Procedures" />
      <AgentPageBody className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-[1280px] flex-col gap-2 overflow-hidden p-4">
        {dbBanner}
        <RunbooksWorkspace runbooks={runbooks} className="min-h-0 flex-1" />
      </AgentPageBody>
    </>
  )
}
