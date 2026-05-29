"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import type { InferSelectModel } from "drizzle-orm"
import { ArrowUpRight, Search } from "lucide-react"

import { AIFeedbackPanel, TicketActions } from "@/components/agent/tickets/ticket-actions"
import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { StatusBadge } from "@/components/agent/ui/status-badge"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { TicketPanelSkeleton } from "@/components/carepilot/page-loading-skeleton"
import { Input } from "@/components/ui/input"
import { cpAgentAiFeedback } from "@/lib/db/schema/cp-agent"
import { takeSnippet } from "@/lib/agent-ticket-intelligence"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import type { AgentTicketListItem } from "@/lib/carepilot-api/tickets"
import type { CpAgentTicketRow } from "@/lib/queries/cp-agent"
import { cn } from "@/lib/utils"

type FeedbackRow = InferSelectModel<typeof cpAgentAiFeedback>

function parseTicketIdFromSearchParams(searchParams: URLSearchParams): number | null {
  const raw = searchParams.get("ticket")
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

function feedbackSummaryLine(f: FeedbackRow): string {
  const verdict = f.helpful === true ? "Accepté" : f.helpful === false ? "Rejeté" : "En attente"
  const helpful = f.helpful === true ? "Utile" : f.helpful === false ? "Peu utile" : ""
  const rating = f.confidenceRating != null ? `${f.confidenceRating}/5` : ""
  return [verdict, helpful, rating].filter(Boolean).join(" · ")
}

function TicketQueueItem({
  row,
  active,
  href,
}: {
  row: AgentTicketListItem
  active: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "block w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/30 bg-primary/[0.06] shadow-sm ring-1 ring-primary/15 dark:bg-primary/[0.1]"
          : "border-zinc-200/90 bg-white hover:border-primary/20 hover:bg-primary/[0.03] dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-primary/[0.06]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">{row.careId}</span>
        <PriorityBadge priority={row.predictedPriority ?? row.priority} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-100">
        {agentTicketDisplayTitle(row.title)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={row.status} />
        {row.signals.includes("n3") ? (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
            Signal N3
          </span>
        ) : null}
        {row.suggestedActionLabel && row.suggestedActionLabel !== "—" ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {row.suggestedActionLabel}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

function ValidationHistory({ feedback }: { feedback: FeedbackRow[] }) {
  if (!feedback.length) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">Aucune validation enregistrée.</p>
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
            {feedback.length > 1 ? `${feedback.length} entrées · dernière affichée` : "Dernière entrée"}
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
  tickets: AgentTicketListItem[]
  selectedTicketId: number | null
  ticket: CpAgentTicketRow | null
  assigneeName: string | null
  feedback: FeedbackRow[]
}) {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")

  const urlTicketId = parseTicketIdFromSearchParams(searchParams)
  const activeTicketId = useMemo(() => {
    if (urlTicketId != null && tickets.some((t) => t.id === urlTicketId)) {
      return urlTicketId
    }
    return selectedTicketId
  }, [urlTicketId, tickets, selectedTicketId])

  const panelReady =
    activeTicketId != null && ticket != null && ticket.id === activeTicketId

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter(
      (t) =>
        t.careId.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.storeCode?.toLowerCase().includes(q) ?? false) ||
        (t.storeName?.toLowerCase().includes(q) ?? false),
    )
  }, [query, tickets])

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher ID, titre, magasin…"
              className="h-9 border-zinc-200 bg-white pl-8 text-sm shadow-none dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <EmptyState title="Aucun ticket" />
            ) : (
              filtered.map((row) => (
                <TicketQueueItem
                  key={row.id}
                  row={row}
                  active={row.id === activeTicketId}
                  href={`/agent/actions?ticket=${row.id}`}
                />
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto overscroll-contain">
          {!activeTicketId ? (
            <EmptyState title="Sélectionnez un ticket" />
          ) : !panelReady ? (
            <TicketPanelSkeleton />
          ) : (
            <div key={activeTicketId} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-xs font-semibold text-muted-foreground">{ticket.careId}</p>
                  <h2 className="text-base font-semibold leading-snug tracking-tight text-foreground">
                    {agentTicketDisplayTitle(ticket.title)}
                  </h2>
                </div>
                <Link
                  href={`/agent/tickets/${ticket.id}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Fiche ticket
                  <ArrowUpRight className="size-3" aria-hidden />
                </Link>
              </div>

              <section className="rounded-lg border border-border/60 bg-card">
                <div className="space-y-4 px-4 py-4">
                  <ValidationHistory key={`history-${activeTicketId}`} feedback={feedback} />
                  <AIFeedbackPanel key={`feedback-${activeTicketId}`} ticketId={ticket.id} embedded />
                </div>
              </section>

              <section className="rounded-lg border border-border/60 bg-card px-4 py-4">
                <TicketActions key={`actions-${activeTicketId}`} ticketId={ticket.id} embedded emphasis />
              </section>
            </div>
          )}
        </div>
    </div>
  )
}
