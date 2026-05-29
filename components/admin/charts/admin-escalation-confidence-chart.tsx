"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ADMIN_CHART_BLUE, ADMIN_CHART_GRID, ADMIN_CHART_TICK } from "@/components/admin/charts/admin-chart-theme"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { AdminEscalationConfidenceBar } from "@/lib/admin/escalations"
import { cn } from "@/lib/utils"

const config = {
  value: { label: "Tickets", color: ADMIN_CHART_BLUE.base },
} satisfies ChartConfig

export function AdminEscalationConfidenceChart({
  data,
  compact = false,
}: {
  data: AdminEscalationConfidenceBar[]
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
        Aucune distribution de confiance.
      </div>
    )
  }

  return (
    <ChartContainer
      config={config}
      className={cn("w-full min-w-0", compact ? "h-[112px]" : "h-[180px]")}
    >
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 2 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} strokeOpacity={compact ? 0.35 : 0.5} />
        <XAxis
          dataKey="name"
          tick={{ ...ADMIN_CHART_TICK, fontSize: compact ? 10 : 11 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis tick={ADMIN_CHART_TICK} width={24} axisLine={false} tickLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} maxBarSize={compact ? 24 : 32} />
      </BarChart>
    </ChartContainer>
  )
}
