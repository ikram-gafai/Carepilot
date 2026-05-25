import Link from "next/link"

import { DashboardCharts } from "@/components/agent/dashboard/dashboard-charts"
import { AgentHeader, AgentPageBody } from "@/components/agent/layout/agent-header"
import { MetricCard } from "@/components/agent/ui/metric-card"
import { SectionHeader } from "@/components/agent/ui/section-header"
import { EmptyState } from "@/components/agent/ui/empty-state"
import { PriorityBadge } from "@/components/agent/ui/priority-badge"
import { SlaIndicator } from "@/components/agent/ui/sla-indicator"
import { CarepilotAutoRefresh } from "@/components/carepilot/carepilot-auto-refresh"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PENDING_AI_TRAINING } from "@/lib/ai-phase"
import type { AgentDashboardBundle } from "@/lib/carepilot-api/agent-dashboard"
import { fetchCarepilotPage } from "@/lib/carepilot-api/fetch-page"
import { parseDate, parseTicketRow } from "@/lib/carepilot-api/serialize"
import { getDbOrNull } from "@/lib/db"
import { DB_UNAVAILABLE_TITLE, dbUnavailableDescription } from "@/lib/ui-messages"
import { agentTicketDisplayTitle } from "@/lib/agent-ticket-display-title"
import { cpAgentSlaLabel } from "@/lib/queries/cp-agent"

export const dynamic = "force-dynamic"

function normalizeDashboardBundle(raw: AgentDashboardBundle): AgentDashboardBundle {
  return {
    ...raw,
    highRisk: raw.highRisk.map((t) => parseTicketRow(t)),
    activity: raw.activity.map((a) => ({
      ...a,
      occurredAt: parseDate(a.occurredAt) ?? new Date(),
    })),
  }
}

export default async function AgentDashboardPage() {
  if (!getDbOrNull()) {
    return (
      <>
        <AgentHeader title="Dashboard" />
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("offline")} />
        </AgentPageBody>
      </>
    )
  }

  const res = await fetchCarepilotPage<AgentDashboardBundle>("/api/agent/dashboard")
  if (!res.ok) {
    return (
      <>
        <AgentHeader title="Dashboard" />
        <AgentPageBody className="p-4">
          <EmptyState title={DB_UNAVAILABLE_TITLE} description={dbUnavailableDescription("unavailable")} />
        </AgentPageBody>
      </>
    )
  }

  const { metrics, byStatus, byPriority, slaBuckets, outcomes, highRisk, activity } =
    normalizeDashboardBundle(res.data)

  const aiLabel = PENDING_AI_TRAINING

  return (
    <>
      <CarepilotAutoRefresh intervalMs={60_000} />
      <AgentHeader title="Dashboard" />
      <AgentPageBody className="mx-auto max-w-[1600px] space-y-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Open" value={String(metrics.openTickets)} />
          <MetricCard title="SLA at risk" value={String(metrics.slaAtRisk)} emphasis />
          <MetricCard title="Action required" value={String(metrics.actionRequired)} emphasis />
          <MetricCard title="AI" value={aiLabel} />
        </div>

        <div className="min-w-0">
          <DashboardCharts
            byStatus={byStatus}
            byPriority={byPriority}
            slaBuckets={slaBuckets}
            outcomes={outcomes}
          />
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Card className="border-border/90 shadow-md ring-1 ring-primary/10 dark:border-zinc-800">
            <CardContent className="p-0">
              <div className="border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                <SectionHeader title="At risk" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent dark:border-zinc-800">
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">CARE</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Title</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Pri</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highRisk.map((t) => {
                    const sla = cpAgentSlaLabel(t.slaDueAt, t.status)
                    return (
                      <TableRow
                        key={t.id}
                        className="border-border/80 transition-colors hover:bg-primary/[0.04] dark:border-zinc-800"
                      >
                        <TableCell className="py-2.5 font-mono text-xs">
                          <Link
                            href={`/agent/tickets/${t.id}`}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {t.careId}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[min(280px,40vw)] truncate py-2.5 text-sm">{agentTicketDisplayTitle(t.title)}</TableCell>
                        <TableCell className="py-2.5">
                          <PriorityBadge priority={t.priority} />
                        </TableCell>
                        <TableCell className="py-2.5">
                          <SlaIndicator label={sla.label} tone={sla.tone} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/90 shadow-md ring-1 ring-primary/10 dark:border-zinc-800">
            <CardContent className="p-0">
              <div className="border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                <SectionHeader title="Recent activity" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent dark:border-zinc-800">
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Time</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">CARE</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Event</TableHead>
                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((a) => (
                    <TableRow key={a.id} className="border-border/80 transition-colors hover:bg-primary/[0.04] dark:border-zinc-800">
                      <TableCell className="whitespace-nowrap py-2 text-xs tabular-nums text-zinc-600">
                        {new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(a.occurredAt)}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-xs">
                        <Link href={`/agent/tickets/${a.ticketId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                          {a.careId}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 text-xs capitalize text-zinc-700">{a.eventType.replaceAll("_", " ")}</TableCell>
                      <TableCell className="max-w-[220px] truncate py-2 text-xs text-zinc-700">{a.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </AgentPageBody>
    </>
  )
}
