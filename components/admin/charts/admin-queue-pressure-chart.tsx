"use client"

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_HEIGHT,
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
import type { QueuePressureRow } from "@/lib/admin/queue-metrics"

const config = {
  open: { label: "Open", color: ADMIN_CHART_BLUE.base },
  slaRisk: { label: "SLA risk", color: ADMIN_CHART_SEMANTIC.warning },
  escalateN3: { label: "Escalate N3", color: ADMIN_CHART_SEMANTIC.critical },
  transfers: { label: "Transfers", color: ADMIN_CHART_BLUE.deep },
} satisfies ChartConfig

export function AdminQueuePressureChart({ data }: { data: QueuePressureRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No queue workload in operational perimeters.
      </div>
    )
  }

  const chartRows = data.map((r) => ({
    name: r.name,
    open: r.open,
    slaRisk: r.slaRisk,
    escalateN3: r.escalateN3,
    transfers: r.transfers,
  }))

  return (
    <ChartContainer config={config} className={ADMIN_CHART_HEIGHT.pressure}>
      <BarChart
        data={chartRows}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        barCategoryGap="18%"
      >
        <CartesianGrid horizontal={false} {...ADMIN_CHART_GRID} />
        <XAxis type="number" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={ADMIN_CHART_TICK}
          width={108}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="open" stackId="q" fill="var(--color-open)" />
        <Bar dataKey="slaRisk" stackId="q" fill="var(--color-slaRisk)" />
        <Bar dataKey="escalateN3" stackId="q" fill="var(--color-escalateN3)" />
        <Bar dataKey="transfers" stackId="q" fill="var(--color-transfers)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
