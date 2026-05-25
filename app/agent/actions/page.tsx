import type { Metadata } from "next"

import { AgentActionsWorkspace } from "@/components/agent/actions/agent-actions-workspace"
import { AgentHeader, AgentPageBody } from "@/components/agent/layout/agent-header"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { loadAgentTicketDetailPage } from "@/lib/carepilot-api/agent-ticket-detail"
import { fetchCarepilotPage } from "@/lib/carepilot-api/fetch-page"
import { parseTicketRow } from "@/lib/carepilot-api/serialize"
import { CLOSED_TICKET_STATUSES } from "@/lib/care-operational-actions"
import { getDbOrNull } from "@/lib/db"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"
import type { cpAgentTickets } from "@/lib/db/schema/cp-agent"
import { cpAgentGetTicketAiEnrichment } from "@/lib/queries/cp-agent"

export const metadata: Metadata = { title: "Actions" }

export const dynamic = "force-dynamic"

const CLOSED_STATUSES = CLOSED_TICKET_STATUSES

function parseTicketId(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v) return null
  const id = Number(v)
  return Number.isFinite(id) ? id : null
}

type TicketRow = typeof cpAgentTickets.$inferSelect & { assigneeName: string | null }

export default async function AgentActionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const requestedId = parseTicketId(sp.ticket)

  if (!getDbOrNull()) {
    return (
      <>
        <AgentHeader title="Actions" />
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
        </AgentPageBody>
      </>
    )
  }

  const ticketsRes = await fetchCarepilotPage<{ items: TicketRow[] }>("/api/tickets")
  if (!ticketsRes.ok) {
    return (
      <>
        <AgentHeader title="Actions" />
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("unavailable")} />
        </AgentPageBody>
      </>
    )
  }

  const all = ticketsRes.data.items.map((t) => parseTicketRow(t))
  const openTickets = all.filter((t) => !CLOSED_STATUSES.includes(t.status as (typeof CLOSED_STATUSES)[number]))
  const selectedId =
    requestedId && openTickets.some((t) => t.id === requestedId)
      ? requestedId
      : openTickets[0]?.id ?? null

  let detail: {
    ticket: TicketRow
    assigneeName: string | null
    feedback: Awaited<ReturnType<typeof cpAgentGetTicketAiEnrichment>>["feedback"]
  } | null = null

  if (selectedId) {
    try {
      const page = await loadAgentTicketDetailPage(selectedId)
      const ai = await cpAgentGetTicketAiEnrichment(selectedId, page.ticket.category)
      detail = {
        ticket: { ...page.ticket, assigneeName: page.assigneeName },
        assigneeName: page.assigneeName,
        feedback: ai.feedback,
      }
    } catch {
      detail = null
    }
  }

  return (
    <>
      <CarepilotAutoRefresh intervalMs={60_000} />
      <AgentHeader title="Actions" />
      <AgentPageBody className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-[1280px] flex-col overflow-hidden p-4">
        <div className="min-h-0 flex-1">
          <AgentActionsWorkspace
            tickets={openTickets}
            selectedTicketId={selectedId}
            ticket={detail?.ticket ?? null}
            assigneeName={detail?.assigneeName ?? null}
            feedback={detail?.feedback ?? []}
          />
        </div>
      </AgentPageBody>
    </>
  )
}
