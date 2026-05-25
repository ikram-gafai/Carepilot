"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_HEIGHT,
  ADMIN_CHART_TICK,
} from "@/components/admin/charts/admin-chart-theme"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { TransferDistributionRow } from "@/lib/admin/queue-metrics"

const config = {
  value: { label: "Transfers", color: ADMIN_CHART_BLUE.base },
} satisfies ChartConfig

export function AdminTransferDistributionChart({ data }: { data: TransferDistributionRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">
        No perimeter transfers recorded.
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-[180px] w-full min-w-0">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        barCategoryGap="20%"
      >
        <CartesianGrid horizontal={false} {...ADMIN_CHART_GRID} />
        <XAxis type="number" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={ADMIN_CHART_TICK}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
