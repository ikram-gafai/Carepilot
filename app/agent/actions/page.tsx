import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { AgentActionsWorkspace } from "@/components/agent/actions/agent-actions-workspace"
import { AgentPageBody } from "@/components/agent/layout/agent-header"
import { TicketPanelSkeleton } from "@/components/carepilot/page-loading-skeleton"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { loadAgentTicketDetailPage } from "@/lib/carepilot-api/agent-ticket-detail"
import { listSynchronizedTickets, type AgentTicketListItem } from "@/lib/carepilot-api/tickets"
import { isClosedTicketStatus } from "@/lib/cp-agent/ticket-workflow"
import { getDbOrNull } from "@/lib/db"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"
import type { cpAgentTickets } from "@/lib/db/schema/cp-agent"

export const metadata: Metadata = { title: "Actions" }

export const dynamic = "force-dynamic"

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
      <AgentPageBody className="p-4">
        <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
      </AgentPageBody>
    )
  }

  let openTickets: AgentTicketListItem[]
  try {
    const { items } = await listSynchronizedTickets()
    openTickets = items
      .filter((t) => !isClosedTicketStatus(t.status))
      .map((t) => ({
        ...t,
        slaDueAt: t.slaDueAt ? new Date(t.slaDueAt) : null,
        updatedAt: new Date(t.updatedAt),
        createdAt: new Date(t.createdAt),
      }))
  } catch {
    return (
      <AgentPageBody className="p-4">
        <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("unavailable")} />
      </AgentPageBody>
    )
  }

  if (openTickets.length > 0) {
    if (!requestedId || !openTickets.some((t) => t.id === requestedId)) {
      redirect(`/agent/actions?ticket=${openTickets[0]!.id}`)
    }
  }

  const selectedId = requestedId

  let detail: {
    ticket: TicketRow
    assigneeName: string | null
    feedback: Awaited<ReturnType<typeof loadAgentTicketDetailPage>>["feedback"]
  } | null = null

  if (selectedId) {
    try {
      const page = await loadAgentTicketDetailPage(selectedId)
      detail = {
        ticket: { ...page.ticket, assigneeName: page.assigneeName },
        assigneeName: page.assigneeName,
        feedback: page.feedback,
      }
    } catch {
      detail = null
    }
  }

  return (
    <AgentPageBody className="mx-auto flex h-full min-h-0 max-w-[1280px] flex-col overflow-hidden p-4">
      <div className="min-h-0 flex-1">
        <Suspense fallback={<TicketPanelSkeleton />}>
          <AgentActionsWorkspace
            key={selectedId ?? "none"}
            tickets={openTickets}
            selectedTicketId={selectedId}
            ticket={detail?.ticket ?? null}
            assigneeName={detail?.assigneeName ?? null}
            feedback={detail?.feedback ?? []}
          />
        </Suspense>
      </div>
    </AgentPageBody>
  )
}
