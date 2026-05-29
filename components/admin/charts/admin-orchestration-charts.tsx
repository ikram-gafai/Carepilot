"use client"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_TICK,
} from "@/components/admin/charts/admin-chart-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { adminSurfaces } from "@/lib/admin-surface"
import { ADMIN_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import { cn } from "@/lib/utils"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

const cardClass = cn(adminSurfaces.card, "overflow-hidden border-primary/12 shadow-sm")
const sectionTitle = "text-sm font-medium text-foreground"

const DECISION_COLORS: Record<string, string> = {
  RESOLVE: ADMIN_CHART_BLUE.base,
  ESCALATE_N3: ADMIN_CHART_BLUE.deep,
  TRANSFER: ADMIN_CHART_BLUE.mid,
  SUSPEND: ADMIN_CHART_BLUE.soft,
  REQUEST_INFORMATION: ADMIN_CHART_BLUE.soft,
}

type DecisionRow = { action?: string; label: string; count: number }
type SlaRow = { bucket: string; label: string; count: number }
type TransferRow = { target: string; count: number }

function StackedBar({
  segments,
}: {
  segments: { key: string; label: string; count: number; color: string }[]
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0)
  if (total <= 0) return null

  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-md"
      role="img"
      aria-label={segments.map((s) => `${s.label} ${s.count}`).join(", ")}
    >
      {segments.map((seg, index) => {
        const widthPct = (seg.count / total) * 100
        if (widthPct <= 0) return null
        return (
          <div
            key={seg.key}
            title={`${seg.label}: ${seg.count}`}
            className="transition-opacity hover:opacity-85"
            style={{
              width: `${widthPct}%`,
              backgroundColor: seg.color,
              borderRadius:
                index === 0
                  ? "6px 0 0 6px"
                  : index === segments.length - 1
                    ? "0 6px 6px 0"
                    : "0",
            }}
          />
        )
      })}
    </div>
  )
}

const sectionSubtitle = "mt-0.5 text-[11px] text-muted-foreground"

export function AdminDecisionDistributionChart({ rows }: { rows: DecisionRow[] }) {
  const sorted = [...rows].sort((a, b) => b.count - a.count)
  const total = sorted.reduce((s, r) => s + r.count, 0)
  const max = Math.max(1, ...sorted.map((r) => r.count))

  return (
    <Card className={cardClass}>
      <CardHeader className="px-4 py-3">
        <CardTitle className={sectionTitle}>Décisions suggérées</CardTitle>
        <p className={sectionSubtitle}>{ADMIN_SECTION_SUBTITLES.suggestedDecisions}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        {total > 0 ? (
          <div className="flex flex-col gap-3">
            {sorted.map((row) => {
              const key = row.action ?? row.label
              const color = DECISION_COLORS[key] ?? ADMIN_CHART_BLUE.base
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-[9rem] shrink-0 truncate text-[11px] text-muted-foreground">
                    {row.label}
                  </span>
                  <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${(row.count / max) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {row.count}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Aucune décision orchestrée sur la file active.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminSlaExposureChart({ rows }: { rows: SlaRow[] }) {
  const breached = rows.find((r) => r.bucket === "breached")?.count ?? 0
  const atRisk = rows.find((r) => r.bucket === "at_risk")?.count ?? 0
  const onTrack = rows.find((r) => r.bucket === "on_track")?.count ?? 0
  const total = breached + atRisk + onTrack

  const segments = [
    { key: "breached", label: "Dépassé", count: breached, color: ADMIN_CHART_BLUE.deep },
    { key: "atRisk", label: "À risque", count: atRisk, color: ADMIN_CHART_BLUE.base },
    { key: "onTrack", label: "Conforme", count: onTrack, color: ADMIN_CHART_BLUE.soft },
  ]

  return (
    <Card className={cardClass}>
      <CardHeader className="px-4 py-3">
        <CardTitle className={sectionTitle}>Supervision SLA</CardTitle>
        <p className={sectionSubtitle}>{ADMIN_SECTION_SUBTITLES.slaSupervision}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums">
          {segments.map((s) => (
            <span key={s.key}>
              <span className="text-muted-foreground">{s.label}:</span>{" "}
              <span className="font-semibold text-foreground">{s.count}</span>
            </span>
          ))}
        </div>
        <div className="mt-4">
          {total > 0 ? (
            <StackedBar segments={segments} />
          ) : (
            <p className="text-xs text-muted-foreground">Aucun ticket ouvert en file.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const transferConfig = {
  count: { label: "Transferts", color: ADMIN_CHART_BLUE.base },
} satisfies ChartConfig

export function AdminTransferTargetChart({ rows }: { rows: TransferRow[] }) {
  const data = rows.map((r) => ({ name: r.target, count: r.count }))

  return (
    <Card className={cardClass}>
      <CardHeader className="px-4 py-3">
        <CardTitle className={sectionTitle}>Transferts par périmètre cible</CardTitle>
        <p className={sectionSubtitle}>{ADMIN_SECTION_SUBTITLES.transferChart}</p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        {data.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Aucun transfert suggéré sur la file active.
          </p>
        ) : (
          <ChartContainer config={transferConfig} className="h-[180px] w-full min-w-0">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              barCategoryGap="20%"
            >
              <CartesianGrid horizontal={false} {...ADMIN_CHART_GRID} />
              <XAxis
                type="number"
                tick={ADMIN_CHART_TICK}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={ADMIN_CHART_TICK}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminOrchestrationCharts({
  decisionDistribution,
  slaExposure,
  transferByTarget,
}: {
  decisionDistribution: DecisionRow[]
  slaExposure: SlaRow[]
  transferByTarget: TransferRow[]
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <AdminDecisionDistributionChart rows={decisionDistribution} />
      <AdminSlaExposureChart rows={slaExposure} />
      <AdminTransferTargetChart rows={transferByTarget} />
    </div>
  )
}
