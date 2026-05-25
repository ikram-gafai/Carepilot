import Link from "next/link"

import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import {
  TicketHeroSummary,
  ticketHeroMetaPillClass,
} from "@/components/ticket-detail/ticket-hero-summary"
import { TicketPipelineBanner } from "@/components/ticket-detail/ticket-pipeline-banner"
import { TicketShellHeaderActions } from "@/components/ticket-detail/ticket-shell-header-actions"
import { Badge } from "@/components/ui/badge"
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
import {
  DEMO_DIAGNOSTIC_ITEMS,
  DEMO_HISTORICAL_MATCHES,
  DEMO_KM_MATCHES,
  DEMO_ROUTING_STEPS,
  demoCategoryLabel,
  demoMetadataBar,
  demoPriorityLabel,
  findDemoQueueRowByRef,
} from "@/lib/tickets-demo-detail"
import type { DemoSlaState, DemoTicketQueueRow } from "@/lib/tickets-demo-queue"

function slaStateBadgeClass(state: DemoSlaState) {
  if (state === "at-risk") {
    return "border-primary/35 bg-primary/10 text-foreground dark:border-primary/40 dark:bg-primary/15 dark:text-foreground"
  }
  return "border-border bg-muted/35 text-muted-foreground dark:border-border dark:bg-muted/25 dark:text-muted-foreground"
}

function slaStateLabel(state: DemoSlaState) {
  if (state === "breached") return "Breached"
  if (state === "at-risk") return "At Risk"
  return "On Track"
}

export function TicketDemoWorkspace({ row }: { row: DemoTicketQueueRow }) {
  const meta = demoMetadataBar(row)
  const category = demoCategoryLabel(row.subject)
  const priority = demoPriorityLabel(row.slaState)
  const perimeterDisplay = row.perimeter

  return (
    <div className="space-y-4">
      <CarePilotSetHeader
        breadcrumbLabel="Tickets"
        breadcrumbHref="/tickets"
        title={row.ticketId}
        trailingActions={<TicketShellHeaderActions />}
      />

      <TicketPipelineBanner
        hasAnalysis
        hasSimilar
        hasKmRecos
        hasDecision
      />

      <TicketHeroSummary
        ticketId={row.ticketId}
        title={row.subject}
        badges={
          <>
            {row.slaState === "breached" ? (
              <Badge variant="destructive" className="text-[10px] font-medium">
                Breached
              </Badge>
            ) : (
              <Badge className={cn("text-[10px] font-medium", slaStateBadgeClass(row.slaState))}>
                {slaStateLabel(row.slaState)}
              </Badge>
            )}
            <Badge className={ticketHeroMetaPillClass}>{perimeterDisplay}</Badge>
            <Badge className={ticketHeroMetaPillClass}>{priority}</Badge>
          </>
        }
        metrics={[
          { label: "Requester", value: meta.requester },
          { label: "SMAC", value: meta.smac },
          { label: "Lane", value: meta.lane },
          { label: "Status", value: meta.status },
          { label: "SLA", value: meta.sla },
          { label: "Last update", value: meta.lastUpdate },
        ]}
      />

      <Card
        id="ticket-agent-decision-section"
        className="scroll-mt-24 border-border bg-background pb-0 shadow-sm"
      >
        <CardHeader className="border-b border-border pb-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-semibold">Operational Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">
                Synthesized from ticket payload, KM catalogue, and similar operational resolutions (demo).
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Confidence
              </div>
              <div className="text-2xl font-bold tabular-nums text-foreground">{row.confidence}%</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 pb-4">
          <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4 dark:bg-primary/10">
            <p className="text-[10px] font-semibold tracking-wide text-primary uppercase dark:text-primary">
              Recommended operational outcome
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-foreground">{row.predictedOutcome}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{row.reason}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Perimeter", v: perimeterDisplay },
              { k: "Category", v: category },
              { k: "Operational status", v: meta.status },
              { k: "SLA state", v: slaStateLabel(row.slaState) },
            ].map((cell) => (
              <div
                key={cell.k}
                className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs shadow-sm"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {cell.k}
                </div>
                <div className="mt-1 font-medium text-foreground">{cell.v}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="border-border bg-background py-0 shadow-sm xl:col-span-4">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm font-semibold">Diagnostic Validation</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {DEMO_DIAGNOSTIC_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-foreground">{item.label}</span>
                <Badge className="border-border bg-muted px-2 text-[10px] font-medium text-foreground hover:bg-muted/80">
                  Missing
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-background py-0 shadow-sm xl:col-span-4 pb-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm font-semibold">Applicable Knowledge Match</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-4">
            {DEMO_KM_MATCHES.map((km) => (
              <div
                key={km.code}
                className="rounded-lg border border-border bg-card px-3 py-3 shadow-sm ring-1 ring-border/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-foreground">{km.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{km.code}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{km.pct}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-background py-0 shadow-sm xl:col-span-4">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm font-semibold">Operational Routing Logic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border p-0">
            {DEMO_ROUTING_STEPS.map((step) => (
              <div key={step.title} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{step.title}</span>
                  {step.current ? (
                    <Badge className="h-5 border-primary/35 bg-primary/12 px-1.5 text-[10px] font-medium text-foreground dark:bg-primary/18 dark:text-foreground">
                      Current
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-background shadow-sm">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm font-semibold">Historical Operational Matches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ticket
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Operational outcome
                </TableHead>
                <TableHead className="h-10 px-4 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Similarity
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_HISTORICAL_MATCHES.map((m) => (
                <TableRow key={m.ticketId} className="border-border text-xs">
                  <TableCell className="px-4 py-3 font-medium text-primary">
                    {findDemoQueueRowByRef(m.ticketId) ? (
                      <Link
                        href={`/tickets/${encodeURIComponent(m.ticketId)}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {m.ticketId}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{m.ticketId}</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xl px-4 py-3 text-muted-foreground">{m.outcome}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {m.similarity}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground">
        Demo workspace — set <span className="text-foreground">DATABASE_URL</span> and sync to load live ticket data.
      </p>
    </div>
  )
}
