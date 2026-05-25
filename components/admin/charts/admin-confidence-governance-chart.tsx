"use client"

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_SEMANTIC,
  ADMIN_CHART_TICK,
} from "@/components/admin/charts/admin-chart-theme"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { ConfidenceGovernanceBucket } from "@/lib/admin/chart-data"

const CHART_HEIGHT = "aspect-auto h-[200px] w-full min-w-0"

const config = {
  accepted: { label: "Accepted", color: ADMIN_CHART_BLUE.base },
  rejected: { label: "Rejected", color: ADMIN_CHART_SEMANTIC.critical },
  pending: { label: "Pending", color: ADMIN_CHART_BLUE.soft },
} satisfies ChartConfig

export function AdminConfidenceGovernanceChart({
  buckets,
  avgConfidencePct,
}: {
  buckets: ConfidenceGovernanceBucket[]
  avgConfidencePct: number
}) {
  const maxTotal = Math.max(1, ...buckets.map((b) => b.total))
  const avgMarkerY = Math.max(1, Math.round(maxTotal * 0.55))

  return (
    <ChartContainer config={config} className={CHART_HEIGHT}>
      <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barGap={2}>
        <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} />
        <XAxis dataKey="name" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={ADMIN_CHART_TICK} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <ReferenceLine
          y={avgMarkerY}
          stroke={ADMIN_CHART_BLUE.base}
          strokeDasharray="4 4"
          strokeOpacity={0.4}
          label={{
            value: `Avg ${avgConfidencePct}%`,
            position: "insideTopRight",
            fontSize: 10,
            fill: "hsl(var(--muted-foreground))",
          }}
        />
        <Bar dataKey="accepted" stackId="v" fill="var(--color-accepted)" radius={[0, 0, 0, 0]} maxBarSize={36} />
        <Bar dataKey="rejected" stackId="v" fill="var(--color-rejected)" maxBarSize={36} />
        <Bar dataKey="pending" stackId="v" fill="var(--color-pending)" radius={[3, 3, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  )
}
