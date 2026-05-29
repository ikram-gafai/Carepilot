"use client"

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"

import {
  ADMIN_CHART_BLUE,
  ADMIN_CHART_GRID,
  ADMIN_CHART_HEIGHT,
  ADMIN_CHART_TICK,
} from "@/components/admin/charts/admin-chart-theme"
import type { DashboardPressureRow } from "@/lib/admin/dashboard"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const config = {
  open: { label: "Ouverts", color: ADMIN_CHART_BLUE.soft },
  slaRisk: { label: "Risque SLA", color: ADMIN_CHART_BLUE.deep },
} satisfies ChartConfig

export function AdminOperationalPressureChart({ data }: { data: DashboardPressureRow[] }) {
  const chartData = data.filter((r) => r.open + r.slaRisk > 0)

  if (chartData.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Aucune charge active par périmètre.
      </div>
    )
  }

  return (
    <ChartContainer config={config} className={ADMIN_CHART_HEIGHT.pressure}>
      <BarChart
        data={chartData}
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
        <Bar dataKey="open" stackId="pressure" fill="var(--color-open)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="slaRisk" stackId="pressure" fill="var(--color-slaRisk)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
