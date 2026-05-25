"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

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
import type { EscalationTrendPoint } from "@/lib/admin/escalations"

const config = {
  escalations: { label: "Escalate N3", color: ADMIN_CHART_BLUE.deep },
} satisfies ChartConfig

export function AdminEscalationTrendChart({ data }: { data: EscalationTrendPoint[] }) {
  return (
    <ChartContainer config={config} className={ADMIN_CHART_HEIGHT.compact}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} {...ADMIN_CHART_GRID} />
        <XAxis dataKey="label" tick={ADMIN_CHART_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={ADMIN_CHART_TICK} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="escalations"
          stroke="var(--color-escalations)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-escalations)" }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
