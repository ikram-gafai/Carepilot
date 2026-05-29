import { Suspense } from "react"

import { AgentPageBody } from "@/components/agent/layout/agent-header"
import { TicketFiltersBar } from "@/components/agent/tickets/ticket-filters-bar"
import { TicketTable } from "@/components/agent/tickets/ticket-table"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { findCpAgentUserByAuthEmail } from "@/lib/cp-agent/user-match"
import type { TicketQueueQuickFilter } from "@/lib/agent/ticket-queue-display"
import { listSynchronizedTickets } from "@/lib/carepilot-api/tickets"
import { getCarePilotSession } from "@/lib/auth/session"
import { getDb, getDbOrNull } from "@/lib/db"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"

export const dynamic = "force-dynamic"

function parseSearchParams(sp: URLSearchParams) {
  const mine = sp.get("mine") === "1"
  const filter = sp.get("filter") as TicketQueueQuickFilter | null
  return {
    q: sp.get("q") ?? undefined,
    quickFilter: filter && filter !== "all" ? filter : undefined,
    mine,
  }
}

export default async function AgentTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = new URLSearchParams()
  const raw = await searchParams
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") sp.set(k, v)
    else if (Array.isArray(v) && v[0]) sp.set(k, v[0])
  }

  if (!getDbOrNull()) {
    return (
      <>
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
        </AgentPageBody>
      </>
    )
  }

  const parsed = parseSearchParams(sp)
  let assignedUserId: string | undefined

  if (parsed.mine) {
    const session = await getCarePilotSession()
    if (session?.email) {
      const agent = await findCpAgentUserByAuthEmail(getDb(), session.email)
      if (agent) assignedUserId = String(agent.id)
    }
  }

  let ticketsRes: Awaited<ReturnType<typeof listSynchronizedTickets>>
  try {
    ticketsRes = await listSynchronizedTickets({
      q: parsed.q,
      quickFilter: parsed.quickFilter,
      assignedUserId,
    })
  } catch {
    return (
      <AgentPageBody className="p-4">
        <EmptyState
          title={DB_UNAVAILABLE_TITLE}
          description={dbUnavailableDescription("unavailable")}
        />
      </AgentPageBody>
    )
  }

  const tickets = ticketsRes.items.map((t) => ({
    ...t,
    slaDueAt: t.slaDueAt ? new Date(t.slaDueAt) : null,
    updatedAt: new Date(t.updatedAt),
    createdAt: new Date(t.createdAt),
  }))

  return (
    <>
      <CarepilotAutoRefresh />
      <AgentPageBody className="mx-auto max-w-[1400px] space-y-3 p-4">
        <Suspense fallback={null}>
          <TicketFiltersBar />
        </Suspense>
        <TicketTable rows={tickets} />
      </AgentPageBody>
    </>
  )
}
