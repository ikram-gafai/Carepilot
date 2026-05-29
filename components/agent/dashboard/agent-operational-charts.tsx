"use client"

import { Cell, Pie, PieChart } from "recharts"

import { ChartCard } from "@/components/agent/ui/chart-card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { AGENT_SECTION_SUBTITLES } from "@/lib/operational-ui-copy"
import { cn } from "@/lib/utils"

const BLUE = {
  deep: "hsl(210 22% 40%)",
  base: "hsl(210 21% 53%)",
  mid: "hsl(210 18% 60%)",
  soft: "hsl(210 14% 68%)",
} as const

const CARD_BODY = "flex min-h-[168px] flex-col"

const slaConfig = {
  breached: { label: "Dépassé", color: BLUE.deep },
  atRisk: { label: "À risque", color: BLUE.base },
  onTrack: { label: "Conforme", color: BLUE.soft },
} satisfies ChartConfig

const priorityConfig = {
  P1: { label: "P1", color: BLUE.deep },
  P2: { label: "P2", color: BLUE.base },
  P3: { label: "P3", color: BLUE.mid },
  P4: { label: "P4", color: BLUE.soft },
} satisfies ChartConfig

const DECISION_COLORS: Record<string, string> = {
  RESOLVE: BLUE.base,
  ESCALATE_N3: BLUE.deep,
  TRANSFER: BLUE.mid,
  SUSPEND: BLUE.soft,
}

type SlaRow = { bucket: string; label: string; count: number }
type PriorityRow = { priority: string; count: number }
type DecisionRow = { action?: string; label: string; count: number }

function pct(count: number, total: number): string {
  if (total <= 0) return "0%"
  return `${Math.round((count / total) * 100)}%`
}

function MetricLegend({
  items,
}: {
  items: { label: string; count: number; color: string }[]
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium tabular-nums text-foreground">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

function StackedBar({
  segments,
  height = 12,
  className,
}: {
  segments: { key: string; count: number; color: string; label: string }[]
  height?: number
  className?: string
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0)
  if (total <= 0) return null

  return (
    <div
      className={cn("flex w-full overflow-hidden rounded-md", className)}
      style={{ height }}
      role="img"
      aria-label={segments.map((s) => `${s.label} ${s.count}`).join(", ")}
    >
      {segments.map((seg, index) => {
        const widthPct = (seg.count / total) * 100
        if (widthPct <= 0) return null
        return (
          <div
            key={seg.key}
            title={`${seg.label}: ${seg.count} (${pct(seg.count, total)})`}
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

function SlaExposureChart({ rows }: { rows: SlaRow[] }) {
  const breached = rows.find((r) => r.bucket === "breached")?.count ?? 0
  const atRisk = rows.find((r) => r.bucket === "at_risk")?.count ?? 0
  const onTrack = rows.find((r) => r.bucket === "on_track")?.count ?? 0
  const total = breached + atRisk + onTrack

  const segments = [
    { key: "breached", label: "Dépassé", count: breached, color: BLUE.deep },
    { key: "atRisk", label: "À risque", count: atRisk, color: BLUE.base },
    { key: "onTrack", label: "Conforme", count: onTrack, color: BLUE.soft },
  ]

  return (
    <ChartCard title="Exposition SLA" description={AGENT_SECTION_SUBTITLES.slaExposure}>
      <div className={CARD_BODY}>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums">
          {segments.map((s) => (
            <span key={s.key}>
              <span className="text-muted-foreground">{s.label}:</span>{" "}
              <span className="font-semibold text-foreground">{s.count}</span>
            </span>
          ))}
        </div>
        <div className="mt-auto flex flex-col justify-end pt-4">
          {total > 0 ? (
            <>
              <StackedBar segments={segments} height={14} />
              <MetricLegend items={segments} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun ticket ouvert en file.</p>
          )}
        </div>
      </div>
    </ChartCard>
  )
}

function PriorityRadialChart({ rows }: { rows: PriorityRow[] }) {
  const ordered = ["P1", "P2", "P3", "P4"].map((priority) => ({
    priority,
    count: rows.find((r) => r.priority === priority)?.count ?? 0,
    fill: priorityConfig[priority as keyof typeof priorityConfig].color,
  }))
  const total = ordered.reduce((s, r) => s + r.count, 0)
  const pieData = ordered.filter((r) => r.count > 0)

  return (
    <ChartCard title="Répartition des priorités" description={AGENT_SECTION_SUBTITLES.priorityDistribution}>
      <div className={cn(CARD_BODY, "items-center")}>
        {total > 0 ? (
          <>
            <div className="relative mx-auto size-[132px] shrink-0">
              <ChartContainer
                config={priorityConfig}
                className="!aspect-auto size-full [&_.recharts-responsive-container]:!size-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        nameKey="priority"
                        formatter={(value, name) => (
                          <span className="font-medium tabular-nums">
                            {String(name)}: {Number(value)} ({pct(Number(value), total)})
                          </span>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="priority"
                    innerRadius={48}
                    outerRadius={58}
                    strokeWidth={2}
                    paddingAngle={2}
                    className="stroke-background [&_.recharts-sector]:transition-opacity [&_.recharts-sector:hover]:opacity-80"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.priority} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tabular-nums leading-none">{total}</span>
                <span className="mt-0.5 text-[9px] text-muted-foreground">tickets</span>
              </div>
            </div>
            <MetricLegend
              items={ordered.map((r) => ({
                label: r.priority,
                count: r.count,
                color: r.fill,
              }))}
            />
          </>
        ) : (
          <p className="m-auto text-xs text-muted-foreground">Aucune prédiction de priorité pour l&apos;instant.</p>
        )}
      </div>
    </ChartCard>
  )
}

function DecisionSegmentChart({ rows }: { rows: DecisionRow[] }) {
  const sorted = [...rows].sort((a, b) => b.count - a.count)
  const total = sorted.reduce((s, r) => s + r.count, 0)
  const max = Math.max(1, ...sorted.map((r) => r.count))

  const barData = sorted.map((r) => {
    const key = r.action ?? r.label
    return {
      key,
      label: r.label,
      count: r.count,
      color: DECISION_COLORS[key] ?? BLUE.base,
    }
  })

  return (
    <ChartCard title="Décisions suggérées" description={AGENT_SECTION_SUBTITLES.suggestedDecisions}>
      <div className={CARD_BODY}>
        {total > 0 ? (
          <div className="flex flex-col gap-3">
            {barData.map((row) => (
              <div key={row.key} className="flex items-center gap-3">
                <span className="w-[72px] shrink-0 text-[11px] font-medium text-muted-foreground">
                  {row.label}
                </span>
                <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                    style={{
                      width: `${(row.count / max) * 100}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-auto text-xs text-muted-foreground">Aucune recommandation d&apos;action pour l&apos;instant.</p>
        )}
      </div>
    </ChartCard>
  )
}

export function AgentDashboardCharts({
  slaExposure,
  priorityChart,
  actionDistribution,
}: {
  slaExposure: SlaRow[]
  priorityChart: PriorityRow[]
  actionDistribution: DecisionRow[]
}) {
  return (
    <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-3">
      <SlaExposureChart rows={slaExposure} />
      <PriorityRadialChart rows={priorityChart} />
      <DecisionSegmentChart rows={actionDistribution} />
    </div>
  )
}
