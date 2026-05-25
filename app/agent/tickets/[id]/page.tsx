import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { OperationalIntelligencePanel } from "@/components/agent/ai/operational-intelligence-panel"
import { AgentHeader, AgentPageBody } from "@/components/agent/layout/agent-header"
import { TicketCommandBar } from "@/components/agent/tickets/ticket-command-bar"
import { TicketComments } from "@/components/agent/tickets/ticket-comments"
import { TicketTimeline } from "@/components/agent/tickets/ticket-timeline"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { SectionHeader } from "@/components/agent/ui/section-header"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { Card, CardContent } from "@/components/ui/card"
import {
  loadAgentTicketDetailPage,
  TicketNotFoundError,
} from "@/lib/carepilot-api/agent-ticket-detail"
import { getDbOrNull } from "@/lib/db"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import { cpAgentSlaLabel } from "@/lib/queries/cp-agent"

type Props = { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const ticketId = Number(id)
  if (!Number.isFinite(ticketId)) {
    return { title: "Ticket" }
  }
  if (!getDbOrNull()) return { title: "Ticket" }
  try {
    const detail = await loadAgentTicketDetailPage(ticketId)
    return { title: agentTicketDisplayTitle(detail.ticket.title).slice(0, 80) }
  } catch {
    return { title: "Ticket" }
  }
}

export default async function AgentTicketDetailPage({ params }: Props) {
  const { id } = await params
  const ticketId = Number(id)
  if (!Number.isFinite(ticketId)) notFound()

  if (!getDbOrNull()) {
    return (
      <>
        <AgentHeader title="Ticket" />
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
        </AgentPageBody>
      </>
    )
  }

  let detail
  try {
    detail = await loadAgentTicketDetailPage(ticketId)
  } catch (e) {
    if (e instanceof TicketNotFoundError) notFound()
    return (
      <>
        <AgentHeader title="Ticket" />
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("unavailable")} />
        </AgentPageBody>
      </>
    )
  }

  const { ticket, assigneeName, analysis, history, comments, km, relatedIncidents } = detail
  const sla = cpAgentSlaLabel(ticket.slaDueAt, ticket.status)

  const displayTitle = agentTicketDisplayTitle(ticket.title)

  return (
    <>
      <CarepilotAutoRefresh intervalMs={60_000} />
      <AgentHeader title={ticket.careId} />
      <AgentPageBody className="p-4">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <TicketCommandBar ticket={ticket} assigneeName={assigneeName} sla={sla} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(400px,36%)] lg:items-start">
            <main className="min-w-0 space-y-4">
              <header className="space-y-1 border-b border-border pb-3">
                <h1 className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
                  {displayTitle}
                </h1>
              </header>

              <section className="rounded-lg border border-border/90 bg-card px-3 py-2.5 text-xs shadow-sm ring-1 ring-border/40">
                <p className="text-xs font-medium text-muted-foreground">Details</p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium text-foreground">{cpAgentCategoryLabel(ticket.category)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Store</dt>
                    <dd className="font-medium text-foreground">{ticket.storeCode ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Priority</dt>
                    <dd className="font-medium text-foreground">{ticket.priority}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Assignee</dt>
                    <dd className="font-medium text-foreground">{assigneeName ?? "—"}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <SectionHeader title="Description" className="mb-2" />
                <div className="rounded-lg border border-border/90 bg-card p-3 text-sm leading-relaxed text-foreground shadow-sm ring-1 ring-border/30">
                  {ticket.description}
                </div>
              </section>

              <section>
                <SectionHeader title="Comments" className="mb-2" />
                <div className="rounded-lg border border-border/90 bg-card p-3 shadow-sm ring-1 ring-border/30">
                  <TicketComments comments={comments} />
                </div>
              </section>

              <section>
                <SectionHeader title="Timeline" className="mb-2" />
                <div className="rounded-lg border border-border/90 bg-card p-3 shadow-sm ring-1 ring-border/30">
                  <TicketTimeline events={history} />
                </div>
              </section>
            </main>

            <aside className="min-w-0 space-y-4 lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:self-start">
              {analysis ? (
                <OperationalIntelligencePanel
                  ticket={ticket}
                  assigneeName={assigneeName}
                  analysis={analysis}
                  relatedIncidents={relatedIncidents}
                  km={km}
                />
              ) : (
                <Card className="border-border shadow-sm ring-1 ring-border/40">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-sm font-semibold text-foreground">No AI analysis</p>
                    <Link
                      href={`/agent/actions?ticket=${ticket.id}`}
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Open in Actions
                    </Link>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </AgentPageBody>
    </>
  )
}
