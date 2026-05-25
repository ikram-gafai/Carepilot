"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import type { InferSelectModel } from "drizzle-orm"
import { ArrowUpRight, Search } from "lucide-react"

import { AIFeedbackPanel, TicketActions } from "@/components/agent/tickets/ticket-actions"
import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { StatusBadge } from "@/components/agent/ui/status-badge"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { SectionHeader } from "@/components/agent/ui/section-header"
import { Input } from "@/components/ui/input"
import { cpAgentAiFeedback } from "@/lib/db/schema/cp-agent"
import { takeSnippet } from "@/lib/agent-ticket-intelligence"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import type { CpAgentTicketListRow, CpAgentTicketRow } from "@/lib/queries/cp-agent"
import { cn } from "@/lib/utils"

type FeedbackRow = InferSelectModel<typeof cpAgentAiFeedback>

function feedbackSummaryLine(f: FeedbackRow): string {
  const verdict = f.helpful === true ? "Accepted" : f.helpful === false ? "Rejected" : "Pending"
  const helpful = f.helpful === true ? "Helpful" : f.helpful === false ? "Not helpful" : ""
  const rating = f.confidenceRating != null ? `${f.confidenceRating}/5` : ""
  return [verdict, helpful, rating].filter(Boolean).join(" · ")
}

function TicketQueueItem({
  row,
  active,
  onSelect,
}: {
  row: CpAgentTicketListRow
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/30 bg-primary/[0.06] shadow-sm ring-1 ring-primary/15 dark:bg-primary/[0.1]"
          : "border-zinc-200/90 bg-white hover:border-primary/20 hover:bg-primary/[0.03] dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-primary/[0.06]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">{row.careId}</span>
        <PriorityBadge priority={row.priority} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-100">
        {agentTicketDisplayTitle(row.title)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={row.status} />
      </div>
    </button>
  )
}

function ValidationHistory({ feedback }: { feedback: FeedbackRow[] }) {
  if (!feedback.length) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">No validation recorded yet.</p>
  }

  const latest = feedback[0]!

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{feedbackSummaryLine(latest)}</p>
        {latest.comment ? (
          <p className="mt-1 text-xs leading-snug text-zinc-600 dark:text-zinc-400">{takeSnippet(latest.comment, 160)}</p>
        ) : null}
        <div className="mt-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
          <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            {feedback.length > 1 ? `${feedback.length} entries · latest shown` : "Latest entry"}
          </p>
        </div>
      </div>
      {feedback.length > 1 ? (
        <ul className="space-y-2 rounded-lg border border-dashed border-zinc-200/90 px-2.5 py-2 dark:border-zinc-800">
          {feedback.slice(1, 4).map((f) => (
            <li key={f.id} className="border-b border-zinc-100 pb-2 text-[11px] last:border-0 last:pb-0 dark:border-zinc-800">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">{feedbackSummaryLine(f)}</p>
              {f.comment ? <p className="mt-0.5 text-zinc-500">{takeSnippet(f.comment, 100)}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function AgentActionsWorkspace({
  tickets,
  selectedTicketId,
  ticket,
  assigneeName,
  feedback,
}: {
  tickets: CpAgentTicketListRow[]
  selectedTicketId: number | null
  ticket: CpAgentTicketRow | null
  assigneeName: string | null
  feedback: FeedbackRow[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter(
      (t) =>
        t.careId.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.storeCode?.toLowerCase().includes(q) ?? false) ||
        (t.storeName?.toLowerCase().includes(q) ?? false) ||
        (t.storeCity?.toLowerCase().includes(q) ?? false),
    )
  }, [query, tickets])

  function selectTicket(id: number) {
    router.push(`/agent/actions?ticket=${id}`)
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
          <SectionHeader title="Open tickets" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID, title, store…"
              className="h-9 border-zinc-200 bg-white pl-8 text-sm shadow-none dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <EmptyState title="No tickets" />
            ) : (
              filtered.map((row) => (
                <TicketQueueItem
                  key={row.id}
                  row={row}
                  active={row.id === selectedTicketId}
                  onSelect={() => selectTicket(row.id)}
                />
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto overscroll-contain">
          {!selectedTicketId || !ticket ? (
            <EmptyState title="Select a ticket" />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/60 dark:ring-zinc-800/80">
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-xs font-semibold text-muted-foreground">{ticket.careId}</p>
                  <h2 className="text-base font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
                    {agentTicketDisplayTitle(ticket.title)}
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {assigneeName ? `Assigned · ${assigneeName}` : "Unassigned"} · {ticket.status.replace(/_/g, " ")}
                  </p>
                </div>
                <Link
                  href={`/agent/tickets/${ticket.id}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition-colors hover:border-primary/25 hover:bg-primary/[0.04] hover:text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  Ticket detail
                  <ArrowUpRight className="size-3" aria-hidden />
                </Link>
              </div>

              <section className="rounded-lg border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/60 dark:ring-zinc-800/80">
                <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <SectionHeader title="Feedback" />
                </div>
                <div className="space-y-4 px-4 py-4">
                  <ValidationHistory feedback={feedback} />
                  <AIFeedbackPanel ticketId={ticket.id} embedded />
                </div>
              </section>

              <section className="rounded-lg border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/60 dark:ring-zinc-800/80">
                <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <SectionHeader title="Actions" />
                </div>
                <div className="px-4 py-4">
                  <TicketActions ticketId={ticket.id} embedded emphasis />
                </div>
              </section>
            </>
          )}
        </div>
    </div>
  )
}
