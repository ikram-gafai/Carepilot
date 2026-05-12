"use client"

import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import type { DemoSlaState } from "@/lib/tickets-demo-queue"
import { DEMO_TICKETS_QUEUE } from "@/lib/tickets-demo-queue"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TicketsDemoRowActions } from "@/components/tickets-demo-row-actions"

const thClass =
  "h-10 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"

export function SlaStateBadge({ state }: { state: DemoSlaState }) {
  const config = {
    breached: {
      label: "Breached",
      className:
        "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive",
    },
    "at-risk": {
      label: "At Risk",
      className:
        "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    },
    "on-track": {
      label: "On Track",
      className:
        "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    },
  } as const

  const { label, className } = config[state]

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        className
      )}
    >
      {label}
    </span>
  )
}

export function ConfidenceCell({ pct }: { pct: number }) {
  return (
    <div className="flex min-w-[108px] max-w-[140px] items-center gap-2">
      <span className="shrink-0 text-xs tabular-nums text-foreground">{pct}%</span>
      <div className="h-1.5 min-w-[56px] flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  )
}

export function TicketsDemoQueueTable() {
  const router = useRouter()

  return (
    <Card className="border-border bg-background py-0 shadow-none">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={thClass}>Ticket ID</TableHead>
              <TableHead className={thClass}>Subject</TableHead>
              <TableHead className={thClass}>Perimeter</TableHead>
              <TableHead className={thClass}>SLA state</TableHead>
              <TableHead className={thClass}>Predicted outcome</TableHead>
              <TableHead className={thClass}>Confidence</TableHead>
              <TableHead className={cn(thClass, "min-w-[240px]")}>Reason</TableHead>
              <TableHead className={thClass}>Age</TableHead>
              <TableHead className={thClass}>Last update</TableHead>
              <TableHead className={cn(thClass, "w-12 pr-4 text-right")}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_TICKETS_QUEUE.map((row) => {
              const href = `/tickets/${encodeURIComponent(row.ticketId)}`
              const go = () => {
                router.push(href)
              }
              return (
                <TableRow
                  key={row.ticketId}
                  role="link"
                  tabIndex={0}
                  title={`Open ticket ${row.ticketId}`}
                  className={cn(
                    "cursor-pointer border-border text-xs",
                    "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                  onClick={go}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      go()
                    }
                  }}
                >
                  <TableCell className="px-3 py-2.5 text-[11px] font-medium tabular-nums text-foreground">
                    {row.ticketId}
                  </TableCell>
                  <TableCell className="max-w-[200px] px-3 py-2.5 font-medium text-foreground sm:max-w-[260px]">
                    <span className="line-clamp-2 whitespace-normal">{row.subject}</span>
                  </TableCell>
                <TableCell className="px-3 py-2.5 text-muted-foreground">
                  {row.perimeter}
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <SlaStateBadge state={row.slaState} />
                </TableCell>
                <TableCell className="max-w-[180px] px-3 py-2.5 text-foreground sm:max-w-[220px]">
                  <span className="line-clamp-2 whitespace-normal">
                    {row.predictedOutcome}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <ConfidenceCell pct={row.confidence} />
                </TableCell>
                <TableCell className="max-w-md px-3 py-2.5 whitespace-normal text-[11px] leading-snug text-muted-foreground">
                  {row.reason}
                </TableCell>
                <TableCell className="px-3 py-2.5 tabular-nums text-muted-foreground">
                  {row.age}
                </TableCell>
                <TableCell className="px-3 py-2.5 tabular-nums text-muted-foreground">
                  {row.lastUpdateLabel}
                </TableCell>
                <TableCell
                  className="px-2 py-1 pr-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <TicketsDemoRowActions ticketId={row.ticketId} detailHref={href} />
                </TableCell>
              </TableRow>
            )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
