"use client"

import * as React from "react"
import { Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { AgentHeader } from "@/components/agent/layout/agent-header"
import { getAgentPageMeta } from "@/lib/agent-page-meta"

type AgentHeaderContextValue = {
  actions: React.ReactNode | null
  setActions: React.Dispatch<React.SetStateAction<React.ReactNode | null>>
}

const AgentHeaderContext = React.createContext<AgentHeaderContextValue | null>(null)

export function AgentHeaderProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = React.useState<React.ReactNode | null>(null)
  const value = React.useMemo(() => ({ actions, setActions }), [actions])

  return <AgentHeaderContext.Provider value={value}>{children}</AgentHeaderContext.Provider>
}

function AgentShellHeaderInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ctx = React.useContext(AgentHeaderContext)
  const meta = getAgentPageMeta(pathname, searchParams)

  if (!meta) return null

  return (
    <AgentHeader title={meta.title}>
      {ctx?.actions}
    </AgentHeader>
  )
}

export function AgentShellHeader() {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-30 h-11 shrink-0 border-b border-border/80 bg-background/95" />
      }
    >
      <AgentShellHeaderInner />
    </Suspense>
  )
}

/** Registers right-aligned toolbar controls for {@link AgentShellHeader}. */
export function AgentSetHeaderActions({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(AgentHeaderContext)
  const setActions = ctx?.setActions

  React.useLayoutEffect(() => {
    if (!setActions) return
    setActions(children)
    return () => setActions(null)
  }, [children, setActions])

  return null
}
