"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ADMIN_CHART_BLUE, ADMIN_CHART_GRID, ADMIN_CHART_TICK } from "@/components/admin/charts/admin-chart-theme"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { AdminEscalationPerimeterBar } from "@/lib/admin/escalations"
import { cn } from "@/lib/utils"

const config = {
  value: { label: "N3 prédits", color: ADMIN_CHART_BLUE.base },
} satisfies ChartConfig

export function AdminEscalationPerimeterChart({
  data,
  compact = false,
}: {
  data: AdminEscalationPerimeterBar[]
  compact?: boolean
}) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-muted-foreground",
          compact ? "h-[112px]" : "h-[180px]",
        )}
      >
        Aucune répartition par périmètre.
      </div>
    )
  }

  return (
    <ChartContainer
      config={config}
      className={cn("w-full min-w-0", compact ? "h-[112px]" : "h-[180px]")}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 2, right: 8, left: 0, bottom: 2 }}
        barCategoryGap="28%"
      >
        <CartesianGrid horizontal={false} {...ADMIN_CHART_GRID} strokeOpacity={compact ? 0.35 : 0.5} />
        <XAxis type="number" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={compact ? 72 : 88}
          tick={{ ...ADMIN_CHART_TICK, fontSize: compact ? 10 : 11 }}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 2, 2, 0]} maxBarSize={compact ? 12 : 18} />
      </BarChart>
    </ChartContainer>
  )
}
