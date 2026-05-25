import { Suspense } from "react"

import { AgentHeader, AgentPageBody } from "@/components/agent/layout/agent-header"
import { TicketFiltersBar } from "@/components/agent/tickets/ticket-filters-bar"
import { TicketTable } from "@/components/agent/tickets/ticket-table"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { findCpAgentUserByAuthEmail } from "@/lib/cp-agent/user-match"
import { fetchCarepilotPage } from "@/lib/carepilot-api/fetch-page"
import { parseTicketRow } from "@/lib/carepilot-api/serialize"
import { getCarePilotSession } from "@/lib/auth/session"
import type { CpAgentTicketFilters } from "@/lib/queries/cp-agent"
import { getDb, getDbOrNull } from "@/lib/db"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"
import type { cpAgentTickets } from "@/lib/db/schema/cp-agent"

export const dynamic = "force-dynamic"

function parseFilters(sp: URLSearchParams): CpAgentTicketFilters {
  return {
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    priority: sp.get("priority") ?? undefined,
    category: sp.get("category") ?? undefined,
    assignedUserId: sp.get("assigned") ?? undefined,
    slaState: (sp.get("sla") as CpAgentTicketFilters["slaState"]) ?? undefined,
  }
}

type TicketRow = typeof cpAgentTickets.$inferSelect & { assigneeName: string | null }

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
        <AgentHeader title="Tickets" />
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
        </AgentPageBody>
      </>
    )
  }

  let filters = parseFilters(sp)
  const mine = sp.get("mine") === "1"
  if (mine && getDbOrNull()) {
    const session = await getCarePilotSession()
    if (session?.email) {
      const agent = await findCpAgentUserByAuthEmail(getDb(), session.email)
      if (agent) filters = { ...filters, assignedUserId: String(agent.id) }
    }
  }

  const qs = new URLSearchParams()
  if (filters.q) qs.set("q", filters.q)
  if (filters.status) qs.set("status", filters.status)
  if (filters.priority) qs.set("priority", filters.priority)
  if (filters.category) qs.set("category", filters.category)
  if (filters.assignedUserId) qs.set("assigned", filters.assignedUserId)
  if (filters.slaState) qs.set("sla", filters.slaState)
  if (mine) qs.set("mine", "1")

  const [optionsRes, ticketsRes] = await Promise.all([
    fetchCarepilotPage<Awaited<ReturnType<typeof import("@/lib/carepilot-api/ticket-filters").getTicketFilterOptions>>>(
      "/api/tickets/filters",
    ),
    fetchCarepilotPage<{ items: TicketRow[]; total: number }>(`/api/tickets?${qs.toString()}`),
  ])

  if (!optionsRes.ok || !ticketsRes.ok) {
    return (
      <>
        <AgentHeader title="Tickets" />
        <AgentPageBody className="p-4">
          <EmptyState
            title={DB_UNAVAILABLE_TITLE}
            description={dbUnavailableDescription("unavailable")}
          />
        </AgentPageBody>
      </>
    )
  }

  const options = optionsRes.data
  const tickets = ticketsRes.data.items.map((t) => parseTicketRow(t))

  return (
    <>
      <CarepilotAutoRefresh intervalMs={60_000} />
      <AgentHeader title="Tickets" />
      <AgentPageBody className="mx-auto max-w-[1600px] space-y-3 p-4">
        <Suspense fallback={null}>
          <TicketFiltersBar options={options} />
        </Suspense>
        <TicketTable rows={tickets} />
      </AgentPageBody>
    </>
  )
}
