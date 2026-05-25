"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCard } from "@/components/agent/ui/chart-card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

/** Dashboard chart buckets (English UI) — DB codes map into these six rows. */
const STATUS_CHART_ORDER = [
  "In progress",
  "Open",
  "Resolved",
  "Suspended",
  "Transferred",
  "Waiting store",
] as const

const STATUS_CHART_ORDER_SET = new Set<string>(STATUS_CHART_ORDER)

const SLA_BUCKET_ORDER = ["breached", "at_risk", "on_track", "unknown", "closed"] as const

function chartBucketForDbStatus(code: string): string {
  switch (code) {
    case "OPEN":
      return "Open"
    case "IN_PROGRESS":
    case "ESCALATED_N3":
      return "In progress"
    case "WAITING_STORE":
      return "Waiting store"
    case "RESOLVED":
      return "Resolved"
    case "SUSPENDED":
      return "Suspended"
    case "TRANSFERRED_MON":
    case "TRANSFERRED_MAT":
    case "TRANSFERRED_BO":
    case "TRANSFERRED_RES":
    case "TRANSFERRED_BUR":
    case "TRANSFERRED_INF":
      return "Transferred"
    default:
      return code
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

function buildStatusChartData(rows: { status: string; count: number }[]) {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const key = chartBucketForDbStatus(r.status)
    counts.set(key, (counts.get(key) ?? 0) + r.count)
  }
  const ordered = STATUS_CHART_ORDER.filter((name) => (counts.get(name) ?? 0) > 0).map((name) => ({
    name,
    value: counts.get(name) ?? 0,
  }))
  const extras: { name: string; value: number }[] = []
  for (const [name, value] of counts) {
    if (value > 0 && !STATUS_CHART_ORDER_SET.has(name)) {
      extras.push({ name, value })
    }
  }
  extras.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
  return [...ordered, ...extras]
}

/** Muted enterprise slate-blue (~#6385A9 family): low saturation, reads calm on dashboards. */
const ENTERPRISE_CHART_BLUE = {
  deep: "hsl(210 22% 40%)",
  base: "hsl(210 21% 53%)",
  mid: "hsl(210 18% 60%)",
  soft: "hsl(210 14% 68%)",
} as const

const OUTCOME_FILL_STEPS = [
  ENTERPRISE_CHART_BLUE.deep,
  ENTERPRISE_CHART_BLUE.base,
  ENTERPRISE_CHART_BLUE.mid,
  ENTERPRISE_CHART_BLUE.soft,
] as const

const statusChartConfig = {
  value: {
    label: "Tickets",
    color: ENTERPRISE_CHART_BLUE.base,
  },
} satisfies ChartConfig

const priorityChartConfig = {
  P1: { label: "P1", color: ENTERPRISE_CHART_BLUE.deep },
  P2: { label: "P2", color: ENTERPRISE_CHART_BLUE.base },
  P3: { label: "P3", color: ENTERPRISE_CHART_BLUE.mid },
} satisfies ChartConfig

const slaChartConfig = {
  value: {
    label: "Count",
    color: ENTERPRISE_CHART_BLUE.base,
  },
} satisfies ChartConfig

const outcomesChartConfig = {
  value: {
    label: "Responses",
    color: ENTERPRISE_CHART_BLUE.base,
  },
} satisfies ChartConfig

const chartShell = "aspect-auto h-[208px] w-full min-h-[208px] min-w-0"
const statusChartShell = "aspect-auto h-[236px] w-full min-h-[236px] min-w-0"

export function DashboardCharts({
  byStatus,
  byPriority,
  slaBuckets,
  outcomes,
}: {
  byStatus: { status: string; count: number }[]
  byPriority: { priority: string; count: number }[]
  slaBuckets: { bucket: string; count: number }[]
  outcomes: { outcome: string; count: number }[]
}) {
  const slaGradientId = React.useId().replace(/:/g, "")

  const statusData = buildStatusChartData(byStatus)

  const priOrder = ["P1", "P2", "P3"]
  const priData = [...byPriority]
    .sort((a, b) => priOrder.indexOf(a.priority) - priOrder.indexOf(b.priority))
    .map((r) => ({
      name: r.priority,
      value: r.count,
      fill: `var(--color-${r.priority})`,
    }))

  const slaData = [...slaBuckets]
    .sort(
      (a, b) =>
        SLA_BUCKET_ORDER.indexOf(a.bucket as (typeof SLA_BUCKET_ORDER)[number]) -
        SLA_BUCKET_ORDER.indexOf(b.bucket as (typeof SLA_BUCKET_ORDER)[number]),
    )
    .map((r) => ({
      name: r.bucket.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: r.count,
    }))

  const outRadialData = outcomes.map((r, i) => ({
    name: r.outcome.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: r.count,
    fill: OUTCOME_FILL_STEPS[i % OUTCOME_FILL_STEPS.length]!,
  }))

  const statusMax = Math.max(1, ...statusData.map((d) => d.value))

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <ChartCard title="By status">
        <ChartContainer config={statusChartConfig} className={statusChartShell}>
          <BarChart
            accessibilityLayer
            data={statusData}
            layout="vertical"
            margin={{ top: 6, right: 16, left: 2, bottom: 6 }}
            barCategoryGap={2}
          >
            <CartesianGrid horizontal={false} strokeDasharray="4 4" className="stroke-border/40" />
            <XAxis
              type="number"
              domain={[0, statusMax]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickCount={5}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={148}
              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.25)" }} content={<ChartTooltipContent />} />
            <Bar
              dataKey="value"
              radius={[0, 3, 3, 0]}
              maxBarSize={28}
              fill="var(--color-value)"
              minPointSize={2}
            />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="By priority">
        <ChartContainer config={priorityChartConfig} className={chartShell}>
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
            <Pie
              data={priData}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={74}
              strokeWidth={1}
              paddingAngle={2}
              className="stroke-background"
            >
              {priData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="SLA risk">
        <ChartContainer config={slaChartConfig} className={chartShell}>
          <AreaChart data={slaData} margin={{ top: 10, right: 10, left: 0, bottom: 2 }}>
            <defs>
              <linearGradient id={slaGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/40" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={44}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              width={28}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={1.5}
              fill={`url(#${slaGradientId})`}
              dot={{ r: 2.5, fill: "var(--color-value)", strokeWidth: 0 }}
              activeDot={{ r: 3.5 }}
            />
          </AreaChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="AI feedback">
        <ChartContainer config={outcomesChartConfig} className={chartShell}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            data={outRadialData}
            innerRadius="22%"
            outerRadius="100%"
            startAngle={100}
            endAngle={-260}
          >
            <PolarGrid gridType="circle" className="stroke-border/30" radialLines={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={2}
              background={{ className: "fill-muted/30" }}
              className="stroke-transparent"
            />
            <PolarAngleAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          </RadialBarChart>
        </ChartContainer>
      </ChartCard>
    </div>
  )
}
