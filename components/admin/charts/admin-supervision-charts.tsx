"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_HEIGHT,
  ADMIN_CHART_SEMANTIC,
  ADMIN_CHART_TICK,
  ADMIN_CHART_TICK_CATEGORY,
  ADMIN_PIE_BLUE_STEPS,
} from "./admin-chart-theme"
import { AdminChartShell } from "./admin-chart-shell"

const blueConfig = {
  value: { label: "Count", color: ADMIN_CHART_BLUE.base },
} satisfies ChartConfig

const workloadConfig = {
  active: { label: "Active", color: ADMIN_CHART_BLUE.base },
  sla: { label: "SLA exposure", color: ADMIN_CHART_BLUE.soft },
} satisfies ChartConfig

export function AdminQueueWorkloadChart({
  rows,
}: {
  rows: { queue: string; active: number; slaRisk: number }[]
}) {
  const data = rows.slice(0, 8).map((r) => ({
    name: r.queue.split(" ")[0],
    active: r.active,
    sla: r.slaRisk,
  }))

  return (
    <AdminChartShell title="Workload comparison">
      <ChartContainer config={workloadConfig} className={ADMIN_CHART_HEIGHT.compact}>
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          barCategoryGap="18%"
          barGap={4}
        >
          <CartesianGrid horizontal={false} {...ADMIN_CHART_GRID} />
          <XAxis type="number" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tick={ADMIN_CHART_TICK_CATEGORY}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.25)" }} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="active" fill="var(--color-active)" radius={[0, 4, 4, 0]} maxBarSize={18} />
          <Bar dataKey="sla" fill="var(--color-sla)" radius={[0, 4, 4, 0]} maxBarSize={14} />
        </BarChart>
      </ChartContainer>
    </AdminChartShell>
  )
}

export function AdminEscalationDonutChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  return (
    <AdminChartShell title="Escalate N3 by category">
      <ChartContainer config={blueConfig} className={ADMIN_CHART_HEIGHT.donut}>
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={44}
            outerRadius={68}
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
    </AdminChartShell>
  )
}

export function AdminConfidenceChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  return (
    <AdminChartShell title="Confidence distribution">
      <ChartContainer config={blueConfig} className="h-[180px] w-full min-w-0">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} />
          <XAxis dataKey="name" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={ADMIN_CHART_TICK} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ChartContainer>
    </AdminChartShell>
  )
}

export function AdminValidationTrendChart({
  data,
}: {
  data: { label: string; accepted: number; rejected: number }[]
}) {
  const gradientId = React.useId().replace(/:/g, "")
  const showRejected = data.some((d) => d.rejected > 0)
  const config = {
    accepted: { label: "Accepted", color: ADMIN_CHART_BLUE.base },
    rejected: { label: "Rejected", color: ADMIN_CHART_SEMANTIC.critical },
  } satisfies ChartConfig

  return (
    <AdminChartShell title="Validation trend">
      <ChartContainer config={config} className={ADMIN_CHART_HEIGHT.compact}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accepted)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-accepted)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} />
          <XAxis dataKey="label" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={ADMIN_CHART_TICK} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showRejected ? <ChartLegend content={<ChartLegendContent />} /> : null}
          <Area
            type="monotone"
            dataKey="accepted"
            stroke="var(--color-accepted)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
          {showRejected ? (
            <Area
              type="monotone"
              dataKey="rejected"
              stroke="var(--color-rejected)"
              strokeWidth={1.5}
              fill="var(--color-rejected)"
              fillOpacity={0.12}
            />
          ) : null}
        </AreaChart>
      </ChartContainer>
    </AdminChartShell>
  )
}

export function AdminAgentWorkloadChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  const chartData = data.length > 0 ? data : [{ name: "—", value: 0 }]
  return (
    <AdminChartShell title="Open workload by agent">
      <ChartContainer config={blueConfig} className="h-[160px] w-full min-w-0">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} />
          <XAxis dataKey="name" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={ADMIN_CHART_TICK} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ChartContainer>
    </AdminChartShell>
  )
}
