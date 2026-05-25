"use client"

import { AdminSupervisionSignalCard } from "@/components/admin/dashboard/admin-supervision-signal-card"
import { AdminOperationalPressureChart } from "@/components/admin/charts/admin-operational-pressure-chart"
import { AdminSlaEscalationTrendChart } from "@/components/admin/charts/admin-dashboard-workspace-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminDashboardKpi, AdminKpiStatus } from "@/lib/admin/dashboard"
import type { adminDashboardBundle } from "@/lib/queries/admin"
import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof adminDashboardBundle>>

const cardClass = cn(adminSurfaces.card, "overflow-hidden border-primary/12 shadow-sm")
const sectionTitle = "text-sm font-semibold tracking-tight text-foreground"
const sectionSub = "text-[11px] text-muted-foreground"

const KPI_STATUS_ACCENT: Record<AdminKpiStatus, string> = {
  healthy: "border-l-primary/80 bg-gradient-to-br from-primary/[0.06] to-card",
  watch: "border-l-amber-500/80 bg-gradient-to-br from-amber-500/[0.06] to-card",
  critical: "border-l-destructive/80 bg-gradient-to-br from-destructive/[0.05] to-card",
}

function ExecutiveKpiCard({ title, kpi }: { title: string; kpi: AdminDashboardKpi }) {
  return (
    <Card className={cn(cardClass, "border-l-[3px]", KPI_STATUS_ACCENT[kpi.status])}>
      <CardHeader className="space-y-0 px-4 pt-3.5 pb-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      </CardHeader>
      <CardContent className="px-4 pb-3.5 pt-0">
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{kpi.value}</p>
        {kpi.subtitle ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{kpi.subtitle}</p> : null}
      </CardContent>
    </Card>
  )
}

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(d)
}

function priorityTone(priority: string) {
  const p = priority.toUpperCase()
  if (p === "P1" || p === "CRITICAL") return "text-destructive"
  if (p === "P2" || p === "HIGH") return "text-primary"
  return "text-muted-foreground"
}

export function AdminDashboardView({ data }: { data: Data }) {
  const { kpiStrip, supervision, slaEscalationTrend, operationalPressure, topMagasins, recentTickets } =
    data

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 pb-8">
      <section aria-label="Executive KPIs" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ExecutiveKpiCard title="Open Tickets" kpi={kpiStrip.openTickets} />
        <ExecutiveKpiCard title="SLA Risk" kpi={kpiStrip.slaRisk} />
        <ExecutiveKpiCard title="Transfers" kpi={kpiStrip.transfers} />
        <ExecutiveKpiCard title="Escalate N3" kpi={kpiStrip.escalateN3} />
        <ExecutiveKpiCard title="Sync Health" kpi={kpiStrip.syncHealth} />
        <ExecutiveKpiCard title="AI Status" kpi={kpiStrip.aiStatus} />
      </section>

      <section
        aria-label="Supervision"
        className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"
      >
        <Card className={cn(cardClass, "border-primary/15")}>
          <CardHeader className="border-b border-primary/10 px-4 py-3">
            <CardTitle className={sectionTitle}>SLA &amp; Escalate N3</CardTitle>
            <p className={sectionSub}>7-day supervision trend</p>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-2">
            <AdminSlaEscalationTrendChart data={slaEscalationTrend} />
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminSupervisionSignalCard
            title="Escalate N3"
            rows={supervision.escalation.rows}
            tone={supervision.escalation.tone}
          />
          <AdminSupervisionSignalCard
            title="Transfers"
            rows={supervision.transfers.rows}
            tone={supervision.transfers.tone}
          />
          <AdminSupervisionSignalCard
            title="AI Reliability"
            rows={supervision.aiReliability.rows}
            tone={supervision.aiReliability.tone}
          />
          <AdminSupervisionSignalCard
            title="Sync Health"
            rows={supervision.syncHealth.rows}
            tone={supervision.syncHealth.tone}
          />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Stores and recent activity">
        <Card className={cardClass}>
          <CardHeader className="border-b border-primary/10 px-4 py-3">
            <CardTitle className={sectionTitle}>Top Magasins</CardTitle>
            <p className={sectionSub}>Synchronized ticket volume by store</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  {["Store", "City", "Tickets", "Open", "SLA risk"].map((h) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                        h !== "Store" && h !== "City" && "text-right",
                        h === "Store" && "pl-4",
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMagasins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      No synchronized store data yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  topMagasins.map((s) => (
                    <TableRow key={s.storeCode} className="border-border/50">
                      <TableCell className="max-w-[14rem] truncate px-4 py-2.5 text-xs font-medium text-foreground">
                        {s.storeName}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">{s.city}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                        {s.ticketCount}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-primary">
                        {s.openCount}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {s.slaRisk}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="border-b border-primary/10 px-4 py-3">
            <CardTitle className={sectionTitle}>Recent Tickets</CardTitle>
            <p className={sectionSub}>Enterprise operations queue</p>
          </CardHeader>
          <CardContent className="divide-y divide-border/50 p-0">
            {recentTickets.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">No recent tickets.</p>
            ) : (
              recentTickets.map((t) => (
                <div
                  key={t.careId}
                  className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.storeName}
                      {t.storeCity ? ` · ${t.storeCity}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-[10px] font-semibold uppercase", priorityTone(t.priority))}>
                      {t.priority}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">{fmtTime(t.updatedAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Operational pressure">
        <Card className={cardClass}>
          <CardHeader className="border-b border-primary/10 px-4 py-3">
            <CardTitle className={sectionTitle}>Operational Pressure</CardTitle>
            <p className={sectionSub}>Open workload and SLA risk by perimeter</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-3">
            <AdminOperationalPressureChart data={operationalPressure} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
