"use client"

import Link from "next/link"

import { AdminDecisionFeedbackPanel } from "@/components/admin/dashboard/admin-decision-feedback-panel"
import { AdminAiPipelineHealthPanel } from "@/components/admin/dashboard/admin-ai-pipeline-health-panel"
import { AdminOrchestrationCharts } from "@/components/admin/charts/admin-orchestration-charts"
import { AdminSupervisionSignalCard } from "@/components/admin/dashboard/admin-supervision-signal-card"
import { AdminSlaEscalationTrendChart } from "@/components/admin/charts/admin-dashboard-workspace-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminDashboardKpi, AdminKpiStatus } from "@/lib/admin/dashboard"
import type { adminDashboardBundle } from "@/lib/queries/admin"
import { adminSurfaces } from "@/lib/admin-surface"
import { ADMIN_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof adminDashboardBundle>>

const cardClass = cn(adminSurfaces.card, "overflow-hidden border-primary/12 shadow-sm")
const sectionTitle = "text-sm font-medium text-foreground"

const KPI_STATUS_STYLES: Record<AdminKpiStatus, string> = {
  healthy: "border-border/70 bg-card",
  watch: "border-amber-500/30 bg-amber-500/[0.03]",
  critical: "border-destructive/35 bg-destructive/[0.03]",
}

const KPI_STATUS_DOT: Record<AdminKpiStatus, string> = {
  healthy: "bg-primary/70",
  watch: "bg-amber-500",
  critical: "bg-destructive",
}

const ADMIN_KPI_ITEMS: { key: keyof Data["kpiStrip"]; label: string }[] = [
  { key: "openTickets", label: "Actifs" },
  { key: "slaRisk", label: "SLA" },
  { key: "transfers", label: "Transferts" },
  { key: "escalateN3", label: "Escalade" },
  { key: "suspend", label: "Suspendus" },
  { key: "aiStatus", label: "Décisions" },
]

function AdminKpiTile({ label, kpi }: { label: string; kpi: AdminDashboardKpi }) {
  return (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-col justify-between rounded-xl border px-3.5 py-3 shadow-sm",
        KPI_STATUS_STYLES[kpi.status],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {kpi.status !== "healthy" ? (
          <span className={cn("size-1.5 shrink-0 rounded-full", KPI_STATUS_DOT[kpi.status])} aria-hidden />
        ) : null}
      </div>
      <p className="text-3xl leading-none font-semibold tabular-nums tracking-tight text-foreground">
        {kpi.value}
      </p>
    </div>
  )
}

function SectionSubtitle({ children }: { children: string }) {
  return <p className="mt-0.5 text-[11px] text-muted-foreground">{children}</p>
}

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(d)
}

function priorityTone(priority: string) {
  const p = priority.toUpperCase()
  if (p === "P1" || p === "CRITICAL") return "text-destructive"
  if (p === "P2" || p === "HIGH") return "text-primary"
  return "text-muted-foreground"
}

export function AdminDashboardView({ data }: { data: Data }) {
  const {
    kpiStrip,
    decisionFeedback,
    supervision,
    decisionDistribution,
    slaExposure,
    transferByTarget,
    slaEscalationTrend,
    topMagasins,
    recentTickets,
    aiPipelineHealth,
    systemHealth,
  } = data

  const transferByTargetChart = transferByTarget ?? []

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 pb-8">
      <section aria-label="KPI opérationnels" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ADMIN_KPI_ITEMS.map(({ key, label }) => (
          <AdminKpiTile key={key} label={label} kpi={kpiStrip[key]} />
        ))}
      </section>

      <AdminOrchestrationCharts
        decisionDistribution={decisionDistribution}
        slaExposure={slaExposure}
        transferByTarget={transferByTargetChart}
      />

      <section
        aria-label="Supervision"
        className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"
      >
        <Card className={cn(cardClass, "border-primary/15")}>
          <CardHeader className="px-4 py-3">
            <CardTitle className={sectionTitle}>Tendance SLA et escalade N3</CardTitle>
            <SectionSubtitle>{ADMIN_SECTION_SUBTITLES.slaTrend}</SectionSubtitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-2">
            <AdminSlaEscalationTrendChart data={slaEscalationTrend} />
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminDecisionFeedbackPanel
            summary={decisionFeedback}
            tone={supervision.decisionAlignment.tone}
          />
          <AdminSupervisionSignalCard
            title="Transferts par cible"
            subtitle={ADMIN_SECTION_SUBTITLES.transfersByTarget}
            rows={supervision.transfers.rows}
            tone={supervision.transfers.tone}
          />
          <AdminSupervisionSignalCard
            title="Efficacité KM"
            subtitle={ADMIN_SECTION_SUBTITLES.kmEffectiveness}
            rows={supervision.kmEffectiveness.rows}
            tone={supervision.kmEffectiveness.tone}
          />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Magasins et activité récente">
        <Card className={cardClass}>
          <CardHeader className="px-4 py-3">
            <CardTitle className={sectionTitle}>Top magasins</CardTitle>
            <SectionSubtitle>{ADMIN_SECTION_SUBTITLES.topStores}</SectionSubtitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  {["Magasin", "Ville", "Tickets", "Ouverts", "Risque SLA"].map((h) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "h-9 px-3 text-xs font-medium text-muted-foreground",
                        h !== "Magasin" && h !== "Ville" && "text-right",
                        h === "Magasin" && "pl-4",
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
                      Aucune donnée magasin synchronisée pour le moment.
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
          <CardHeader className="px-4 py-3">
            <CardTitle className={sectionTitle}>Tickets récents</CardTitle>
            <SectionSubtitle>{ADMIN_SECTION_SUBTITLES.recentTickets}</SectionSubtitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50 p-0">
            {recentTickets.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">Aucun ticket récent.</p>
            ) : (
              recentTickets.map((t) => (
                <Link
                  key={t.careId}
                  href={`/agent/tickets/${t.id}`}
                  className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.careId}
                      {t.storeName ? ` · ${t.storeName}` : ""}
                      {t.storeCity ? ` · ${t.storeCity}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-xs font-medium", priorityTone(t.priority))}>
                      {t.priority}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">{fmtTime(t.updatedAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Surveillance IA et synchronisation" className="grid gap-3 lg:grid-cols-2">
        <AdminAiPipelineHealthPanel rows={aiPipelineHealth.rows} />
        <AdminSupervisionSignalCard
          title="Synchronisation CARE"
          subtitle={ADMIN_SECTION_SUBTITLES.careSync}
          rows={systemHealth.sync.rows}
          tone={
            systemHealth.sync.tone === "success"
              ? "success"
              : systemHealth.sync.tone === "critical"
                ? "critical"
                : "primary"
          }
        />
      </section>
    </div>
  )
}
