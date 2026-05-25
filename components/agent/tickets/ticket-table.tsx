import Link from "next/link"

import { StatusBadge } from "@/components/agent/ui/status-badge"
import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { SlaIndicator } from "@/components/agent/ui/sla-indicator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cpAgentSlaLabel } from "@/lib/queries/cp-agent"
import type { CpAgentTicketListRow } from "@/lib/queries/cp-agent"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"

function formatDt(d: Date | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

export function TicketTable({ rows }: { rows: CpAgentTicketListRow[] }) {
  if (!rows.length) {
    return <EmptyState title="No tickets" />
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-800">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-zinc-50/95 backdrop-blur dark:bg-zinc-900/95">
          <TableRow className="border-zinc-100 hover:bg-transparent dark:border-zinc-800">
            <TableHead className="h-10 w-[112px] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">ID</TableHead>
            <TableHead className="h-10 min-w-[240px] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Title</TableHead>
            <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Store</TableHead>
            <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Category</TableHead>
            <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Status</TableHead>
            <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Priority</TableHead>
            <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">SLA / TTR</TableHead>
            <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Assigned</TableHead>
            <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => {
            const sla = cpAgentSlaLabel(t.slaDueAt, t.status)
            const problemStatement = t.description.replace(/\s+/g, " ").trim()
            return (
              <TableRow
                key={t.id}
                className="cursor-pointer border-zinc-100 transition-colors hover:bg-primary/[0.05] dark:border-zinc-800/80 dark:hover:bg-primary/[0.08]"
              >
                <TableCell className="align-top py-2.5 font-mono text-xs">
                  <Link href={`/agent/tickets/${t.id}`} className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
                    {t.careId}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[min(420px,44vw)] align-top py-2.5">
                  <Link href={`/agent/tickets/${t.id}`} className="block text-sm font-medium leading-snug text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50">
                    {agentTicketDisplayTitle(t.title)}
                  </Link>
                  {problemStatement ? (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{problemStatement}</p>
                  ) : null}
                </TableCell>
                <TableCell className="align-top py-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                      {t.storeName ?? t.storeCode ?? "—"}
                    </TableCell>
                <TableCell className="align-top py-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {cpAgentCategoryLabel(t.category)}
                </TableCell>
                <TableCell className="align-top py-2.5">
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="align-top py-2.5">
                  <PriorityBadge priority={t.priority} />
                </TableCell>
                <TableCell className="align-top py-2.5">
                  <SlaIndicator label={sla.label} tone={sla.tone} />
                </TableCell>
                <TableCell className="align-top py-2.5 text-xs text-zinc-600 dark:text-zinc-300">{t.assigneeName ?? "—"}</TableCell>
                <TableCell className="align-top py-2.5 text-xs tabular-nums text-zinc-600 dark:text-zinc-300">{formatDt(t.updatedAt)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
