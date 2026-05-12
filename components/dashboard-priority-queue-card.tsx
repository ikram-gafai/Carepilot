"use client"

import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { DEMO_TICKETS_QUEUE } from "@/lib/tickets-demo-queue"
import {
  ConfidenceCell,
  SlaStateBadge,
} from "@/components/tickets-demo-queue-table"
import { TicketsDemoRowActions } from "@/components/tickets-demo-row-actions"

const thClass =
  "h-10 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"

export function DashboardPriorityQueueCard() {
  const router = useRouter()

  return (
    <Card className="border-border bg-background pt-0 shadow-none">
      <CardHeader className="border-b border-border py-4">
        <CardTitle className="text-base font-semibold">Priority Queue</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={thClass}>Ticket ID</TableHead>
              <TableHead className={thClass}>Subject</TableHead>
              <TableHead className={thClass}>SLA state</TableHead>
              <TableHead className={thClass}>Predicted outcome</TableHead>
              <TableHead className={thClass}>Confidence</TableHead>
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
                  <TableCell className="max-w-[220px] px-3 py-2.5 font-medium text-foreground sm:max-w-[280px]">
                    <span className="line-clamp-2 whitespace-normal">{row.subject}</span>
                  </TableCell>
                <TableCell className="px-3 py-2.5">
                  <SlaStateBadge state={row.slaState} />
                </TableCell>
                <TableCell className="max-w-[200px] px-3 py-2.5 text-foreground sm:max-w-[240px]">
                  <span className="line-clamp-2 whitespace-normal">
                    {row.predictedOutcome}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <ConfidenceCell pct={row.confidence} />
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
