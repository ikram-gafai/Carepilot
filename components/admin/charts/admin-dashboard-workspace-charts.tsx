"use client"

import * as React from "react"
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_HEIGHT,
  ADMIN_CHART_SEMANTIC,
  ADMIN_CHART_TICK,
  ADMIN_PIE_BLUE_STEPS,
} from "@/components/admin/charts/admin-chart-theme"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type SlaEscalationTrendRow = { label: string; slaRisk: number; escalations: number }
type EscalationTrendRow = { label: string; escalations: number }
type DonutRow = { name: string; value: number }

const slaEscalationTrendConfig = {
  slaRisk: { label: "SLA at risk", color: ADMIN_CHART_BLUE.mid },
  escalations: { label: "Escalate N3", color: ADMIN_CHART_SEMANTIC.critical },
} satisfies ChartConfig

const escalationTrendConfig = {
  escalations: { label: "Escalate N3", color: ADMIN_CHART_SEMANTIC.critical },
} satisfies ChartConfig

export function AdminSlaEscalationTrendChart({ data }: { data: SlaEscalationTrendRow[] }) {
  return (
    <ChartContainer config={slaEscalationTrendConfig} className={ADMIN_CHART_HEIGHT.compact}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} />
        <XAxis dataKey="label" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={ADMIN_CHART_TICK} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="slaRisk"
          stroke="var(--color-slaRisk)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-slaRisk)" }}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="escalations"
          stroke="var(--color-escalations)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-escalations)" }}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

const transferConfig = {
  value: { label: "Tickets", color: ADMIN_CHART_BLUE.base },
} satisfies ChartConfig

export function AdminEscalationTrendChart({ data }: { data: EscalationTrendRow[] }) {
  const gradientId = React.useId().replace(/:/g, "")
  const showLegend = data.some((d) => d.escalations > 0)

  return (
    <ChartContainer config={escalationTrendConfig} className={ADMIN_CHART_HEIGHT.compact}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-escalations)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--color-escalations)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} />
        <XAxis dataKey="label" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={ADMIN_CHART_TICK} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null}
        <Area type="monotone" dataKey="escalations" stroke="none" fill={`url(#${gradientId})`} fillOpacity={1} />
        <Line
          type="monotone"
          dataKey="escalations"
          stroke="var(--color-escalations)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

/** @deprecated Use AdminEscalationTrendChart */
export const AdminOperationsTrendChart = AdminEscalationTrendChart
export const AdminSlaEscalationChart = AdminSlaEscalationTrendChart

export function AdminTransferDonutChart({ data }: { data: DonutRow[] }) {
  const sum = data.reduce((a, b) => a + b.value, 0)
  if (sum <= 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-center text-xs text-muted-foreground">
        No transfer volume recorded.
      </div>
    )
  }

  return (
    <>
      <ChartContainer config={transferConfig} className={ADMIN_CHART_HEIGHT.donut}>
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            strokeWidth={1}
            className="stroke-background"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={ADMIN_PIE_BLUE_STEPS[i % ADMIN_PIE_BLUE_STEPS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-2 space-y-1.5 border-t border-border/60 pt-3">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: ADMIN_PIE_BLUE_STEPS[i % ADMIN_PIE_BLUE_STEPS.length] }}
              />
              {d.name}
            </span>
            <span className="font-mono tabular-nums text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
